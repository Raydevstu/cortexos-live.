import type { Artifact } from "../../shared-types/src";

export interface ArtifactClient {
  create(input: Omit<Artifact, "id" | "createdAt" | "updatedAt">): Promise<Artifact>;
  getById(id: string): Promise<Artifact | null>;
}
