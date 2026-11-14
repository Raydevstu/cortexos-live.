import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceSimulatedAgentTick,
  buildTerminalBrainSyncCompound,
  CANONICAL_DOCK_ORDER,
  closeWorkspaceState,
  deriveAgentTeammateTelemetry,
  deriveWorkspaceIntelligence,
  DOCK_AGENTS_SEED,
  INITIAL_ARTIFACT_FEED,
  INITIAL_COUNCIL_CONFLICTS,
  INITIAL_COUNCIL_REPORT_SEED,
  INITIAL_DECISION_FEED,
  INITIAL_KNOWLEDGE_FEED,
  INITIAL_LIBRARIAN_EVOLUTION,
  INITIAL_LIBRARIAN_GRAPH_UPDATES,
  INITIAL_LIBRARIAN_RELATIONSHIPS,
  INITIAL_TOOL_ACTIVITY_FEED,
  INITIAL_WORKFLOW_FEED,
  nextLifecycleStatus,
  parseTerminalCommand,
  setWorkspaceModeState,
  summonWorkspaceState,
  type WorkspaceWindowState,
} from "./agent-os-logic.ts";

test("DOCK_AGENTS_SEED exposes all 9 canonical agents with required live telemetry fields", () => {
  assert.deepEqual(
    DOCK_AGENTS_SEED.map((a) => a.id),
    [...CANONICAL_DOCK_ORDER]
  );
  for (const agent of DOCK_AGENTS_SEED) {
    assert.ok(agent.status.length > 0);
    assert.ok(agent.currentTask.length > 0);
    assert.ok(agent.health >= 90 && agent.health <= 100);
    assert.ok(agent.provider.length > 0);
    assert.ok(agent.lastArtifact.length > 0);
  }
});

test("WorkspaceManager reducers support summon (slide in), pin, dock, focus, and close (slide out)", () => {
  let windows: WorkspaceWindowState[] = [];

  // Summon Design Studio (slide in drawer)
  windows = summonWorkspaceState(windows, 10, {
    id: "ws-design",
    agentId: "design",
    kind: "studio",
    title: "Design Studio",
    subtitle: "Experience Architect",
  });
  assert.equal(windows.length, 1);
  assert.equal(windows[0].mode, "drawer");
  assert.equal(windows[0].pinned, false);

  // Pin Design Studio
  windows = setWorkspaceModeState(windows, "ws-design", "pinned", 11);
  assert.equal(windows[0].mode, "pinned");
  assert.equal(windows[0].pinned, true);

  // Dock (minimize) Design Studio
  windows = setWorkspaceModeState(windows, "ws-design", "docked", 12);
  assert.equal(windows[0].mode, "docked");
  assert.equal(windows[0].pinned, true);

  // Re-summoning docked workspace restores it cleanly
  windows = summonWorkspaceState(windows, 13, {
    id: "ws-design",
    agentId: "design",
    kind: "studio",
    title: "Design Studio",
    subtitle: "Experience Architect",
  });
  assert.equal(windows[0].mode, "pinned");
  assert.equal(windows[0].zIndex, 13);

  // Focus expands and demotes any prior focused window
  windows = summonWorkspaceState(windows, 14, {
    id: "ws-jarvis",
    agentId: "jarvis",
    kind: "jarvis",
    title: "Jarvis Supervisor",
    subtitle: "Supervisor",
  });
  windows = setWorkspaceModeState(windows, "ws-jarvis", "focused", 15);
  windows = setWorkspaceModeState(windows, "ws-design", "focused", 16);
  const designWin = windows.find((w) => w.id === "ws-design");
  const jarvisWin = windows.find((w) => w.id === "ws-jarvis");
  assert.equal(designWin?.mode, "focused");
  assert.equal(jarvisWin?.mode, "drawer");

  // Slide out (close)
  windows = closeWorkspaceState(windows, "ws-design");
  assert.equal(windows.length, 1);
  assert.equal(windows[0].id, "ws-jarvis");
});

test("parseTerminalCommand routes @agent mentions, slash mode commands, and natural language", () => {
  const designCmd = parseTerminalCommand("@design Create responsive wireframe tokens");
  assert.equal(designCmd.kind, "agent");
  assert.equal(designCmd.targetAgentId, "design");
  assert.equal(designCmd.objective, "Create responsive wireframe tokens");

  const archAlias = parseTerminalCommand("@arch Generate OpenAPI schema");
  assert.equal(archAlias.targetAgentId, "architecture");

  const brainCmd = parseTerminalCommand("/brain");
  assert.equal(brainCmd.kind, "mode");
  assert.equal(brainCmd.targetMode, "brain");

  const warRoomCmd = parseTerminalCommand("/war-room");
  assert.equal(warRoomCmd.kind, "mode");
  assert.equal(warRoomCmd.targetMode, "warroom");

  const nlCmd = parseTerminalCommand("Audit active artifacts for contradictions", "librarian");
  assert.equal(nlCmd.kind, "agent");
  assert.equal(nlCmd.targetAgentId, "librarian");
});

