import type { BaseEntity, TenantScopedEntity } from "./base";
import type { ArtifactStatus, ArtifactType, ReviewType } from "./enums";

export interface BaseArtifact extends TenantScopedEntity {
  projectId: string;
  title: string;
  artifactType: ArtifactType;
  status: ArtifactStatus;
  version: string;
  summary?: string;
  contentUri?: string;
  checksum?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

export type Artifact = BaseArtifact;

export interface ArtifactVersion extends BaseEntity {
  artifactId: string;
  version: string;
  contentUri: string;
  changeSummary: string;
}

export interface CreateArtifactRequest {
  organizationId?: string;
  projectId: string;
  title: string;
  artifactType: ArtifactType;
  version?: string;
  summary?: string;
  content?: string;
  contentUri?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateArtifactRequest {
  title?: string;
  status?: ArtifactStatus;
  version?: string;
  summary?: string;
  contentUri?: string;
  checksum?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ArtifactSearchParams {
  projectId?: string;
  artifactType?: ArtifactType;
  status?: ArtifactStatus;
  limit?: number;
  offset?: number;
}

export interface ArtifactReviewRequest {
  artifactId: string;
  reviewType: ReviewType;
  reviewerId: string;
  comments?: string;
  findings?: string[];
}

export interface ArtifactApprovalRequest {
  artifactId: string;
  approved: boolean;
  decidedBy: string;
  decidedAt: string;
  reason?: string;
}

export interface ArtifactIngestionMetadata {
  artifactId: string;
  entityIds: string[];
  conceptIds: string[];
  patternIds: string[];
  relationshipIds: string[];
  wikiArticleIds: string[];
  indexedAt: string;
}
