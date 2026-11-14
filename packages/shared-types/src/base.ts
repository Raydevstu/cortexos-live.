export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface BaseObject extends BaseEntity {
  title: string;
  summary: string;
}

export interface TenantScopedEntity extends BaseEntity {
  organizationId: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  nextCursor?: string | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
  timestamp: string;
}

export interface HealthCheckResponse {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: string;
  dependencies?: Record<string, "healthy" | "degraded" | "unhealthy">;
}
