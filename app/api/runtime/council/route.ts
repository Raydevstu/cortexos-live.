import { NextRequest, NextResponse } from "next/server";
import type { DockAgentId } from "@/lib/agent-os-logic";
import { getCortexRuntime } from "@/lib/runtime/cortex-runtime";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const objective = String(
      body.objective || "Evaluate current project readiness and phase gate posture"
    ).trim();

    const runtime = getCortexRuntime();
    const result = await runtime.conveneCouncil({
      projectId: body.projectId || body.project_id,
      objective,
      studios: Array.isArray(body.studios) ? (body.studios as DockAgentId[]) : undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "Agent Council invocation failed" },
      { status: 500 }
    );
  }
}
