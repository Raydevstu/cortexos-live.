import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { CortexEventBus, buildCortexEvent } from "../../packages/event-sdk/src/index.ts";
import {
  DOCK_AGENTS_SEED,
  dedupActivityFeed,
  mergeAgentTelemetry,
} from "../agent-os-logic.ts";
import {
  CortexRuntimeEngine,
  computeRuntimeRisks,
  evaluatePhaseTransitionPure,
} from "./cortex-runtime.ts";

// Isolate PGlite data directory for deterministic clean test run
process.env.CORTEX_PGDATA_DIR = path.join(os.tmpdir(), `cortex-rt-test-${Date.now()}`);

test("CortexEventBus deduplicates idempotency keys and dispatches wildcard subscribers", async () => {
  const bus = new CortexEventBus(50);
  const seen: string[] = [];
  const off = bus.subscribe("*", (evt) => {
    seen.push(evt.id);
  });

  const evt1 = buildCortexEvent({
    type: "work_request.assigned",
    source: "test-suite",
    idempotencyKey: "dup-key-1",
    payload: { workRequestId: "wr-1" },
  });
  const evt2 = buildCortexEvent({
    type: "work_request.assigned",
    source: "test-suite",
    idempotencyKey: "dup-key-1",
    payload: { workRequestId: "wr-1" },
  });

  await bus.publish(evt1);
  await bus.publish(evt2);
  off();

  assert.equal(seen.length, 1);
  assert.equal(bus.recentEvents(10).length, 1);
});

test("evaluatePhaseTransitionPure blocks forward transitions when pending approvals or blocked tasks exist", () => {
  const blockedByApprovals = evaluatePhaseTransitionPure({
    currentPhase: "design",
    targetPhase: "architecture",
    pendingApprovalCount: 2,
    blockedWorkRequests: 0,
  });
  assert.equal(blockedByApprovals.allowed, false);
  assert.ok(blockedByApprovals.reasons[0].includes("pending approval"));

  const allowedClean = evaluatePhaseTransitionPure({
    currentPhase: "design",
    targetPhase: "architecture",
    pendingApprovalCount: 0,
    blockedWorkRequests: 0,
  });
  assert.equal(allowedClean.allowed, true);
  assert.equal(allowedClean.resolvedPhase, "architecture");
});

test("computeRuntimeRisks surfaces degraded agent health and pending approval bottlenecks", () => {
  const degradedAgents = DOCK_AGENTS_SEED.map((a) =>
    a.id === "design" ? { ...a, health: 74, status: "blocked" as const } : a
  );
  const risks = computeRuntimeRisks({
    agents: degradedAgents,
    workRequests: [],
    pendingApprovals: [
      {
        id: "appr-1",
        projectId: "proj-solar-crm",
        workflowId: "wf-1",
        title: "Design Wireframe Gate",
        requestedBy: "Design",
        reason: "Needs approval",
        status: "pending",
        createdAt: new Date().toISOString(),
      },
    ],
  });
  assert.ok(risks.some((r) => r.source === "design"));
  assert.ok(risks.some((r) => r.source === "approval-engine"));
});

test("mergeAgentTelemetry and dedupActivityFeed preserve 6 required live telemetry fields", () => {
  const updated = mergeAgentTelemetry(DOCK_AGENTS_SEED, {
    id: "architecture",
    status: "executing",
    currentTask: "Design WebSocket gateway",
    currentArtifact: "WS Architecture Spec v2",
    currentWorkflow: "ArchitectureWorkflow · wf-arch-99",
    provider: "deepseek",
    model: "deepseek-r1",
    runtimeState: "executing · deepseek/deepseek-r1",
    lastDecision: "Approved single-port WebSocket upgrade routing",
  });
  const arch = updated.find((a) => a.id === "architecture")!;
  assert.equal(arch.currentTask, "Design WebSocket gateway");
  assert.equal(arch.currentArtifact, "WS Architecture Spec v2");
  assert.equal(arch.currentWorkflow, "ArchitectureWorkflow · wf-arch-99");
  assert.equal(arch.provider, "deepseek");
  assert.equal(arch.runtimeState, "executing · deepseek/deepseek-r1");
  assert.equal(arch.lastDecision, "Approved single-port WebSocket upgrade routing");

  const deduped = dedupActivityFeed(
    [
      {
        id: "ev-1",
        agentId: "jarvis",
        agentName: "Jarvis",
        status: "completed",
        task: "First",
        summary: "Summary",
        provider: "anthropic",
        timestamp: "10:00",
      },
    ],
    {
      id: "ev-1",
      agentId: "jarvis",
      agentName: "Jarvis",
      status: "completed",
      task: "Updated",
      summary: "Updated Summary",
      provider: "anthropic",
      timestamp: "10:01",
    }
  );
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].task, "Updated");
});

test("CortexRuntimeEngine dispatches WorkRequest, convenes Council, resolves Approval, and triggers Failover", async () => {
  const runtime = new CortexRuntimeEngine();
  const capturedEvents: string[] = [];
  runtime.eventBus.subscribe("*", (evt) => {
    capturedEvents.push(String(evt.type));
  });

  const dispatchRes = await runtime.dispatchWorkRequest({
    projectId: "proj-solar-crm",
    studioId: "design",
    objective: "Verify real-time design token streaming",
    preferredProvider: "anthropic",
    preferredModel: "claude-sonnet-4",
  });
  assert.equal(dispatchRes.workRequest.status, "completed");
  assert.equal(dispatchRes.workflow.workflowType, "DesignWorkflow");
  assert.ok(capturedEvents.includes("work_request.assigned"));
  assert.ok(capturedEvents.includes("artifact.created"));

  const councilRes = await runtime.conveneCouncil({
    projectId: "proj-solar-crm",
    objective: "Verify WebSocket presence readiness",
  });
  assert.ok(councilRes.report.opinions.length >= 7);
  assert.ok(councilRes.snapshot.councilReport !== null);

  const failoverRes = await runtime.failoverProvider({
    projectId: "proj-solar-crm",
    failedProvider: "anthropic",
    targetProvider: "gemini",
  });
  assert.equal(failoverRes.activeProvider, "gemini");
  assert.ok(capturedEvents.includes("provider.failover"));
});
