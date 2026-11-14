import { NextRequest, NextResponse } from "next/server";
import type { DockAgentId } from "@/lib/agent-os-logic";
import { getCortexRuntime } from "@/lib/runtime/cortex-runtime";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const runtime = getCortexRuntime();
    const result = await runtime.advancePhase({
      projectId: body.projectId || body.project_id,
      targetPhase: body.targetPhase as DockAgentId | undefined,
      approvedBy: body.approvedBy || "Owner",
      notes: body.notes,
      force: body.force ?? true,
    });

    if (!result.allowed) {
      return NextResponse.json(
        { error: result.reasons.join(" "), ...result },
        { status: 409 }
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "Phase transition failed" },
      { status: 500 }
    );
  }
}
