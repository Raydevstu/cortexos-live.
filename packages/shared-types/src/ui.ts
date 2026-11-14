import type {
  AgentStatus,
  NotificationSeverity,
  ProjectPhase,
  StudioId,
} from "./enums";

export interface SystemNotification {
  id: string;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  projectId?: string | null;
  artifactId?: string | null;
  read: boolean;
  createdAt: string;
}

export interface ContextHeaderSummary {
  projectId: string;
  projectName: string;
  phase: ProjectPhase;
  activeStudioCount: number;
  artifactCount: number;
  knowledgeNodeCount: number;
}

export interface AgentActivityItem {
  id: string;
  agentId: string;
  agentName: string;
  studioId: StudioId | string;
  status: AgentStatus;
  task: string;
  artifactId?: string | null;
  timestamp: string;
}
