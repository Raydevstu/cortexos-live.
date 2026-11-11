import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db/client";
import { requireOwnerKey } from "@/lib/db/auth";

export async function POST(req: NextRequest) {
  // Guarded by OWNER_KEY secret
  const unauthorized = requireOwnerKey(req);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    let olderThan = "10 minutes";
    try {
      const body = await req.json();
      if (body?.older_than && typeof body.older_than === "string") {
        olderThan = body.older_than.trim();
      }
    } catch {
      // Empty or non-JSON body is valid, default to 10 minutes
    }

    const res = await dbQuery<{ requeued_count: number }>(
      "SELECT requeue_stale_events($1::interval) AS requeued_count",
      [olderThan]
    );

    const count = Number(res.rows[0]?.requeued_count ?? 0);

    return NextResponse.json({
      ok: true,
      requeued_count: count,
      older_than: olderThan,
      recovered_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[POST /api/admin/requeue] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to requeue stale events" },
      { status: 500 }
    );
  }
}
