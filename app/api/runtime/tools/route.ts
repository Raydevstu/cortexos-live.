import { NextRequest, NextResponse } from "next/server";
import { getCortexRuntime } from "@/lib/runtime/cortex-runtime";
import { getToolRegistry } from "@/lib/tools";
import type { DockAgentId } from "@/lib/agent-os-logic";
import type { ToolCategory } from "@/packages/shared-types/src/tool";

export async function GET(req: NextRequest) {
  try {
    const runtime = getCortexRuntime();
    const { searchParams } = new URL(req.url);
    const studioId = searchParams.get("studioId") || undefined;
    const category = (searchParams.get("category") as ToolCategory | null) || undefined;
    const projectId = searchParams.get("projectId") || undefined;

    const tools = runtime.listTools({ studioId, category });
    const { executions, feed } = runtime.listToolExecutions(projectId);
    const auditEntries = getToolRegistry().auditing.listEntries(projectId, 30);

    return NextResponse.json({
      tools,
      executions,
      toolActivityFeed: feed,
      auditEntries,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to query Tool Registry" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      toolName?: string;
      studioId?: DockAgentId;
      agentId?: string;
      projectId?: string;
      workRequestId?: string;
      workflowId?: string;
      parameters?: Record<string, unknown>;
    };

    if (!body.toolName || !body.studioId) {
      return NextResponse.json(
        { error: "toolName and studioId are required" },
        { status: 400 }
      );
    }

    const runtime = getCortexRuntime();
    const result = await runtime.executeTool({
      toolName: body.toolName,
      studioId: body.studioId,
      agentId: body.agentId,
      projectId: body.projectId,
      workRequestId: body.workRequestId,
      workflowId: body.workflowId,
      parameters: body.parameters,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Tool execution failed" },
      { status: 500 }
    );
  }
}
