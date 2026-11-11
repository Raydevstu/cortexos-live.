import { NextRequest, NextResponse } from "next/server";
import { dbQuery, isRemotePostgresUrl } from "@/lib/db/client";
import { embedText1536 } from "@/lib/db/embeddings";

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "15", 10))
    );

    if (!q) {
      const recentSources = await dbQuery<{
        id: string;
        title: string;
        raw_content: string;
        storage_path: string;
        trust: string;
      }>(
        "SELECT id, title, raw_content, storage_path, trust FROM sources ORDER BY ingested_at DESC LIMIT $1",
        [limit]
      );
      return NextResponse.json({
        query: "",
        results: recentSources.rows.map((s, idx) => ({
          object_id: s.id,
          object_type: "source",
          source_id: s.id,
          title: s.title,
          snippet: s.raw_content.slice(0, 260),
          rrf_score: Number((1 / (60 + idx + 1)).toFixed(6)),
          citations: [
            {
              source_id: s.id,
              title: s.title,
              storage_path: s.storage_path,
              locator: "line 1",
              claim_text: s.raw_content.slice(0, 160),
            },
          ],
        })),
        citations: recentSources.rows.map((s) => ({
          source_id: s.id,
          title: s.title,
          storage_path: s.storage_path,
          locator: "line 1",
          claim_text: s.raw_content.slice(0, 160),
        })),
      });
    }

    const queryVec = await embedText1536(q);
    const vecParam = isRemotePostgresUrl()
      ? `[${queryVec.join(",")}]`
      : queryVec;
    const vecCast = isRemotePostgresUrl() ? "$2::vector" : "$2::real[]";

    // Hybrid Search: Full-Text Search across (sources + wiki_pages + embeddings)
    // plus pgvector cosine distance (<=>) on embeddings, fused via Reciprocal-Rank Fusion (RRF: k=60)
    const hybridSql = `
      WITH raw_fts AS (
        -- 1. Full-text search on raw sources
        SELECT s.id AS object_id,
               'source'::text AS object_type,
               0 AS chunk_index,
               s.raw_content AS chunk_text,
               s.title AS item_title,
               s.id AS source_id,
               s.storage_path AS source_storage_path,
               (
                 ts_rank_cd(to_tsvector('english', s.raw_content), plainto_tsquery('english', $1))
                 + CASE WHEN s.title ILIKE ('%' || $1 || '%') THEN 0.8 ELSE 0.0 END
                 + CASE WHEN s.raw_content ILIKE ('%' || $1 || '%') THEN 0.5 ELSE 0.0 END
               ) AS fts_score
          FROM sources s
         WHERE to_tsvector('english', s.raw_content) @@ plainto_tsquery('english', $1)
            OR s.title ILIKE ('%' || $1 || '%')
            OR s.raw_content ILIKE ('%' || $1 || '%')

        UNION ALL

        -- 2. Full-text search on wiki markdown bodies
        SELECT w.id AS object_id,
               'wiki_page'::text AS object_type,
               0 AS chunk_index,
               COALESCE(w.markdown_body, w.summary) AS chunk_text,
               w.title AS item_title,
               (SELECT c.source_id FROM claims c WHERE c.wiki_page_id = w.id AND c.source_id IS NOT NULL LIMIT 1) AS source_id,
               w.path AS source_storage_path,
               (
                 ts_rank_cd(to_tsvector('english', COALESCE(w.markdown_body, '')), plainto_tsquery('english', $1))
                 + CASE WHEN w.title ILIKE ('%' || $1 || '%') THEN 0.8 ELSE 0.0 END
                 + CASE WHEN w.markdown_body ILIKE ('%' || $1 || '%') THEN 0.5 ELSE 0.0 END
               ) AS fts_score
          FROM wiki_pages w
         WHERE to_tsvector('english', COALESCE(w.markdown_body, '')) @@ plainto_tsquery('english', $1)
            OR w.title ILIKE ('%' || $1 || '%')
            OR w.markdown_body ILIKE ('%' || $1 || '%')

        UNION ALL

        -- 3. Full-text search on chunked embeddings
        SELECT e.object_id,
               bo.object_type::text AS object_type,
               e.chunk_index,
               e.chunk_text,
               COALESCE(s.title, w.title, a.title, e.object_id::text) AS item_title,
               s.id AS source_id,
               s.storage_path AS source_storage_path,
               (
                 ts_rank_cd(to_tsvector('english', e.chunk_text), plainto_tsquery('english', $1))
                 + CASE WHEN e.chunk_text ILIKE ('%' || $1 || '%') THEN 0.5 ELSE 0.0 END
               ) AS fts_score
          FROM embeddings e
          JOIN brain_objects bo ON bo.id = e.object_id
          LEFT JOIN sources s ON s.id = e.object_id
          LEFT JOIN wiki_pages w ON w.id = e.object_id
          LEFT JOIN artifacts a ON a.id = e.object_id
         WHERE to_tsvector('english', e.chunk_text) @@ plainto_tsquery('english', $1)
            OR e.chunk_text ILIKE ('%' || $1 || '%')
      ),
      fts_ranked AS (
        SELECT object_id,
               object_type,
               chunk_index,
               chunk_text,
               item_title,
               source_id,
               source_storage_path,
               fts_score,
               ROW_NUMBER() OVER (ORDER BY fts_score DESC) AS fts_rank
          FROM raw_fts
         LIMIT 50
      ),
      vec_ranked AS (
        SELECT e.object_id,
               bo.object_type::text AS object_type,
               e.chunk_index,
               e.chunk_text,
               COALESCE(s.title, w.title, a.title, e.object_id::text) AS item_title,
               s.id AS source_id,
               s.storage_path AS source_storage_path,
               (1.0 - (e.embedding <=> ${vecCast})) AS cosine_similarity,
               ROW_NUMBER() OVER (ORDER BY (e.embedding <=> ${vecCast}) ASC) AS vec_rank
          FROM embeddings e
          JOIN brain_objects bo ON bo.id = e.object_id
          LEFT JOIN sources s ON s.id = e.object_id
          LEFT JOIN wiki_pages w ON w.id = e.object_id
          LEFT JOIN artifacts a ON a.id = e.object_id
         LIMIT 50
      ),
      rrf_fused AS (
        SELECT COALESCE(f.object_id, v.object_id) AS object_id,
               COALESCE(f.object_type, v.object_type, 'source') AS object_type,
               COALESCE(f.chunk_index, v.chunk_index, 0) AS chunk_index,
               COALESCE(f.chunk_text, v.chunk_text) AS chunk_text,
               COALESCE(f.item_title, v.item_title) AS item_title,
               COALESCE(f.source_id, v.source_id) AS source_id,
               COALESCE(f.source_storage_path, v.source_storage_path) AS source_storage_path,
               f.fts_rank,
               v.vec_rank,
               COALESCE(v.cosine_similarity, 0) AS cosine_similarity,
               (
                 COALESCE(1.0 / (60.0 + f.fts_rank), 0.0) +
                 COALESCE(1.0 / (60.0 + v.vec_rank), 0.0)
               ) AS rrf_score
          FROM fts_ranked f
          FULL OUTER JOIN vec_ranked v
            ON f.object_id = v.object_id AND f.chunk_index = v.chunk_index
      )
      SELECT r.object_id,
             r.object_type,
             r.chunk_index,
             r.chunk_text,
             r.item_title AS title,
             r.source_id,
             r.source_storage_path,
             r.fts_rank::int AS fts_rank,
             r.vec_rank::int AS vec_rank,
             r.cosine_similarity,
             r.rrf_score
        FROM rrf_fused r
       ORDER BY r.rrf_score DESC
       LIMIT $3
    `;

    const res = await dbQuery<{
      object_id: string;
      object_type: string;
      chunk_index: number;
      chunk_text: string;
      title: string;
      source_id: string | null;
      source_storage_path: string | null;
      fts_rank: number | null;
      vec_rank: number | null;
      cosine_similarity: number;
      rrf_score: number;
    }>(hybridSql, [q, vecParam, limit]);

    // Attach provenance citations (`source_id`, `locator`, `claim_text`) for every hit
    const results = [];
    for (const row of res.rows) {
      let resolvedSourceId = row.source_id;
      const citations: {
        source_id: string;
        claim_text: string;
        locator: string | null;
        title?: string;
        storage_path?: string;
      }[] = [];

      if (row.source_id) {
        const claimsForSource = await dbQuery<{
          source_id: string;
          claim_text: string;
          locator: string | null;
        }>(
          "SELECT source_id, claim_text, locator FROM claims WHERE source_id = $1 LIMIT 5",
          [row.source_id]
        );
        for (const cl of claimsForSource.rows) {
          citations.push({
            ...cl,
            title: row.title,
            storage_path: row.source_storage_path || undefined,
          });
        }
        if (citations.length === 0) {
          citations.push({
            source_id: row.source_id,
            claim_text: row.chunk_text.slice(0, 180),
            locator: "line 1",
            title: row.title,
            storage_path: row.source_storage_path || undefined,
          });
        }
      } else {
        const claimsForObj = await dbQuery<{
          source_id: string | null;
          claim_text: string;
          locator: string | null;
        }>(
          "SELECT source_id, claim_text, locator FROM claims WHERE wiki_page_id = $1 OR artifact_id = $1 LIMIT 5",
          [row.object_id]
        );
        for (const cl of claimsForObj.rows) {
          if (cl.source_id) {
            if (!resolvedSourceId) resolvedSourceId = cl.source_id;
            citations.push({
              source_id: cl.source_id,
              claim_text: cl.claim_text,
              locator: cl.locator,
              title: row.title,
              storage_path: row.source_storage_path || undefined,
            });
          }
        }
      }

      results.push({
        object_id: row.object_id,
        object_type: row.object_type,
        source_id: resolvedSourceId || row.object_id,
        title: row.title,
        snippet: (row.chunk_text || "").slice(0, 320),
        fts_rank: row.fts_rank,
        vec_rank: row.vec_rank,
        cosine_similarity: Number(Number(row.cosine_similarity || 0).toFixed(4)),
        rrf_score: Number(Number(row.rrf_score).toFixed(6)),
        citations,
      });
    }

    const allCitations = results.flatMap((r) => r.citations);

    return NextResponse.json({
      query: q,
      results,
      citations: allCitations,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[GET /api/search] Error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
