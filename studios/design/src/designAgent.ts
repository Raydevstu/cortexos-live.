import type { CortexAgent } from "../../../packages/agent-sdk/src/agent.ts";
import type { AgentStatus } from "../../../packages/shared-types/src/index.ts";

export class CortexDesignAgent implements CortexAgent {
  public readonly id = "design-agent";
  public readonly name = "Design Agent";
  public readonly role = "Experience Architect";
  public readonly studioId = "design";
  public status: AgentStatus = "idle";

  private planHook?: () => Promise<void>;
  private executeHook?: () => Promise<void>;
  private validateHook?: () => Promise<void>;
  private summarizeHook?: () => Promise<void>;
  private createArtifactHook?: () => Promise<void>;
  private handoffHook?: () => Promise<void>;

  public bindLifecycleHooks(hooks: {
    plan?: () => Promise<void>;
    execute?: () => Promise<void>;
    validate?: () => Promise<void>;
    summarize?: () => Promise<void>;
    createArtifact?: () => Promise<void>;
    handoff?: () => Promise<void>;
  }): void {
    this.planHook = hooks.plan;
    this.executeHook = hooks.execute;
    this.validateHook = hooks.validate;
    this.summarizeHook = hooks.summarize;
    this.createArtifactHook = hooks.createArtifact;
    this.handoffHook = hooks.handoff;
  }

  public async plan(): Promise<void> {
    this.status = "planning";
    if (this.planHook) await this.planHook();
  }

  public async execute(): Promise<void> {
    this.status = "executing";
    if (this.executeHook) await this.executeHook();
  }

  public async validate(): Promise<void> {
    this.status = "reviewing";
    if (this.validateHook) await this.validateHook();
  }

  public async summarize(): Promise<void> {
    if (this.summarizeHook) await this.summarizeHook();
    this.status = "completed";
  }

  public async createArtifact(): Promise<void> {
    if (this.createArtifactHook) await this.createArtifactHook();
  }

  public async handoff(): Promise<void> {
    if (this.handoffHook) await this.handoffHook();
    this.status = "completed";
  }
}
