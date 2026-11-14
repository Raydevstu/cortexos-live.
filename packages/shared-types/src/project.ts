import type { BaseEntity, TenantScopedEntity } from "./base";
import type {
  OrganizationPlan,
  ProjectPhase,
  ProjectStatus,
  SecurityRole,
  UserStatus,
} from "./enums";

export interface User extends BaseEntity {
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: SecurityRole;
  status: UserStatus;
  preferences: Record<string, unknown>;
}

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  plan: OrganizationPlan;
  settings: Record<string, unknown>;
}

export interface Project extends TenantScopedEntity {
  name: string;
  description: string;
  status: ProjectStatus;
  phase: ProjectPhase;
  ownerId: string;
  vision?: string | null;
}

export interface CreateProjectRequest {
  organizationId?: string;
  name: string;
  description: string;
  vision?: string | null;
  phase?: ProjectPhase;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateProjectResponse {
  id: string;
  status: ProjectStatus;
  phase: ProjectPhase;
  project?: Project;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  phase?: ProjectPhase;
  vision?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ProjectSummary {
  project: Project;
  artifactCount: number;
  decisionCount: number;
  activeWorkflowCount: number;
  activeAgentCount: number;
}
