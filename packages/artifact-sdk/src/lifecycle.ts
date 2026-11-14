import type { ArtifactStatus } from "../../shared-types/src";

export const ARTIFACT_LIFECYCLE_ORDER: readonly ArtifactStatus[] = [
  "draft",
  "review",
  "approved",
  "indexed",
  "connected",
  "archived",
];
