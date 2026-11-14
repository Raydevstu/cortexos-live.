import { NextRequest, NextResponse } from "next/server";
import { getCortexRuntime } from "@/lib/runtime/cortex-runtime";

export async function GET(req: NextRequest) {
  try {
    const runtime = getCortexRuntime();
    await runtime.bootstrap();
    const projectId = req.nextUrl.searchParams.get("projectId") || undefined;
    return NextResponse.json(runtime.getSnapshot(projectId));
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "Failed to load runtime snapshot" },
      { status: 500 }
    );
  }
}
