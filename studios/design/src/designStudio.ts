import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  AgentMemory,
  Artifact,
  StudioHandoffRequest,
  WorkRequest,
  WorkResponse,
} from "../../../packages/shared-types/src/index.ts";
import type {
  DesignStudio,
  StudioManifest,
} from "../../../packages/studio-sdk/src/index.ts";
import {
  auditDesignAccessibility,
  type AccessibilityAuditReport,
} from "./accessibility.ts";
import {
  buildDesignSystemArtifact,
  buildUserFlowArtifact,
  buildWireframeArtifact,
  DEFAULT_DESIGN_PALETTE,
  paletteToContrastPairs,
  type DesignTokenPalette,
  type GeneratedDesignArtifact,
} from "./generators.ts";
import { DESIGN_STUDIO_MANIFEST } from "./manifest.ts";
import { CortexDesignAgent } from "./designAgent.ts";

export interface DesignStudioOptions {
  studioDir?: string;
  palette?: DesignTokenPalette;
  onArtifactCreated?: (artifact: Artifact, content: string) => Promise<void> | void;
  onHandoff?: (handoff: StudioHandoffRequest) => Promise<void> | void;
}

const FORBIDDEN_DESIGN_PATTERNS: readonly RegExp[] = [
  /\bdrop\s+table\b/i,
  /\bsql\s+migration\b/i,
  /\bterraform\s+apply\b/i,
  /\bmodif(?:y|ies)\s+mainbrain\s+directly\b/i,
  /\bbypass\s+jarvis\b/i,
];

export class CortexDesignStudio implements DesignStudio {
  public readonly manifest: StudioManifest = DESIGN_STUDIO_MANIFEST;
  public readonly agent: CortexDesignAgent = new CortexDesignAgent();

  private readonly studioDir: string;
  private palette: DesignTokenPalette;
  private readonly options: DesignStudioOptions;

  private initialized = false;
  private localMemory: AgentMemory[] = [];
  private activeRequest: WorkRequest | null = null;
  private generatedArtifacts = new Map<string, GeneratedDesignArtifact>();
  private lastAccessibilityReport: AccessibilityAuditReport | null = null;
  private lastHandoff: StudioHandoffRequest | null = null;

  constructor(options: DesignStudioOptions = {}) {
    this.options = options;
    this.studioDir = options.studioDir ?? path.resolve(process.cwd(), "studios/design");
    this.palette = options.palette ?? DEFAULT_DESIGN_PALETTE;
  }

  public setPalette(palette: DesignTokenPalette): void {
    this.palette = palette;
  }

  public getLocalMemory(): readonly AgentMemory[] {
    return this.localMemory;
  }

  public getGeneratedArtifacts(): GeneratedDesignArtifact[] {
    return Array.from(this.generatedArtifacts.values());
  }

  public getAccessibilityReport(): AccessibilityAuditReport | null {
    return this.lastAccessibilityReport;
  }

  public getLastHandoff(): StudioHandoffRequest | null {
    return this.lastHandoff;
  }

  public async initialize(): Promise<void> {
    try {
      const memPath = path.join(this.studioDir, "memory", "local-memory.json");
      const raw = await readFile(memPath, "utf8");
      const parsed = JSON.parse(raw) as AgentMemory[];
      this.localMemory = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.localMemory = [];
    }
    this.initialized = true;
  }

  private assertRequestValid(): WorkRequest {
    if (!this.activeRequest) {
      throw new Error(
        "No active WorkRequest in DesignStudio context. Call execute(request) or bind context first."
      );
    }
    return this.activeRequest;
  }

  private async registerArtifact(generated: GeneratedDesignArtifact): Promise<void> {
    this.generatedArtifacts.set(generated.artifact.id, generated);
    if (this.options.onArtifactCreated) {
      await this.options.onArtifactCreated(generated.artifact, generated.content);
    }
  }

  public async createFlows(): Promise<void> {
    const request = this.assertRequestValid();
    const nowIso = new Date().toISOString();
    const generated = buildUserFlowArtifact(request, nowIso);
    await this.registerArtifact(generated);
  }

  public async createWireframes(): Promise<void> {
    const request = this.assertRequestValid();
    const nowIso = new Date().toISOString();
    const generated = buildWireframeArtifact(request, nowIso);
    await this.registerArtifact(generated);
  }

  public async createDesignSystem(): Promise<void> {
    const request = this.assertRequestValid();
    const nowIso = new Date().toISOString();
    const generated = buildDesignSystemArtifact(request, this.palette, nowIso);
    await this.registerArtifact(generated);
  }

