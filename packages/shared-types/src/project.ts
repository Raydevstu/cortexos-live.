import type { BaseEntity } from "./base";
import type { ProjectPhase, ProjectStatus } from "./enums";

export interface Project extends BaseEntity {
  organizationId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  phase: ProjectPhase;
  ownerId: string;
  vision?: string;
}
