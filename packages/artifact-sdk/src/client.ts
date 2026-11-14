import type { Artifact } from "../../shared-types/src";

export interface ArtifactExecutionExport {
  artifactId: string;
  projectId: string;
  studioId: string;
  title: string;
  storagePath: string;
  checksum: string;
  byteSize: number;
  exportedAt: string;
}

export interface ArtifactClient {
  create(input: Omit<Artifact, "id" | "createdAt" | "updatedAt">): Promise<Artifact>;
  getById(id: string): Promise<Artifact | null>;
}
