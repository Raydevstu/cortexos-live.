import { NextRequest, NextResponse } from "next/server";
import { getCortexRuntime } from "@/lib/runtime/cortex-runtime";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const runtime = getCortexRuntime();
    const result = await runtime.failoverProvider({
      projectId: body.projectId || body.project_id,
      failedProvider: String(body.failedProvider || "anthropic"),
      targetProvider: body.targetProvider,
      reason: body.reason || "Operator-triggered failover verification",
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "Provider failover failed" },
      { status: 500 }
    );
  }
}