  public async accessibilityReview(): Promise<void> {
    const artifacts = this.getGeneratedArtifacts();
    const wireframe = artifacts.find((a) => a.artifact.artifactType === "wireframe");
    const designSystem = artifacts.find((a) => a.artifact.artifactType === "design_system");

    const report = auditDesignAccessibility({
      tokenPairs: paletteToContrastPairs(this.palette),
      hasPrimaryMainLandmark: Boolean(wireframe?.artifact.metadata?.hasPrimaryMainLandmark),
      hasKeyboardTraversalPlan: Boolean(
        wireframe?.artifact.metadata?.hasKeyboardTraversalPlan
      ),
      hasReducedMotionFallback: Boolean(
        designSystem?.artifact.metadata?.hasReducedMotionFallback
      ),
      hasLoadingEmptyErrorStates: Boolean(
        wireframe?.artifact.metadata?.hasLoadingEmptyErrorStates
      ),
    });

    this.lastAccessibilityReport = report;

    if (designSystem) {
      designSystem.artifact.metadata = {
        ...(designSystem.artifact.metadata ?? {}),
        accessibilityReport: report,
      };
    }
  }

  public async validate(artifactId: string): Promise<boolean> {
    const entry = this.generatedArtifacts.get(artifactId);
    if (!entry) {
      return false;
    }
    const { artifact, content } = entry;
    const supported = this.manifest.supportedArtifacts.includes(artifact.artifactType);
    const hasContent = content.trim().length > 20 && Boolean(artifact.summary?.trim());
    const hasChecksum = Boolean(artifact.checksum && artifact.checksum.length === 64);
    const a11yOk =
      artifact.artifactType !== "design_system" ||
      (this.lastAccessibilityReport?.passed ?? false);

    return supported && hasContent && hasChecksum && a11yOk;
  }

  public async handoff(): Promise<void> {
    const request = this.assertRequestValid();
    const artifactIds = Array.from(this.generatedArtifacts.keys());
    if (artifactIds.length === 0) {
      throw new Error("DesignStudio cannot handoff without generated artifacts.");
    }
    const handoffPayload: StudioHandoffRequest = {
      projectId: request.projectId,
      fromStudioId: "design",
      toStudioId: "architecture",
      artifactIds,
      summary: `Design Studio completed ${artifactIds.length} validated experience artifacts for "${request.objective}" (WCAG AA score: ${this.lastAccessibilityReport?.score ?? 0}%). Routed via Jarvis & Agent Mesh.`,
    };
    this.lastHandoff = handoffPayload;
    if (this.options.onHandoff) {
      await this.options.onHandoff(handoffPayload);
    }
  }

  public async execute(request: WorkRequest): Promise<WorkResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (request.studioId !== "design") {
      return {
        id: `wres-${request.id}`,
        requestId: request.id,
        studioId: "design",
        status: "failed",
        artifactIds: [],
        summary: `WorkRequest studioId '${request.studioId}' is incompatible with Design Studio.`,
      };
    }

    const combinedText = [request.objective, ...request.constraints].join(" ");
    for (const pattern of FORBIDDEN_DESIGN_PATTERNS) {
      if (pattern.test(combinedText)) {
        return {
          id: `wres-${request.id}`,
          requestId: request.id,
          studioId: "design",
          status: "blocked",
          artifactIds: [],
          summary: `Blocked by Design Studio governance constraints: objective conflicts with Experience Architect boundary (${pattern.source}).`,
        };
      }
    }

    this.activeRequest = request;
    this.generatedArtifacts.clear();
    this.lastAccessibilityReport = null;
    this.lastHandoff = null;

    await this.agent.plan();
    await this.agent.execute();
    await this.createFlows();
    await this.createWireframes();
    await this.createDesignSystem();
    await this.agent.createArtifact();
    await this.agent.validate();
    await this.accessibilityReview();

    const artifactIds = Array.from(this.generatedArtifacts.keys());
    const validationResults = await Promise.all(
      artifactIds.map((id) => this.validate(id))
    );
    const allValid = validationResults.every(Boolean);

    const report = this.getAccessibilityReport();
    if (!allValid || !(report?.passed ?? false)) {
      this.agent.status = "blocked";
      const reasons = report?.blockers.join("; ") || "Validation gate failed.";
      return {
        id: `wres-${request.id}`,
        requestId: request.id,
        studioId: "design",
        status: "blocked",
        artifactIds,
        summary: `Design Studio blocked on Accessibility/Validation gate: ${reasons}`,
      };
    }

    await this.handoff();
    await this.agent.handoff();
    await this.agent.summarize();

    return {
      id: `wres-${request.id}`,
      requestId: request.id,
      studioId: "design",
      status: "completed",
      artifactIds,
      summary: `Generated and validated ${artifactIds.length} Design Studio artifacts (ui_design, wireframe, design_system) with WCAG 2.1 AA score ${report?.score ?? 100}%.`,
      nextRecommendedPhase: "architecture",
    };
  }
}
