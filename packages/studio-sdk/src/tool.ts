import type {
  ToolExecutionRecord,
  ToolExecutionRequest,
  ToolManifest,
} from "../../shared-types/src";

export interface StudioToolBinding {
  studioId: string;
  tools: readonly ToolManifest[];
}

export interface StudioToolInvoker {
  listStudioTools(studioId: string): ToolManifest[];
  invokeTool(
    request: Omit<ToolExecutionRequest, "studioId"> & { studioId?: string }
  ): Promise<ToolExecutionRecord>;
}
