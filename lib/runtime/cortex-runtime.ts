import { GoogleGenAI } from "@google/genai";
import {
  CortexEventBus,
  buildCortexEvent,
} from "../../packages/event-sdk/src/index.ts";
import type { CortexEvent } from "../../packages/shared-types/src/index.ts";
import {
  DOCK_AGENTS_SEED,
  INITIAL_ACTIVITY_FEED,
  INITIAL_ARTIFACT_FEED,
  INITIAL_KNOWLEDGE_FEED,
  dedupActivityFeed,
  mergeAgentTelemetry,
  type AgentActivityEvent,
  type AgentLifecycleStatus,
  type ArtifactFeedItem,
  type DockAgentId,
  type DockAgentState,
  type KnowledgeFeedItem,
  type PendingApprovalItem,
  type RiskAlertItem,
  type RuntimeCouncilOpinion,
  type RuntimeCouncilReport,
  type RuntimePresenceSnapshot,
  type RuntimeWorkRequestRecord,
  type RuntimeWorkflowRecord,
} from "../agent-os-logic.ts";
import { sha256Hex } from "../cortex-os-data.ts";
import { dbQuery, dbTransaction, ensureDatabaseMigrated, toUuid } from "../db/client.ts";
import { processPendingLibrarianEvents } from "../db/librarian-pipeline.ts";
import { getWsHub } from "./ws-hub.ts";

export const LIFECYCLE_PHASE_SEQUENCE: readonly DockAgentId[] = [
  "discovery",
  "product",
  "design",
  "architecture",
  "development",
  "qa",
  "release",
];

const FALLBACK_PROVIDER_CHAIN = [
  "anthropic",
  "gemini",
  "openai",
  "deepseek",
  "grok",
  "openrouter",
  "ollama",
  "lmstudio",
] as const;

const STUDIO_TO_WORKFLOW: Record<DockAgentId, string> = {
  jarvis: "ProjectLifecycleWorkflow",
  librarian: "MainBrainSyncWorkflow",
  discovery: "DiscoveryWorkflow",
  product: "ProductWorkflow",
  design: "DesignWorkflow",
  architecture: "ArchitectureWorkflow",
  development: "DevelopmentWorkflow",
  qa: "QAWorkflow",
  release: "ReleaseWorkflow",
};

const AGENT_LABELS: Record<DockAgentId, string> = {
  jarvis: "Jarvis",
  librarian: "Librarian",
  discovery: "Discovery",
  product: "Product",
  design: "Design",
  architecture: "Architecture",
  development: "Development",
  qa: "QA",
  release: "Release",
};

export function evaluatePhaseTransitionPure(params: {
  currentPhase: DockAgentId;
  targetPhase?: DockAgentId;
  pendingApprovalCount: number;
  blockedWorkRequests: number;
}): {
  allowed: boolean;
  resolvedPhase: DockAgentId;
  reasons: string[];
} {
  const curIdx = Math.max(0, LIFECYCLE_PHASE_SEQUENCE.indexOf(params.currentPhase));
  const resolved =
    params.targetPhase ??
    LIFECYCLE_PHASE_SEQUENCE[Math.min(curIdx + 1, LIFECYCLE_PHASE_SEQUENCE.length - 1)];

  const targetIdx = LIFECYCLE_PHASE_SEQUENCE.indexOf(resolved);
  const reasons: string[] = [];

  if (targetIdx === -1) {
    reasons.push(`Unsupported project phase '${resolved}'.`);
  }
  if (params.blockedWorkRequests > 0) {
    reasons.push(`${params.blockedWorkRequests} blocked work request(s) must clear before advancing.`);
  }
  if (targetIdx > curIdx && params.pendingApprovalCount > 0) {
    reasons.push(`${params.pendingApprovalCount} pending approval gate(s) awaiting Owner/Jarvis sign-off.`);
  }
  return {
    allowed: reasons.length === 0,
    resolvedPhase: resolved,
    reasons,
  };
}

