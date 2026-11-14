import type { Project } from "../../../../packages/shared-types/src";

export interface ProjectStoreState {
  projects: Project[];
  activeProjectId: string | null;
}

export const initialProjectStoreState: ProjectStoreState = {
  projects: [],
  activeProjectId: null,
};
