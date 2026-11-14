import type { BaseEntity } from "./base";
import type { ArtifactStatus, ArtifactType } from "./enums";

export interface BaseArtifact extends BaseEntity {
  organizationId: string;
  projectId: string;
  title: string;
  artifactType: ArtifactType;
  status: ArtifactStatus;
  version: string;
  summary?: string;
  contentUri?: string;
  checksum?: string;
}

export type Artifact = BaseArtifact;