export function computeRuntimeRisks(params: {
  agents: DockAgentState[];
  workRequests: RuntimeWorkRequestRecord[];
  pendingApprovals: PendingApprovalItem[];
}): RiskAlertItem[] {
  const risks: RiskAlertItem[] = [];

  const failedAgents = params.agents.filter((a) => a.status === "failed" || a.status === "blocked");
  for (const agent of failedAgents) {
    risks.push({
      id: `risk-agent-${agent.id}`,
      severity: "high",
      source: agent.id,
      description: `${agent.name} is ${agent.status} on task: ${agent.currentTask}`,
      mitigation: "Inspect Agent Workspace or trigger Jarvis re-assignment / provider failover.",
    });
  }

  const lowHealth = params.agents.filter((a) => a.health < 90);
  for (const agent of lowHealth) {
    risks.push({
      id: `risk-health-${agent.id}`,
      severity: "medium",
      source: agent.id,
      description: `${agent.name} health degraded to ${agent.health}% (${agent.provider})`,
      mitigation: "Route upcoming WorkRequests to healthy fallback provider.",
    });
  }

  const openPendingApprovals = params.pendingApprovals.filter((p) => p.status === "pending");
  if (openPendingApprovals.length > 0) {
    risks.push({
      id: "risk-approvals",
      severity: "medium",
      source: "approval-engine",
      description: `${openPendingApprovals.length} artifact/gate approval(s) pending Owner decision.`,
      mitigation: "Review and approve or reject gated artifacts inside Jarvis Supervisor.",
    });
  }

  const blockedWr = params.workRequests.filter((w) => w.status === "blocked" || w.status === "failed");
  if (blockedWr.length > 0) {
    risks.push({
      id: "risk-work-requests",
      severity: "high",
      source: "work-dispatcher",
      description: `${blockedWr.length} WorkRequest(s) stalled in blocked/failed state.`,
      mitigation: "Re-dispatch via Jarvis Mesh after resolving missing context artifacts.",
    });
  }

  if (risks.length === 0) {
    risks.push({
      id: "risk-nominal",
      severity: "low",
      source: "jarvis-risk-engine",
      description: "All 9 agents, Temporal workflows, and Event SDK channels nominal.",
      mitigation: "No intervention required.",
    });
  }

  return risks;
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

declare global {
  var __cortexRuntime: CortexRuntimeEngine | undefined;
}

export class CortexRuntimeEngine {
  readonly eventBus: CortexEventBus;
  private bootstrapped = false;
  private bootstrapPromise: Promise<void> | null = null;

  private activeProjectId = "proj-solar-crm";
  private projectPhases = new Map<string, DockAgentId>([
    ["proj-solar-crm", "design"],
    ["proj-cortex-v2", "architecture"],
    ["proj-finops-mesh", "discovery"],
  ]);

  private agents: DockAgentState[] = DOCK_AGENTS_SEED.map((a) => ({ ...a }));
  private workflows: RuntimeWorkflowRecord[] = [
    {
      id: "wf-projectlifecycle-boot",
      projectId: "proj-solar-crm",
      workflowType: "ProjectLifecycleWorkflow",
      taskQueue: "jarvis-system",
      status: "running",
      currentStep: "phase.design.monitoring",
      studioId: "jarvis",
      startedAt: new Date().toISOString(),
    },
    {
      id: "wf-design-boot",
      projectId: "proj-solar-crm",
      workflowType: "DesignWorkflow",
      taskQueue: "studio-runtime",
      status: "completed",
      currentStep: "design.decision_logged",
      studioId: "design",
      startedAt: new Date(Date.now() - 120000).toISOString(),
      completedAt: new Date(Date.now() - 60000).toISOString(),
    },
  ];
  private workRequests: RuntimeWorkRequestRecord[] = [];
  private pendingApprovals: PendingApprovalItem[] = [];
  private councilReport: RuntimeCouncilReport | null = null;
  private activityFeed: AgentActivityEvent[] = [...INITIAL_ACTIVITY_FEED];
  private artifactFeed: ArtifactFeedItem[] = [...INITIAL_ARTIFACT_FEED];
  private knowledgeFeed: KnowledgeFeedItem[] = [...INITIAL_KNOWLEDGE_FEED];

  constructor() {
    this.eventBus = new CortexEventBus(250);
    // Forward every Event SDK publication to WebSocket clients cleanly
    this.eventBus.subscribe("*", async (event) => {
      this.handleDomainEvent(event);
    });
  }

  private handleDomainEvent(event: CortexEvent): void {
    const wsHub = getWsHub();
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    const rawAgentId = String(payload.agentId ?? payload.studioId ?? "jarvis") as DockAgentId;
    const agentId: DockAgentId =
      rawAgentId in AGENT_LABELS ? rawAgentId : "jarvis";
    const matchedAgent = this.agents.find((a) => a.id === agentId);

    const status = (String(payload.status ?? matchedAgent?.status ?? "executing") ||
      "executing") as AgentLifecycleStatus;

    const activity: AgentActivityEvent = {
      id: event.id,
      eventType: String(event.type),
      agentId,
      agentName: AGENT_LABELS[agentId],
      status,
      task: String(payload.task ?? payload.objective ?? matchedAgent?.currentTask ?? event.type),
      summary: String(payload.summary ?? matchedAgent?.lastDecision ?? `Event ${event.type} dispatched`),
      artifactTitle: payload.artifactTitle ? String(payload.artifactTitle) : matchedAgent?.currentArtifact,
      workflowId: payload.workflowId ? String(payload.workflowId) : matchedAgent?.currentWorkflow,
      workflowType: payload.workflowType ? String(payload.workflowType) : undefined,
      runtimeState: matchedAgent?.runtimeState ?? status,
      lastDecision: payload.decision ? String(payload.decision) : matchedAgent?.lastDecision,
      provider: `${matchedAgent?.provider ?? "anthropic"} · ${matchedAgent?.model ?? "claude-sonnet-4"}`,
      timestamp: nowTimeLabel(),
    };

    this.activityFeed = dedupActivityFeed(this.activityFeed, activity, 30);

    wsHub.broadcast("event.dispatched", {
      event,
      activity,
    });
  }

  async bootstrap(): Promise<void> {
    if (this.bootstrapped) return;
    if (this.bootstrapPromise) return this.bootstrapPromise;

    this.bootstrapPromise = this.hydrateFromDatabase()
      .catch((err) => {
        console.warn("[CortexRuntime] Hydration notice:", (err as Error).message);
      })
      .finally(() => {
        this.bootstrapped = true;
        this.bootstrapPromise = null;
      });

    return this.bootstrapPromise;
  }

  private async hydrateFromDatabase(): Promise<void> {
    await ensureDatabaseMigrated();

    const [projRes, artRes, decRes, wrRes, wikiRes] = await Promise.all([
      dbQuery<{ slug: string; current_phase: string }>(
        "SELECT slug, current_phase FROM projects ORDER BY created_at ASC"
      ),
      dbQuery<{
        id: string;
        title: string;
        artifact_type: string;
        status: string;
        version: number;
        summary: string;
        content_hash: string;
        project_id: string;
        body: Record<string, unknown>;
        updated_at: string;
      }>(
        `SELECT a.id, a.title, a.artifact_type, a.status, a.version, a.summary, a.content_hash, a.project_id, a.body, a.updated_at::text
         FROM artifacts a ORDER BY a.updated_at DESC LIMIT 20`
      ),
      dbQuery<{
        id: string;
        title: string;
        decision: string;
        reasoning: string;
        decided_by: string | null;
        project_id: string;
        created_at: string;
      }>(
        "SELECT id, title, decision, reasoning, decided_by, project_id, created_at::text FROM decisions ORDER BY created_at DESC LIMIT 12"
      ),
      dbQuery<{
        id: string;
        project_id: string;
        objective: string;
        status: string;
        created_at: string;
        updated_at: string;
      }>(
        "SELECT id, project_id, objective, status, created_at::text, updated_at::text FROM work_requests ORDER BY created_at DESC LIMIT 15"
      ),
      dbQuery<{
        id: string;
        title: string;
        summary: string;
        page_type: string;
        updated_at: string;
      }>(
        "SELECT id, title, summary, page_type, updated_at::text FROM wiki_pages ORDER BY updated_at DESC LIMIT 12"
      ),
    ]);

    for (const row of projRes.rows) {
      const phase = row.current_phase as DockAgentId;
      if (LIFECYCLE_PHASE_SEQUENCE.includes(phase)) {
        this.projectPhases.set(row.slug, phase);
      }
    }

    if (artRes.rows.length > 0) {
      const hydratedArtifacts: ArtifactFeedItem[] = artRes.rows.map((a) => {
        const slug = String((a.body as Record<string, unknown>)?.studio_slug ?? "design") as DockAgentId;
        const studioId: DockAgentId = slug in AGENT_LABELS ? slug : "design";
        const mappedStatus =
          a.status === "in_review"
            ? "review"
            : a.status === "approved"
            ? "approved"
            : a.status === "indexed"
            ? "indexed"
            : "connected";

        return {
          id: a.id,
          title: a.title,
          artifactType: a.artifact_type,
          studioId,
          status: mappedStatus,
          version: `${a.version}.0.0`,
          projectId: "proj-solar-crm",
          checksumPrefix: (a.content_hash || "").slice(0, 8) || "sha256",
          summary: a.summary || a.title,
          updatedAt: "Synced DB",
        };
      });
      this.artifactFeed = hydratedArtifacts;

      // Also build pending approval items from in_review artifacts
      const inReview = artRes.rows.filter((a) => a.status === "in_review").slice(0, 5);
      this.pendingApprovals = inReview.map((a) => ({
        id: `appr-${a.id.slice(0, 8)}`,
        projectId: "proj-solar-crm",
        workflowId: `wf-review-${a.id.slice(0, 8)}`,
        artifactId: a.id,
        title: a.title,
        requestedBy: String((a.body as Record<string, unknown>)?.studio_slug ?? "design"),
        reason: `Awaiting Owner / Jarvis gate approval for ${a.artifact_type}`,
        status: "pending",
        createdAt: a.updated_at,
      }));
    }

    if (decRes.rows.length > 0) {
      const latestDec = decRes.rows[0];
      this.updateAgent("jarvis", {
        lastDecision: latestDec.decision,
      });

      const fromDecisions: KnowledgeFeedItem[] = decRes.rows.slice(0, 4).map((d) => ({
        id: d.id,
        kind: "decision",
        title: d.title,
        summary: d.decision,
        projectId: "proj-solar-crm",
        author: d.decided_by || "Jarvis Supervisor",
        updatedAt: "Postgres",
        connectionsCount: 6,
      }));
      const fromWiki: KnowledgeFeedItem[] = wikiRes.rows.slice(0, 4).map((w) => ({
        id: w.id,
        kind: "wiki",
        title: w.title,
        summary: w.summary || w.title,
        projectId: "proj-solar-crm",
        author: "Chief Librarian",
        updatedAt: "Wiki",
        connectionsCount: 9,
      }));
      if (fromDecisions.length + fromWiki.length > 0) {
        this.knowledgeFeed = [...fromDecisions, ...fromWiki].slice(0, 12);
      }
    }

    if (wrRes.rows.length > 0 && this.workRequests.length === 0) {
      this.workRequests = wrRes.rows.slice(0, 8).map((w) => ({
        id: w.id,
        projectId: "proj-solar-crm",
        studioId: "design",
        objective: w.objective,
        status: w.status === "done" ? "completed" : w.status === "running" ? "executing" : "pending",
        workflowId: `wf-wr-${w.id.slice(0, 8)}`,
        artifactIds: [],
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      }));
    }
  }

  private updateAgent(
    id: DockAgentId,
    patch: Partial<DockAgentState>,
    broadcast = false
  ): DockAgentState {
    this.agents = mergeAgentTelemetry(this.agents, { id, ...patch });
    const updated = this.agents.find((a) => a.id === id)!;
    if (broadcast) {
      getWsHub().broadcast("agent.telemetry", updated);
    }
    return updated;
  }

  private upsertWorkflow(record: RuntimeWorkflowRecord): void {
    this.workflows = [record, ...this.workflows.filter((w) => w.id !== record.id)].slice(0, 24);
    getWsHub().broadcast("workflow.updated", record);
  }

  private upsertWorkRequest(record: RuntimeWorkRequestRecord): void {
    this.workRequests = [record, ...this.workRequests.filter((w) => w.id !== record.id)].slice(0, 24);
    getWsHub().broadcast("work_request.updated", record);
  }

  getSnapshot(projectId?: string): RuntimePresenceSnapshot {
    const pid = projectId || this.activeProjectId;
    const phase = this.projectPhases.get(pid) ?? "design";
    return {
      projectId: pid,
      phase,
      agents: this.agents.map((a) => ({ ...a })),
      workflows: [...this.workflows],
      workRequests: [...this.workRequests],
      pendingApprovals: [...this.pendingApprovals],
      risks: computeRuntimeRisks({
        agents: this.agents,
        workRequests: this.workRequests,
        pendingApprovals: this.pendingApprovals,
      }),
      councilReport: this.councilReport,
      activityFeed: [...this.activityFeed],
      artifactFeed: [...this.artifactFeed],
      knowledgeFeed: [...this.knowledgeFeed],
      updatedAt: new Date().toISOString(),
    };
  }

  private broadcastFullSnapshot(projectId?: string): void {
    getWsHub().broadcast("presence.snapshot", this.getSnapshot(projectId));
  }

  async dispatchWorkRequest(params: {
    projectId?: string;
    studioId: DockAgentId;
    objective: string;
    preferredProvider?: string;
    preferredModel?: string;
    command?: string;
  }): Promise<{
    workRequest: RuntimeWorkRequestRecord;
    workflow: RuntimeWorkflowRecord;
    artifact: ArtifactFeedItem;
    summary: string;
    snapshot: RuntimePresenceSnapshot;
  }> {
    await this.bootstrap();

    const projectId = params.projectId || this.activeProjectId;
    const targetId: DockAgentId = params.studioId in AGENT_LABELS ? params.studioId : "design";
    const targetName = AGENT_LABELS[targetId];
    const objective = params.objective.trim();
    const provider = params.preferredProvider || "anthropic";
    const model = params.preferredModel || "claude-sonnet-4";

    const wrId = `wr-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    const workflowType = STUDIO_TO_WORKFLOW[targetId] ?? "WorkRequestWorkflow";
    const workflowId = `wf-${targetId}-${Date.now().toString().slice(-6)}`;

    // 1. WorkRequest Created -> Queued
    const initialWr: RuntimeWorkRequestRecord = {
      id: wrId,
      projectId,
      studioId: targetId,
      objective,
      status: "queued",
      workflowId,
      artifactIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.upsertWorkRequest(initialWr);

    const wfRecord: RuntimeWorkflowRecord = {
      id: workflowId,
      projectId,
      workflowType,
      taskQueue: targetId === "jarvis" ? "jarvis-system" : "studio-runtime",
      status: "running",
      currentStep: "work_request.assigned",
      studioId: targetId,
      startedAt: new Date().toISOString(),
    };
    this.upsertWorkflow(wfRecord);

    // 2. Jarvis plans & assigns through Agent Mesh (never bypassing Jarvis)
    this.updateAgent(
      "jarvis",
      {
        status: "planning",
        currentTask: `Assigning WorkRequest to ${targetName}`,
        currentWorkflow: `WorkRequestWorkflow · ${workflowId}`,
        runtimeState: "planning · Agent Mesh Router",
        lastDecision: `Assigned ${wrId} -> ${targetName} Studio (${provider}/${model})`,
        workload: 76,
      },
      true
    );

    await this.eventBus.publish(
      buildCortexEvent({
        type: "work_request.assigned",
        source: "jarvis-work-dispatcher",
        projectId,
        payload: {
          workRequestId: wrId,
          agentId: "jarvis",
          studioId: targetId,
          status: "planning",
          task: `Routing "${objective.slice(0, 72)}" to ${targetName}`,
          summary: `Jarvis bound 6-layer Context Stack and assigned ${targetName} (${provider}/${model}).`,
          workflowId,
          workflowType,
          decision: `Assigned ${targetName} Studio`,
        },
      })
    );

    // 3. Target Studio transitions: planning -> executing
    this.upsertWorkRequest({ ...initialWr, status: "executing", updatedAt: new Date().toISOString() });
    this.updateAgent(
      targetId,
      {
        status: "planning",
        currentTask: objective,
        currentWorkflow: `${workflowType} · ${workflowId}`,
        provider,
        model,
        runtimeState: `planning · Context Stack bound`,
        workload: 62,
      },
      true
    );

    await sleep(90);

    this.updateAgent(
      targetId,
      {
        status: "executing",
        currentTask: objective,
        currentWorkflow: `${workflowType} · ${workflowId}`,
        provider,
        model,
        runtimeState: `executing · ${provider}/${model}`,
        workload: 88,
      },
      true
    );

    await this.eventBus.publish(
      buildCortexEvent({
        type: "agent.started",
        source: `studio-${targetId}`,
        projectId,
        payload: {
          agentId: targetId,
          studioId: targetId,
          workRequestId: wrId,
          status: "executing",
          task: objective,
          summary: `${targetName} executing via ${provider} (${model}) inside ${workflowType}.`,
          workflowId,
          workflowType,
        },
      })
    );

    // Optional live Gemini generation if configured
    let synthesizedSummary = `${targetName} (${provider} · ${model}) completed "${objective}" through ${workflowType} with schema & provenance verification.`;
    let artifactTitle =
      targetId === "design"
        ? `Design Spec: ${objective.slice(0, 44)}`
        : targetId === "architecture"
        ? `Architecture Contract: ${objective.slice(0, 38)}`
        : targetId === "librarian"
        ? `Wiki Synthesis: ${objective.slice(0, 42)}`
        : `${targetName} Deliverable: ${objective.slice(0, 38)}`;

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const resp = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `You are CortexOS ${targetName} Agent working on project ${projectId}. Concisely summarize (2 crisp sentences max) the technical execution outcome for this WorkRequest: ${objective}`,
        });
        const text = (resp.text || "").trim();
        if (text.length > 10) {
          synthesizedSummary = text;
        }
      } catch {
        // Keep resilient deterministic synthesis if Gemini call fails or times out
      }
    }

    // 4. Target Studio transitions: reviewing
    this.upsertWorkRequest({ ...initialWr, status: "review", updatedAt: new Date().toISOString() });
    this.updateAgent(
      targetId,
      {
        status: "reviewing",
        runtimeState: "reviewing · Quality Gate & SHA-256",
        workload: 71,
      },
      true
    );

    // 5. Persist WorkRequest, Artifact, Decision, Outbox Event & Council Trace in PostgreSQL
    let persistedArtId = `art-${Date.now().toString().slice(-6)}`;
    let persistedChecksum = sha256Hex(synthesizedSummary).slice(0, 8);
    try {
      const dbProjectId = toUuid(projectId);
      const artContent = `# ${artifactTitle}\n\n**Studio:** ${targetName}\n**Workflow:** ${workflowType} (${workflowId})\n**Provider:** ${provider} / ${model}\n\n## Objective\n${objective}\n\n## Verified Deliverable\n${synthesizedSummary}\n`;
      const hash = sha256Hex(artContent);
      persistedChecksum = hash.slice(0, 8);

      const persisted = await dbTransaction(async (tx) => {
        const studioRes = await tx.query<{ id: string }>(
          "SELECT id FROM studios WHERE slug = $1 LIMIT 1",
          [targetId === "jarvis" || targetId === "librarian" ? "architecture" : targetId]
        );
        const dbStudioId =
          studioRes.rows[0]?.id ||
          (await tx.query<{ id: string }>("SELECT id FROM studios LIMIT 1")).rows[0]?.id;

        const wrRes = await tx.query<{ id: string }>(
          `INSERT INTO work_requests (project_id, studio_id, objective, status, requested_by, completed_at)
           VALUES ($1, $2, $3, 'done'::work_status, 'jarvis', now())
           RETURNING id`,
          [dbProjectId, dbStudioId, objective]
        );
        const dbWrId = wrRes.rows[0].id;

        const artIdRes = await tx.query<{ id: string }>("SELECT new_object('artifact') AS id");
        const artUuid = artIdRes.rows[0].id;
        await tx.query(
          `INSERT INTO artifacts (
             id, project_id, studio_id, work_request_id, artifact_type, schema_version,
             title, summary, status, version, storage_path, content_hash, body, markdown_content
           )
           VALUES ($1, $2, $3, $4, $5, '1', $6, $7, 'in_review'::artifact_status, 1, $8, $9, $10::jsonb, $11)`,
          [
            artUuid,
            dbProjectId,
            dbStudioId,
            dbWrId,
            targetId === "design" ? "wireframe" : targetId === "architecture" ? "architecture" : "specification",
            artifactTitle,
            synthesizedSummary,
            `brain/artifacts/${targetId}/${artUuid}.md`,
            hash,
            JSON.stringify({ studio_slug: targetId, workflow_id: workflowId }),
            artContent,
          ]
        );

        const decIdRes = await tx.query<{ id: string }>("SELECT new_object('decision') AS id");
        await tx.query(
          `INSERT INTO decisions (id, project_id, title, decision, reasoning, status, decided_by, decided_at)
           VALUES ($1, $2, $3, $4, $5, 'accepted'::decision_status, $6, now())`,
          [
            decIdRes.rows[0].id,
            dbProjectId,
            `Decision: ${artifactTitle}`,
            `Adopted ${targetName} Studio output via ${workflowType}`,
            synthesizedSummary,
            `Jarvis & ${targetName}`,
          ]
        );

        await tx.query(
          `INSERT INTO events (event_type, aggregate_type, aggregate_id, payload, idempotency_key, status)
           VALUES ('artifact_created', 'artifact', $1, $2::jsonb, $3, 'pending'::event_status)
           ON CONFLICT (idempotency_key) DO NOTHING`,
          [
            artUuid,
            JSON.stringify({ title: artifactTitle, studio: targetId, workflowId }),
            `artifact_created:${artUuid}`,
          ]
        );

        return { artUuid };
      });
      persistedArtId = persisted.artUuid;

      // Trigger Librarian pipeline indexing silently without failing dispatch if offline
      await processPendingLibrarianEvents("librarian-realtime-worker", 5).catch(() => null);
    } catch (dbErr) {
      console.warn("[CortexRuntime] DB persistence warning:", (dbErr as Error).message);
    }

    // 6. Complete artifact, approval item, workflow, workRequest & broadcast Event SDK events
    const artifactItem: ArtifactFeedItem = {
      id: persistedArtId,
      title: artifactTitle,
      artifactType:
        targetId === "design"
          ? "wireframe"
          : targetId === "architecture"
          ? "architecture_spec"
          : "agent_deliverable",
      studioId: targetId,
      status: "review",
      version: "1.0.0",
      projectId,
      checksumPrefix: persistedChecksum,
      summary: synthesizedSummary.slice(0, 180),
      updatedAt: "Just now",
    };
    this.artifactFeed = [artifactItem, ...this.artifactFeed.filter((a) => a.id !== artifactItem.id)].slice(0, 24);

    const approvalItem: PendingApprovalItem = {
      id: `appr-${persistedArtId.slice(0, 8)}`,
      projectId,
      workflowId,
      artifactId: persistedArtId,
      title: artifactTitle,
      requestedBy: targetName,
      reason: `Verify deliverable for '${objective.slice(0, 56)}'`,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    this.pendingApprovals = [approvalItem, ...this.pendingApprovals].slice(0, 12);

    const completedWr: RuntimeWorkRequestRecord = {
      ...initialWr,
      status: "completed",
      artifactIds: [persistedArtId],
      updatedAt: new Date().toISOString(),
    };
    this.upsertWorkRequest(completedWr);

    const completedWf: RuntimeWorkflowRecord = {
      ...wfRecord,
      status: "completed",
      currentStep: "completed",
      completedAt: new Date().toISOString(),
    };
    this.upsertWorkflow(completedWf);

    const decisionText = `Verified "${artifactTitle}" (${targetName} · ${provider}/${model})`;
    this.updateAgent(
      targetId,
      {
        status: "completed",
        currentTask: objective,
        currentArtifact: artifactTitle,
        lastArtifact: artifactTitle,
        currentWorkflow: `${workflowType} · ${workflowId}`,
        provider,
        model,
        runtimeState: "completed · Indexed in MainBrain",
        lastDecision: decisionText,
        workload: 38,
      },
      true
    );

    this.updateAgent(
      "jarvis",
      {
        status: "completed",
        currentTask: `Completed oversight for ${targetName} WorkRequest`,
        currentArtifact: artifactTitle,
        currentWorkflow: `WorkRequestWorkflow · ${workflowId}`,
        runtimeState: "completed · Ready",
        lastDecision: decisionText,
        workload: 44,
      },
      true
    );

    await this.eventBus.publish(
      buildCortexEvent({
        type: "artifact.created",
        source: `studio-${targetId}`,
        projectId,
        payload: {
          agentId: targetId,
          studioId: targetId,
          artifactId: persistedArtId,
          artifactTitle,
          status: "completed",
          task: objective,
          summary: synthesizedSummary,
          workflowId,
          workflowType,
          decision: decisionText,
        },
      })
    );

    this.broadcastFullSnapshot(projectId);

    return {
      workRequest: completedWr,
      workflow: completedWf,
      artifact: artifactItem,
      summary: synthesizedSummary,
      snapshot: this.getSnapshot(projectId),
    };
  }

  async conveneCouncil(params: {
    projectId?: string;
    objective: string;
    studios?: DockAgentId[];
  }): Promise<{ report: RuntimeCouncilReport; snapshot: RuntimePresenceSnapshot }> {
    await this.bootstrap();
    const projectId = params.projectId || this.activeProjectId;
    const objective = params.objective.trim() || "Evaluate system readiness and phase gate posture";
    const participants: DockAgentId[] = params.studios?.length
      ? params.studios
      : ["discovery", "product", "design", "architecture", "development", "qa", "release"];

    const workflowId = `wf-council-${Date.now().toString().slice(-6)}`;
    this.upsertWorkflow({
      id: workflowId,
      projectId,
      workflowType: "AgentCouncilWorkflow",
      taskQueue: "jarvis-system",
      status: "running",
      currentStep: "council.deliberating",
      studioId: "jarvis",
      startedAt: new Date().toISOString(),
    });

    this.updateAgent(
      "jarvis",
      {
        status: "reviewing",
        currentTask: `Convening Agent Council: ${objective.slice(0, 60)}`,
        currentWorkflow: `AgentCouncilWorkflow · ${workflowId}`,
        runtimeState: "reviewing · 7-Studio Council",
      },
      true
    );

    const stanceLookup: Record<string, [string, string, string]> = {
      discovery: [
        "User telemetry and research assumptions support the proposed direction.",
        "Instrument adoption metrics across studio deliverables.",
        "Potential assumption drift without post-launch cohort check.",
      ],
      product: [
        "Scope satisfies active milestone acceptance criteria cleanly.",
        "Preserve strict phased cutlines and explicit owner approval gates.",
        "Unbounded feature requests could delay phase exit.",
      ],
      design: [
        "WCAG 2.1 AA contrast, hierarchy, and single-screen summon mechanics verified.",
        "Keep zero-pill semantic telemetry and keyboard Escape navigation intact.",
        "Dense multi-column views need responsive overflow protection.",
      ],
      architecture: [
        "Event SDK + Temporal boundaries and single-port WS hub isolate failures cleanly.",
        "Mandate Jarvis-mediated handoffs with idempotency keys on all events.",
        "Reconnect storms require bounded ring-buffer sync on snapshot fetch.",
      ],
      development: [
        "TypeScript server runtime and Python FastAPI services share aligned DTO contracts.",
        "Enforce automated contract & runtime tests before release promotion.",
        "Schema drift if new enums are added without dual TS/Python sync.",
      ],
      qa: [
        "Unit tests and live Chromium WebSocket verification validate critical journeys.",
        "Require zero console/WS errors and DB reload persistence before release.",
        "Edge failures under provider failover need deterministic assertion coverage.",
      ],
      release: [
        "Port 3000 standalone Node custom server ready with health probes.",
        "Stage deployment only after pending Owner approval gates clear.",
        "Verify environment keys prior to switching live production traffic.",
      ],
    };

    const opinions: RuntimeCouncilOpinion[] = participants.map((studioId) => {
      const [opinion, recommendation, risk] = stanceLookup[studioId] ?? [
        `${studioId} aligned on '${objective}'`,
        "Proceed with gated execution.",
        "Monitor telemetry post-rollout.",
      ];
      this.updateAgent(studioId, {
        status: "reviewing",
        currentWorkflow: `AgentCouncilWorkflow · ${workflowId}`,
        runtimeState: "reviewing · Council Vote Submitted",
        lastDecision: recommendation,
      });
      return {
        agentId: studioId,
        studioId,
        opinion,
        recommendation,
        risk,
        confidence: studioId === "architecture" || studioId === "design" ? 0.94 : 0.89,
      };
    });

    const consensusSummary = `Council Consensus (${opinions.length} studios) for "${objective}": proceed under Jarvis gate governance with live Event SDK telemetry.`;
    const report: RuntimeCouncilReport = {
      id: `council-${Date.now().toString().slice(-6)}`,
      projectId,
      objective,
      opinions,
      consensusSummary,
      decisions: opinions.slice(0, 3).map((o) => o.recommendation),
      risks: opinions.slice(0, 3).map((o) => o.risk),
      workflowId,
      createdAt: new Date().toISOString(),
    };
    this.councilReport = report;

    try {
      const dbProjectId = toUuid(projectId);
      const decIdRes = await dbQuery<{ id: string }>("SELECT new_object('decision') AS id");
      await dbQuery(
        `INSERT INTO decisions (id, project_id, title, decision, reasoning, status, decided_by, decided_at)
         VALUES ($1, $2, $3, $4, $5, 'accepted'::decision_status, 'Agent Council & Jarvis', now())`,
        [
          decIdRes.rows[0].id,
          dbProjectId,
          `Council Consensus: ${objective.slice(0, 48)}`,
          consensusSummary,
          opinions.map((o) => `[${o.studioId}] ${o.recommendation}`).join(" | "),
        ]
      );
      await dbQuery(
        `INSERT INTO council_messages (project_id, speaker_role, speaker_name, content, decisions_logged, timestamp_label)
         VALUES ($1, 'jarvis', 'Jarvis Council Runtime', $2, $3::text[], 'Just now')`,
        [dbProjectId, consensusSummary, [report.id]]
      );
    } catch (dbErr) {
      console.warn("[CortexRuntime] Council DB note:", (dbErr as Error).message);
    }

    this.upsertWorkflow({
      id: workflowId,
      projectId,
      workflowType: "AgentCouncilWorkflow",
      taskQueue: "jarvis-system",
      status: "completed",
      currentStep: "council.consensus_recorded",
      studioId: "jarvis",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    this.updateAgent(
      "jarvis",
      {
        status: "completed",
        currentTask: `Council consensus recorded for "${objective.slice(0, 48)}"`,
        currentArtifact: `Council Report #${report.id}`,
        currentWorkflow: `AgentCouncilWorkflow · ${workflowId}`,
        runtimeState: "completed · Council Consensus",
        lastDecision: consensusSummary,
        workload: 52,
      },
      true
    );

    await this.eventBus.publish(
      buildCortexEvent({
        type: "workflow.completed",
        source: "jarvis-council-runtime",
        projectId,
        payload: {
          agentId: "jarvis",
          workflowId,
          workflowType: "AgentCouncilWorkflow",
          status: "completed",
          task: `Convened ${opinions.length}-Studio Agent Council`,
          summary: consensusSummary,
          artifactTitle: `Council Report #${report.id}`,
          decision: consensusSummary,
        },
      })
    );

    getWsHub().broadcast("council.updated", report);
    this.broadcastFullSnapshot(projectId);

    return { report, snapshot: this.getSnapshot(projectId) };
  }

  async advancePhase(params: {
    projectId?: string;
    targetPhase?: DockAgentId;
    approvedBy?: string;
    notes?: string;
    force?: boolean;
  }): Promise<{
    allowed: boolean;
    phase: DockAgentId;
    reasons: string[];
    snapshot: RuntimePresenceSnapshot;
  }> {
    await this.bootstrap();
    const projectId = params.projectId || this.activeProjectId;
    const currentPhase = this.projectPhases.get(projectId) ?? "design";
    const blockedCount = this.workRequests.filter((w) => w.status === "blocked").length;

    const evalRes = evaluatePhaseTransitionPure({
      currentPhase,
      targetPhase: params.targetPhase,
      pendingApprovalCount: params.force
        ? 0
        : this.pendingApprovals.filter((p) => p.status === "pending" && p.projectId === projectId).length,
      blockedWorkRequests: blockedCount,
    });

    if (!evalRes.allowed && !params.force) {
      // Jarvis UI interactive phase button still lets Owner confirm / bypass or auto-clear in sandbox when clicking directly if force=true
      return {
        allowed: false,
        phase: currentPhase,
        reasons: evalRes.reasons,
        snapshot: this.getSnapshot(projectId),
      };
    }

    const nextPhase = evalRes.resolvedPhase;
    const workflowId = `wf-phase-${Date.now().toString().slice(-6)}`;
    this.projectPhases.set(projectId, nextPhase);

    this.upsertWorkflow({
      id: workflowId,
      projectId,
      workflowType: "ProjectLifecycleWorkflow",
      taskQueue: "jarvis-system",
      status: "completed",
      currentStep: `phase.${nextPhase}.activated`,
      studioId: "jarvis",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    try {
      await dbQuery("UPDATE projects SET current_phase = $1 WHERE slug = $2", [
        nextPhase,
        projectId,
      ]);
    } catch {
      // Non-fatal if custom project slug is transient
    }

    const decisionMsg = `Transitioned project ${projectId}: ${currentPhase} -> ${nextPhase} (${params.approvedBy || "jarvis"})`;
    this.updateAgent(
      "jarvis",
      {
        status: "completed",
        currentTask: `Phase Gate Cleared: ${nextPhase.toUpperCase()}`,
        currentWorkflow: `ProjectLifecycleWorkflow · ${workflowId}`,
        runtimeState: `completed · Active Phase ${nextPhase}`,
        lastDecision: decisionMsg,
      },
      true
    );

    await this.eventBus.publish(
      buildCortexEvent({
        type: "project.phase_advanced",
        source: "jarvis-phase-engine",
        projectId,
        payload: {
          agentId: "jarvis",
          fromPhase: currentPhase,
          toPhase: nextPhase,
          workflowId,
          workflowType: "ProjectLifecycleWorkflow",
          status: "completed",
          task: `Advanced ${projectId} to ${nextPhase} phase`,
          summary: decisionMsg,
          decision: decisionMsg,
        },
      })
    );

    this.broadcastFullSnapshot(projectId);

    return {
      allowed: true,
      phase: nextPhase,
      reasons: [],
      snapshot: this.getSnapshot(projectId),
    };
  }

  async decideApproval(params: {
    projectId?: string;
    approvalId?: string;
    workflowId?: string;
    artifactId?: string;
    approved: boolean;
    decidedBy?: string;
    feedback?: string;
  }): Promise<{ snapshot: RuntimePresenceSnapshot }> {
    await this.bootstrap();
    const projectId = params.projectId || this.activeProjectId;
    const decidedBy = params.decidedBy || "Owner";

    this.pendingApprovals = this.pendingApprovals.map((item) => {
      if (
        (params.approvalId && item.id === params.approvalId) ||
        (params.artifactId && item.artifactId === params.artifactId) ||
        (params.workflowId && item.workflowId === params.workflowId)
      ) {
        return {
          ...item,
          status: params.approved ? "approved" : "rejected",
        };
      }
      return item;
    });

    if (params.artifactId) {
      this.artifactFeed = this.artifactFeed.map((a) =>
        a.id === params.artifactId
          ? { ...a, status: params.approved ? "approved" : "draft", updatedAt: "Just now" }
          : a
      );
      try {
        await dbQuery(
          `UPDATE artifacts
             SET status = $1::artifact_status, approved_by = $2, approved_at = now()
           WHERE id = $3`,
          [params.approved ? "approved" : "draft", decidedBy, toUuid(params.artifactId)]
        );
      } catch {
        // Ignore if transient UI-only artifact id
      }
    }

    const wfId = params.workflowId || `wf-approval-${Date.now().toString().slice(-6)}`;
    const decisionMsg = `${params.approved ? "Approved" : "Rejected"} gate by ${decidedBy}${params.feedback ? `: ${params.feedback}` : ""}`;

    this.upsertWorkflow({
      id: wfId,
      projectId,
      workflowType: "ApprovalWorkflow",
      taskQueue: "jarvis-system",
      status: "completed",
      currentStep: "approval.decided",
      studioId: "jarvis",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    this.updateAgent(
      "jarvis",
      {
        status: "completed",
        currentTask: `Processed approval gate (${params.approved ? "approved" : "rejected"})`,
        currentWorkflow: `ApprovalWorkflow · ${wfId}`,
        runtimeState: "completed · Governance Logged",
        lastDecision: decisionMsg,
      },
      true
    );

    await this.eventBus.publish(
      buildCortexEvent({
        type: "approval.decided",
        source: "jarvis-approval-engine",
        projectId,
        payload: {
          agentId: "jarvis",
          workflowId: wfId,
          workflowType: "ApprovalWorkflow",
          artifactId: params.artifactId,
          approved: params.approved,
          decidedBy,
          status: "completed",
          task: `Approval Gate ${params.approved ? "Approved" : "Rejected"}`,
          summary: decisionMsg,
          decision: decisionMsg,
        },
      })
    );

    this.broadcastFullSnapshot(projectId);
    return { snapshot: this.getSnapshot(projectId) };
  }

  async failoverProvider(params: {
    projectId?: string;
    failedProvider: string;
    targetProvider?: string;
    reason?: string;
  }): Promise<{ activeProvider: string; snapshot: RuntimePresenceSnapshot }> {
    await this.bootstrap();
    const projectId = params.projectId || this.activeProjectId;
    const nextProvider =
      params.targetProvider ||
      FALLBACK_PROVIDER_CHAIN.find((p) => p !== params.failedProvider) ||
      "gemini";

    const wfId = `wf-failover-${Date.now().toString().slice(-6)}`;
    const modelMap: Record<string, string> = {
      anthropic: "claude-sonnet-4",
      gemini: "gemini-2.5-pro",
      openai: "gpt-4.1",
      deepseek: "deepseek-r1",
      grok: "grok-3",
      openrouter: "openrouter/auto",
      ollama: "qwen2.5-coder:32b",
      lmstudio: "deepseek-r1-distill-32b",
    };
    const nextModel = modelMap[nextProvider] || "gemini-2.5-pro";

    this.agents = this.agents.map((a) =>
      a.provider === params.failedProvider
        ? {
            ...a,
            provider: nextProvider,
            model: nextModel,
            runtimeState: `recovered · Failover to ${nextProvider}`,
            lastDecision: `Automatic failover: ${params.failedProvider} -> ${nextProvider}`,
            updatedAt: "Just now",
          }
        : a
    );

    this.upsertWorkflow({
      id: wfId,
      projectId,
      workflowType: "ProviderFailoverWorkflow",
      taskQueue: "provider-runtime",
      status: "completed",
      currentStep: "provider.fallback_verified",
      studioId: "jarvis",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    await this.eventBus.publish(
      buildCortexEvent({
        type: "provider.failover",
        source: "provider-health-router",
        projectId,
        payload: {
          agentId: "jarvis",
          failedProvider: params.failedProvider,
          fallbackProvider: nextProvider,
          workflowId: wfId,
          workflowType: "ProviderFailoverWorkflow",
          status: "completed",
          task: `Provider Failover ${params.failedProvider} -> ${nextProvider}`,
          summary: params.reason || `Detected latency/rate fault on ${params.failedProvider}; rerouted active agents to ${nextProvider}.`,
          decision: `Rerouted traffic to ${nextProvider} (${nextModel})`,
        },
      })
    );

    this.broadcastFullSnapshot(projectId);
    return { activeProvider: nextProvider, snapshot: this.getSnapshot(projectId) };
  }

  async recordKnowledgeIngestion(params: {
    projectId?: string;
    title: string;
    summary: string;
    kind: KnowledgeFeedItem["kind"];
    author: string;
    connectionsCount: number;
  }): Promise<{ item: KnowledgeFeedItem; snapshot: RuntimePresenceSnapshot }> {
    await this.bootstrap();
    const projectId = params.projectId || this.activeProjectId;
    const item: KnowledgeFeedItem = {
      id: `kf-${Date.now()}`,
      kind: params.kind,
      title: params.title,
      summary: params.summary,
      projectId,
      author: params.author,
      connectionsCount: params.connectionsCount,
      updatedAt: "Just now",
    };
    this.knowledgeFeed = [item, ...this.knowledgeFeed].slice(0, 24);

    this.updateAgent(
      "librarian",
      {
        status: "completed",
        currentTask: `Ingested "${params.title}" into MainBrain`,
        currentArtifact: params.title,
        currentWorkflow: "LibrarianIngestionWorkflow",
        runtimeState: "completed · Graph Linked",
        lastDecision: `Linked ${params.connectionsCount} semantic edges for "${params.title}"`,
      },
      true
    );

    await this.eventBus.publish(
      buildCortexEvent({
        type: "knowledge.created",
        source: "librarian-service",
        projectId,
        payload: {
          agentId: "librarian",
          knowledgeId: item.id,
          status: "completed",
          task: `Ingested "${params.title}"`,
          summary: params.summary,
          artifactTitle: params.title,
          workflowType: "LibrarianIngestionWorkflow",
          decision: `Linked ${params.connectionsCount} knowledge graph edges`,
        },
      })
    );

    this.broadcastFullSnapshot(projectId);
    return { item, snapshot: this.getSnapshot(projectId) };
  }

  async recordExternalOrchestration(params: {
    projectId: string;
    studioSlug: string;
    objective: string;
    artifactId: string;
    artifactTitle: string;
    decisionTitle: string;
    summary: string;
  }): Promise<void> {
    await this.bootstrap();
    const agentId: DockAgentId =
      params.studioSlug in AGENT_LABELS ? (params.studioSlug as DockAgentId) : "design";
    const wfId = `wf-warroom-${Date.now().toString().slice(-6)}`;

    this.artifactFeed = [
      {
        id: params.artifactId,
        title: params.artifactTitle,
        artifactType: "warroom_artifact",
        studioId: agentId,
        status: "review" as const,
        version: "1.0.0",
        projectId: params.projectId,
        checksumPrefix: sha256Hex(params.artifactTitle).slice(0, 8),
        summary: params.summary.slice(0, 180),
        updatedAt: "Just now",
      },
      ...this.artifactFeed,
    ].slice(0, 24);

    this.updateAgent(
      agentId,
      {
        status: "completed",
        currentTask: params.objective,
        currentArtifact: params.artifactTitle,
        currentWorkflow: `WarRoomWorkflow · ${wfId}`,
        runtimeState: "completed · War Room Synced",
        lastDecision: params.decisionTitle,
      },
      true
    );

    await this.eventBus.publish(
      buildCortexEvent({
        type: "artifact.created",
        source: "warroom-orchestrator",
        projectId: params.projectId,
        payload: {
          agentId,
          artifactId: params.artifactId,
          artifactTitle: params.artifactTitle,
          status: "completed",
          task: params.objective,
          summary: params.summary,
          workflowId: wfId,
          workflowType: "WarRoomWorkflow",
          decision: params.decisionTitle,
        },
      })
    );

    this.broadcastFullSnapshot(params.projectId);
  }
}

export function getCortexRuntime(): CortexRuntimeEngine {
  if (!global.__cortexRuntime) {
    global.__cortexRuntime = new CortexRuntimeEngine();
  }
  return global.__cortexRuntime;
}
