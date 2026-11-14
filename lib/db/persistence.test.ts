import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Register a lightweight Node ESM resolver hook so extensionless .ts imports and @/* aliases resolve natively under `node --test`
const rootDirUrl = pathToFileURL(process.cwd() + "/").href;
const loaderCode = `
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const rootUrl = ${JSON.stringify(rootDirUrl)};

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return nextResolve("next/server.js", context);
  }
  if (specifier.startsWith("@/")) {
    const targetPath = path.join(fileURLToPath(rootUrl), specifier.slice(2));
    if (fs.existsSync(targetPath + ".ts")) {
      return nextResolve(pathToFileURL(targetPath + ".ts").href, context);
    }
    if (fs.existsSync(targetPath + ".tsx")) {
      return nextResolve(pathToFileURL(targetPath + ".tsx").href, context);
    }
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier)) {
    const parentPath = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd();
    const candidateTs = path.resolve(parentPath, specifier + ".ts");
    if (fs.existsSync(candidateTs)) {
      return nextResolve(pathToFileURL(candidateTs).href, context);
    }
  }
  return nextResolve(specifier, context);
}
`;

register(`data:text/javascript;charset=utf-8,${encodeURIComponent(loaderCode)}`);

test("1. Database automatic migration creates brain_objects and seeds 7 studios idempotently", async () => {
  const { query, ensureDatabaseMigrated } = await import("./client.ts");
  await ensureDatabaseMigrated();

  const tableCheck = await query<{ exists_flag: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'brain_objects'
     ) AS exists_flag`
  );
  assert.equal(tableCheck.rows[0]?.exists_flag, true);

  const studiosCheck = await query<{ cnt: string }>(`SELECT COUNT(*)::text AS cnt FROM studios`);
  assert.ok(Number(studiosCheck.rows[0]?.cnt) >= 7, "All 7 studios must be seeded");
});

test("2. Unauthenticated or wrong-key mutating requests are rejected with 401 via timing-safe comparison while GET routes remain public", async () => {
  const { NextRequest } = await import("next/server.js");
  const { POST: postSource, GET: getSources } = await import("../../app/api/sources/route.ts");
  const { POST: postProject } = await import("../../app/api/projects/route.ts");
  const { timingSafeCompareKeys } = await import("./auth.ts");

  assert.equal(timingSafeCompareKeys("secret-1", "secret-1"), true);
  assert.equal(timingSafeCompareKeys("secret-1", "secret-2"), false);
  assert.equal(timingSafeCompareKeys("short", "longer-secret"), false);
  assert.equal(timingSafeCompareKeys("", "secret-1"), false);

  const unauthSourceReq = new NextRequest("http://localhost:3000/api/sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Unauthorized Source", raw_content: "Test" }),
  });
  const res1 = await postSource(unauthSourceReq);
  assert.equal(res1.status, 401);

  const wrongKeyProjReq = new NextRequest("http://localhost:3000/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-key": "invalid-owner-key-attempt",
    },
    body: JSON.stringify({ name: "Unauthorized Project" }),
  });
  const res2 = await postProject(wrongKeyProjReq);
  assert.equal(res2.status, 401);

  const publicGetReq = new NextRequest("http://localhost:3000/api/sources", {
    method: "GET",
  });
  const res3 = await getSources(publicGetReq);
  assert.equal(res3.status, 200);
});

test("3. POST /api/sources enforces 413 (>2MB), defaults trust='untrusted', persists entities/concepts/relationships/claims/wiki pages, and rejects duplicate hash with 409", async () => {
  const { NextRequest } = await import("next/server.js");
  const { POST: postSource } = await import("../../app/api/sources/route.ts");
  const { query } = await import("./client.ts");

  const ownerKey = process.env.OWNER_KEY || "cortex-owner-key-v1";

  // 3a. Body > 2MB -> 413
  const oversizedContent = "A".repeat(2 * 1024 * 1024 + 64);
  const req413 = new NextRequest("http://localhost:3000/api/sources", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-key": ownerKey,
      "x-forwarded-for": "test-413-client",
    },
    body: JSON.stringify({
      title: "Oversized Source",
      raw_content: oversizedContent,
    }),
  });
  const res413 = await postSource(req413);
  assert.equal(res413.status, 413);

  // 3b. Real markdown ingestion -> 202
  const uniqueRunTag = `PgVectorZeroTrust_${Date.now()}`;
  const markdownBody = `# ${uniqueRunTag} Architecture Note

PostgreSQL 16 with pgvector and pg_trgm powers the CortexOS unified Second Brain database.
Chief Librarian validates every extracted claim with verbatim line locators and ripples changes to Wiki/Index.md and Wiki/Log.md.
Jarvis Supervisor enforces quality gates before transitioning between the 7 Studios.
`;

  const req202 = new NextRequest("http://localhost:3000/api/sources", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-key": ownerKey,
      "x-forwarded-for": "test-202-client",
    },
    body: JSON.stringify({
      title: `R - ${uniqueRunTag}`,
      kind: "markdown",
      raw_content: markdownBody,
      project_id: "proj-cortex-os",
      // Omit trust to verify default 'untrusted'
    }),
  });

  const res202 = await postSource(req202);
  assert.equal(res202.status, 202);
  const data202 = await res202.json();
  assert.equal(data202.source.trust, "untrusted", "trust must default to 'untrusted'");
  assert.equal(data202.source.ingest_status, "processed");

  const sourceUuid = data202.source.id;

  // Verify persistence in Postgres tables: sources, entities/concepts, relationships, claims, wiki_pages, chunks
  const srcCheck = await query<{ id: string; trust: string; ingest_status: string }>(
    `SELECT id, trust, ingest_status FROM sources WHERE id = $1::uuid`,
    [sourceUuid]
  );
  assert.equal(srcCheck.rows.length, 1);
  assert.equal(srcCheck.rows[0].trust, "untrusted");
  assert.equal(srcCheck.rows[0].ingest_status, "processed");

  const claimsCheck = await query<{ id: string; locator: string }>(
    `SELECT id, locator FROM claims WHERE source_id = $1::uuid`,
    [sourceUuid]
  );
  assert.ok(claimsCheck.rows.length >= 1, "At least one provenance claim must be persisted for the source");
  assert.match(claimsCheck.rows[0].locator, /^(line|lines|L)\s*\d+/i, "Claim locator must use real line numbers");

  const relCheck = await query<{ id: string }>(
    `SELECT id FROM relationships WHERE source_id = $1::uuid`,
    [sourceUuid]
  );
  assert.ok(relCheck.rows.length >= 1, "Extracted relationships must be persisted in Postgres");

  const wikiCheck = await query<{ id: string; path: string; markdown_body: string }>(
    `SELECT id, path, markdown_body FROM wiki_pages WHERE markdown_body ILIKE $1`,
    [`%${uniqueRunTag}%`]
  );
  assert.ok(wikiCheck.rows.length >= 1, "Wiki summary, index.md, or log.md must be persisted with source content");

  const chunkCheck = await query<{ object_id: string; dim: number }>(
    `SELECT object_id, array_length(embedding, 1) AS dim FROM embeddings WHERE object_id = $1::uuid`,
    [sourceUuid]
  );
  assert.ok(chunkCheck.rows.length >= 1, "Source chunks must be persisted with embeddings");
  assert.equal(chunkCheck.rows[0].dim, 1536, "Embedding dimensionality must be 1536");

  // 3c. Duplicate content_hash -> 409
  const req409 = new NextRequest("http://localhost:3000/api/sources", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-key": ownerKey,
      "x-forwarded-for": "test-409-client",
    },
    body: JSON.stringify({
      title: `R - Duplicate ${uniqueRunTag}`,
      kind: "markdown",
      raw_content: markdownBody,
    }),
  });
  const res409 = await postSource(req409);
  assert.equal(res409.status, 409);

  // 4. Verify /api/search hybrid search returns the ingested source with source_id citations
  const { GET: getSearch } = await import("../../app/api/search/route.ts");
  const searchReq = new NextRequest(
    `http://localhost:3000/api/search?q=${encodeURIComponent(uniqueRunTag)}&limit=5`
  );
  const searchRes = await getSearch(searchReq);
  assert.equal(searchRes.status, 200);
  const searchData = await searchRes.json();
  assert.ok(Array.isArray(searchData.results) && searchData.results.length > 0, "Hybrid search must return results");
  const citedSourceIds = searchData.citations.map((c: { source_id: string }) => c.source_id);
  assert.ok(
    citedSourceIds.includes(sourceUuid),
    `Hybrid search citations must include ingested source_id ${sourceUuid}`
  );

  // 5. Verify /api/graph/[id] returns depth-2 neighbors using graph_neighbors() SQL function
  const { GET: getGraph } = await import("../../app/api/graph/[id]/route.ts");
  const graphReq = new NextRequest(
    `http://localhost:3000/api/graph/proj-cortex-os?depth=2`
  );
  const graphRes = await getGraph(graphReq, { params: Promise.resolve({ id: "proj-cortex-os" }) });
  assert.equal(graphRes.status, 200);
  const graphData = await graphRes.json();
  assert.ok(Array.isArray(graphData.neighbors), "graph_neighbors() must return neighbors array");
  assert.ok(graphData.neighbors.length > 0, "proj-cortex-os must have connected graph neighbors");
  const hasDepth2 = graphData.neighbors.some((n: { depth: number }) => n.depth === 2);
  assert.equal(hasDepth2, true, "graph_neighbors(id, 2) must return depth-2 neighbors");
});

test("4. PATCH /api/artifacts/[id] enforces status=approved requires approved_by AND approved_at (422 vs 200)", async () => {
  const { NextRequest } = await import("next/server.js");
  const { PATCH: patchArtifact } = await import("../../app/api/artifacts/[id]/route.ts");

  const ownerKey = process.env.OWNER_KEY || "cortex-owner-key-v1";

  // Missing approved_by / approved_at -> 422
  const req422 = new NextRequest("http://localhost:3000/api/artifacts/art-solar-wireframes", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-owner-key": ownerKey,
    },
    body: JSON.stringify({
      status: "approved",
    }),
  });
  const res422 = await patchArtifact(req422, {
    params: Promise.resolve({ id: "art-solar-wireframes" }),
  });
  assert.equal(res422.status, 422);

  // With both approved_by and approved_at -> 200
  const nowIso = new Date().toISOString();
  const req200 = new NextRequest("http://localhost:3000/api/artifacts/art-solar-wireframes", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-owner-key": ownerKey,
    },
    body: JSON.stringify({
      status: "approved",
      approved_by: "Ray (Founder)",
      approved_at: nowIso,
    }),
  });
  const res200 = await patchArtifact(req200, {
    params: Promise.resolve({ id: "art-solar-wireframes" }),
  });
  assert.equal(res200.status, 200);
  const updated = await res200.json();
  assert.equal(updated.status, "approved");
  assert.equal(updated.approved_by, "Ray (Founder)");
});

test("5. Transactional outbox invariant: every source has a source_created event and transaction failure rolls back both", async () => {
  const { query, dbTransaction } = await import("./client.ts");

  // Verify that all sources currently in the database have a corresponding source_created event
  const sourcesRes = await query<{ count: string }>("SELECT count(*)::text AS count FROM sources");
  const eventsRes = await query<{ count: string }>(
    "SELECT count(*)::text AS count FROM events WHERE event_type = 'source_created'"
  );
  const sourceCount = parseInt(sourcesRes.rows[0].count, 10);
  const eventCount = parseInt(eventsRes.rows[0].count, 10);
  assert.ok(sourceCount >= 4, `Expected at least 4 sources, found ${sourceCount}`);
  assert.ok(
    eventCount >= sourceCount,
    `Outbox gap detected! Expected >= ${sourceCount} source_created events, but only found ${eventCount}`
  );

  // Verify transaction atomicity: simulating a failure inside the transaction rolls back both source and event
  const testId = "00000000-0000-0000-0000-000000009999";
  let transactionFailed = false;
  try {
    await dbTransaction(async (tx) => {
      await tx.query(
        "INSERT INTO brain_objects (id, object_type) VALUES ($1, 'source') ON CONFLICT DO NOTHING",
        [testId]
      );
      await tx.query(
        `INSERT INTO sources (id, kind, title, storage_path, content_hash, raw_content, mime_type, byte_size, trust, ingest_status)
         VALUES ($1, 'markdown'::source_kind, 'Rollback Test', 'brain/raw/test.md', 'dummyhash123', 'content', 'text/markdown', 7, 'untrusted'::trust_level, 'received'::ingest_status)`,
        [testId]
      );
      await tx.query(
        `INSERT INTO events (event_type, aggregate_type, aggregate_id, payload, idempotency_key, status)
         VALUES ('source_created', 'source', $1, '{"test": true}'::jsonb, 'source_created:rollback-test', 'pending'::event_status)`,
        [testId]
      );
      // Intentionally throw to trigger rollback
      throw new Error("Simulated failure inside transaction");
    });
  } catch {
    transactionFailed = true;
  }
  assert.ok(transactionFailed, "Transaction must fail and catch error");

  // Verify neither source nor event was committed
  const checkSrc = await query("SELECT id FROM sources WHERE id = $1", [testId]);
  assert.equal(checkSrc.rows.length, 0, "Source row must be rolled back on transaction error");
  const checkEv = await query("SELECT id FROM events WHERE idempotency_key = 'source_created:rollback-test'");
  assert.equal(checkEv.rows.length, 0, "Outbox event must be rolled back on transaction error");
});

test("6. POST /api/admin/requeue route is guarded by OWNER_KEY and calls requeue_stale_events()", async () => {
  const { NextRequest } = await import("next/server.js");
  const { POST: postRequeue } = await import("../../app/api/admin/requeue/route.ts");
  const ownerKey = process.env.OWNER_KEY || "cortex-owner-key-v1";

  // Unauthenticated -> 401
  const reqUnauth = new NextRequest("http://localhost:3000/api/admin/requeue", {
    method: "POST",
  });
  const resUnauth = await postRequeue(reqUnauth);
  assert.equal(resUnauth.status, 401);

  // Authenticated -> 200 and calls requeue_stale_events()
  const reqAuth = new NextRequest("http://localhost:3000/api/admin/requeue", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-key": ownerKey,
    },
    body: JSON.stringify({ older_than: "1 second" }),
  });
  const resAuth = await postRequeue(reqAuth);
  assert.equal(resAuth.status, 200);
  const data = await resAuth.json();
  assert.equal(data.ok, true);
  assert.equal(typeof data.requeued_count, "number");
});

test("7. GET /api/search executes hybrid search querying embeddings + sources + wiki_pages and returns source citations", async () => {
  const { NextRequest } = await import("next/server.js");
  const { GET: getSearch } = await import("../../app/api/search/route.ts");

  const req = new NextRequest("http://localhost:3000/api/search?q=Karpathy");
  const res = await getSearch(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.results));
  assert.ok(data.results.length > 0, "Expected search results for 'Karpathy'");
  const topResult = data.results[0];
  assert.ok(topResult.title);
  assert.ok(topResult.source_id, "Each search result must return source_id citation");
  assert.ok(typeof topResult.rrf_score === "number", "Result must contain RRF score");
  assert.ok(Array.isArray(topResult.citations), "Result must contain citations array");
});

test("8. GET /api/graph/project/[id] returns complete Postgres brain_objects and active relationships in same UUID space", async () => {
  const { NextRequest } = await import("next/server.js");
  const { GET: getProjectGraph } = await import("../../app/api/graph/project/[id]/route.ts");
  const { query } = await import("./client.ts");

  const boCountRes = await query<{ count: string }>("SELECT count(*)::text AS count FROM brain_objects");
  const relCountRes = await query<{ count: string }>(
    "SELECT count(*)::text AS count FROM relationships WHERE superseded_at IS NULL AND review_state <> 'rejected'"
  );
  const expectedNodesCount = parseInt(boCountRes.rows[0].count, 10);
  const expectedEdgesCount = parseInt(relCountRes.rows[0].count, 10);

  const req = new NextRequest("http://localhost:3000/api/graph/project/proj-solar-crm");
  const res = await getProjectGraph(req, {
    params: Promise.resolve({ id: "proj-solar-crm" }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.nodes), "Project graph must return nodes array");
  assert.equal(data.nodes.length, expectedNodesCount, "Must return every brain_objects row");
  assert.ok(Array.isArray(data.relationships), "Project graph must return relationships array");
  assert.ok(Array.isArray(data.edges), "Project graph must return edges array");
  assert.equal(data.edges.length, expectedEdgesCount, "Must return every active relationship");

  const nodeIds = new Set(data.nodes.map((n: { id: string }) => n.id));
  for (const edge of data.edges as Array<{ from: string; to: string; edge_type: string }>) {
    assert.ok(edge.from && edge.to && edge.edge_type, "Each edge must have from, to, edge_type");
    assert.ok(nodeIds.has(edge.from), `Edge from_id ${edge.from} must join to nodes`);
    assert.ok(nodeIds.has(edge.to), `Edge to_id ${edge.to} must join to nodes`);
  }

  const projectNodes = data.nodes.filter((n: { kind: string }) => n.kind === "project");
  assert.ok(
    projectNodes.some((n: { title: string }) => n.title.includes("CortexOS v1")),
    "Must include CortexOS v1 project node"
  );
  assert.ok(
    projectNodes.some((n: { title: string }) => n.title.includes("Helios")),
    "Must include Helios Solar CRM project node"
  );
});

test("9. POST /api/projects auto-resolves duplicate slug collisions cleanly", async () => {
  const { NextRequest } = await import("next/server.js");
  const { POST: postProject } = await import("../../app/api/projects/route.ts");
  const { query } = await import("./client.ts");
  const ownerKey = process.env.OWNER_KEY || "cortex-owner-key-v1";
  const uniqueName = `Collision Test ${Date.now()}`;
  const expectedBaseSlug = uniqueName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const createdIds: string[] = [];
  try {
    // Create first project with unique name
    const req1 = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-owner-key": ownerKey,
      },
      body: JSON.stringify({ name: uniqueName }),
    });
    const res1 = await postProject(req1);
    assert.equal(res1.status, 201);
    const data1 = await res1.json();
    createdIds.push(data1.id);
    assert.equal(data1.slug, expectedBaseSlug);

    // Create second project with the exact same name -> must auto-resolve to baseSlug-2 without 500
    const req2 = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-owner-key": ownerKey,
      },
      body: JSON.stringify({ name: uniqueName }),
    });
    const res2 = await postProject(req2);
    assert.equal(res2.status, 201);
    const data2 = await res2.json();
    createdIds.push(data2.id);
    assert.equal(data2.slug, `${expectedBaseSlug}-2`);
    assert.notEqual(data1.id, data2.id);
  } finally {
    for (const id of createdIds) {
      await query("DELETE FROM brain_objects WHERE id = $1::uuid", [id]);
    }
  }
});

test.after(async () => {
  if (global.__cortexPglite) {
    await global.__cortexPglite.close();
  }
  setTimeout(() => process.exit(0), 100).unref();
});
