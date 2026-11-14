import type { SecurityRole } from "./enums";

export interface PolicyEvaluationContext {
  subjectId: string;
  organizationId: string;
  role: SecurityRole;
  resource: string;
  action: string;
  projectId?: string;
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  matchedPolicy?: string;
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  organizationId: string;
  role: SecurityRole;
  expiresAt: string;
  createdAt: string;
}

export interface RolePermissions {
  role: SecurityRole;
  permissions: readonly string[];
}

export const DEFAULT_ROLE_PERMISSIONS: Record<SecurityRole, readonly string[]> = {
  Owner: ["*"],
  Admin: [
    "project:*",
    "artifact:*",
    "knowledge:*",
    "studio:*",
    "workflow:*",
    "provider:*",
    "user:manage",
  ],
  Builder: [
    "project:read",
    "project:write",
    "artifact:read",
    "artifact:write",
    "knowledge:read",
    "studio:execute",
    "workflow:start",
    "terminal:execute",
  ],
  Reviewer: [
    "project:read",
    "artifact:read",
    "artifact:review",
    "artifact:approve",
    "knowledge:read",
    "workflow:approve",
  ],
  Observer: [
    "project:read",
    "artifact:read",
    "knowledge:read",
    "workflow:read",
  ],
};
