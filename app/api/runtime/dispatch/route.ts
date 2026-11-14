import { NextRequest, NextResponse } from "next/server";
import type { DockAgentId } from "@/lib/agent-os-logic";
import { getCortexRuntime } from "@/lib/runtime/cortex-runtime";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const studioId = (body.studioId || body.studio_id || "jarvis") as DockAgentId;
    const objective = String(body.objective || "").trim();
    if (!objective) {
      return NextResponse.json(
        { error: "objective is required for WorkRequest dispatch." },
        { status: 422 }
      );
    }

    const runtime = getCortexRuntime();
    const result = await runtime.dispatchWorkRequest({
      projectId: body.projectId || body.project_id,
      studioId,
      objective,
      preferredProvider: body.provider || body.preferredProvider,
      preferredModel: body.model || body.preferredModel,
      command: body.command,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "WorkRequest dispatch failed" },
      { status: 500 }
    );
  }
}
