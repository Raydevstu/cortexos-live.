import type { Artifact } from "../../../../packages/shared-types/src";

export interface ArtifactStoreState {
  artifacts: Artifact[];
}

export const initialArtifactStoreState: ArtifactStoreState = {
  artifacts: [],
};
