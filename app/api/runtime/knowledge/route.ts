import { NextRequest, NextResponse } from "next/server";
import type { KnowledgeFeedItem } from "@/lib/agent-os-logic";
import { getCortexRuntime } from "@/lib/runtime/cortex-runtime";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    const summary = String(body.summary || "").trim();
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 422 });
    }
    const runtime = getCortexRuntime();
    const result = await runtime.recordKnowledgeIngestion({
      projectId: body.projectId,
      title,
      summary: summary || title,
      kind: (body.kind || "wiki") as KnowledgeFeedItem["kind"],
      author: body.author || "Operator",
      connectionsCount: Number(body.connectionsCount || 5),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "Knowledge ingestion event failed" },
      { status: 500 }
    );
  }
}
