import type { SecurityRole } from "./enums";

export interface PolicyEvaluationContext {
  subjectId: string;
  organizationId: string;
  role: SecurityRole;
  resource: string;
  action: string;
}