test("advanceSimulatedAgentTick cycles agents across Planning -> Executing -> Reviewing -> Completed", () => {
  assert.equal(nextLifecycleStatus("planning"), "executing");
  assert.equal(nextLifecycleStatus("executing"), "reviewing");
  assert.equal(nextLifecycleStatus("reviewing"), "completed");
  assert.equal(nextLifecycleStatus("completed"), "planning");

  let currentAgents = [...DOCK_AGENTS_SEED];
  const seenStatuses = new Set<string>();
  for (let tick = 0; tick < 27; tick++) {
    const res = advanceSimulatedAgentTick(currentAgents, tick);
    currentAgents = res.nextAgents;
    seenStatuses.add(res.emittedEvent.status);
  }
  assert.deepEqual(
    seenStatuses,
    new Set(["planning", "executing", "reviewing", "completed"])
  );
});

test("deriveAgentTeammateTelemetry exposes workflow, task, artifact, health, provider, recent decisions, and tool usage", () => {
  for (const agent of DOCK_AGENTS_SEED) {
    const telemetry = deriveAgentTeammateTelemetry(
      agent,
      INITIAL_TOOL_ACTIVITY_FEED,
      INITIAL_DECISION_FEED
    );
    assert.ok(telemetry.agent.currentWorkflow.length > 0);
    assert.ok(telemetry.agent.currentTask.length > 0);
    assert.ok(telemetry.agent.currentArtifact.length > 0);
    assert.ok(telemetry.agent.health >= 90);
    assert.ok(telemetry.agent.provider.length > 0);
    assert.ok(telemetry.recentDecisions.length >= 1);
    assert.ok(telemetry.toolUsageSummary.length > 0);
  }
});

test("deriveWorkspaceIntelligence returns synchronized work, workflow, artifacts, knowledge, tools, and decisions for summoned agents", () => {
  const designIntel = deriveWorkspaceIntelligence("design", {
    agents: DOCK_AGENTS_SEED,
    workRequests: [],
    workflows: INITIAL_WORKFLOW_FEED,
    artifactFeed: INITIAL_ARTIFACT_FEED,
    knowledgeFeed: INITIAL_KNOWLEDGE_FEED,
    toolActivityFeed: INITIAL_TOOL_ACTIVITY_FEED,
    decisionFeed: INITIAL_DECISION_FEED,
  });

  assert.equal(designIntel.agentId, "design");
  assert.ok(designIntel.currentWork.length > 0);
  assert.equal(designIntel.currentWorkflow, "DesignWorkflow");
  assert.ok(designIntel.generatedArtifacts.length >= 2);
  assert.ok(designIntel.relevantKnowledge.length >= 1);
  assert.ok(designIntel.toolActivity.length >= 1);
  assert.ok(designIntel.recentDecisions.length >= 1);
});

test("buildTerminalBrainSyncCompound generates Execution Record, Artifact, Knowledge Candidate, Decision, and Audit Entry", () => {
  const archAgent = DOCK_AGENTS_SEED.find((a) => a.id === "architecture")!;
  const bundle = buildTerminalBrainSyncCompound({
    command: "@architecture Validate MainBrain Graph OpenAPI contract",
    agent: archAgent,
    projectId: "proj-solar-crm",
    toolName: "docs.openapi_read",
    durationMs: 15,
  });

  assert.ok(bundle.compound.executionRecordId.startsWith("texec-term-"));
  assert.ok(bundle.compound.artifactId.startsWith("art-term-"));
  assert.ok(bundle.compound.knowledgeCandidateId.startsWith("kf-term-"));
  assert.ok(bundle.compound.decisionId.startsWith("dec-term-"));
  assert.ok(bundle.compound.auditEntryId.startsWith("aud-"));
  assert.equal(bundle.toolItem.toolName, "docs.openapi_read");
  assert.equal(bundle.decisionItem.impact, "architecture");
  assert.equal(bundle.relationshipItem.relationType, "derives_from");
  assert.equal(bundle.graphUpdateItem.action, "node_indexed");
});

test("MainBrainV2 Librarian and Agent Council seeds are populated and valid", () => {
  assert.ok(INITIAL_LIBRARIAN_RELATIONSHIPS.length >= 4);
  assert.ok(INITIAL_LIBRARIAN_GRAPH_UPDATES.length >= 3);
  assert.ok(INITIAL_LIBRARIAN_EVOLUTION.length >= 3);
  assert.ok(INITIAL_COUNCIL_CONFLICTS.length >= 2);
  assert.ok(INITIAL_COUNCIL_REPORT_SEED.opinions.length >= 4);
  assert.ok(INITIAL_COUNCIL_REPORT_SEED.decisions.length >= 3);
  assert.ok(INITIAL_COUNCIL_REPORT_SEED.risks.length >= 2);
});

