import { NextRequest, NextResponse } from "next/server";
import { getCortexRuntime } from "@/lib/runtime/cortex-runtime";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const runtime = getCortexRuntime();
    const result = await runtime.decideApproval({
      projectId: body.projectId || body.project_id,
      approvalId: body.approvalId,
      workflowId: body.workflowId,
      artifactId: body.artifactId,
      approved: body.approved ?? true,
      decidedBy: body.decidedBy || "Owner",
      feedback: body.feedback,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "Approval decision failed" },
      { status: 500 }
    );
  }
}
