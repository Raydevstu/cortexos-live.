import type { WorkRequest, WorkResponse } from "../../shared-types/src";
import type { StudioManifest } from "./manifest";

export interface Studio {
  manifest: StudioManifest;
  initialize(): Promise<void>;
  execute(request: WorkRequest): Promise<WorkResponse>;
  validate(artifactId: string): Promise<boolean>;
  handoff(): Promise<void>;
}
