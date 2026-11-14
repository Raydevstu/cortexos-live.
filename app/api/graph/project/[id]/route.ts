import { NextRequest, NextResponse } from "next/server";
import { dbQuery, toUuid } from "@/lib/db/client";
import { type BrainNode } from "@/lib/knowledge-data";
import { sha256Hex } from "@/lib/cortex-os-data";

function deterministicCoords(id: string, index: number, total: number) {
  const h = sha256Hex(id);
  const angle = (index / Math.max(1, total)) * Math.PI * 2;
  const r = 70 + (parseInt(h.slice(0, 4), 16) % 95);
  const y = (parseInt(h.slice(4, 8), 16) % 140) - 70;
  return {
    x: Number((Math.cos(angle) * r).toFixed(2)),
    y: Number(y.toFixed(2)),
    z: Number((Math.sin(angle) * r).toFixed(2)),
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Fetch EVERY brain_objects row joined to its type table
    const objectsSql = `
      SELECT bo.id,
             bo.object_type::text AS object_type,
             COALESCE(p.name, st.name, ag.name, src.title, art.title, ent.canonical_name, con.name, dec.title, wp.title, bo.id::text) AS title,
             COALESCE(p.description, st.mission, ag.role, src.storage_path, art.summary, ent.description, con.summary, dec.decision, wp.summary, '') AS summary,
             COALESCE(src.raw_content, art.markdown_content, wp.markdown_body, dec.reasoning, ent.description, con.summary, p.description, st.mission, '') AS notes,
             COALESCE(ent.entity_type, con.domain, wp.page_type::text, art.artifact_type, src.kind::text, st.slug, bo.object_type::text) AS subtype
        FROM brain_objects bo
        LEFT JOIN projects p ON p.id = bo.id
        LEFT JOIN studios st ON st.id = bo.id
        LEFT JOIN agents ag ON ag.id = bo.id
        LEFT JOIN sources src ON src.id = bo.id
        LEFT JOIN artifacts art ON art.id = bo.id
        LEFT JOIN entities ent ON ent.id = bo.id AND ent.merged_into_id IS NULL
        LEFT JOIN concepts con ON con.id = bo.id AND con.merged_into_id IS NULL
        LEFT JOIN decisions dec ON dec.id = bo.id
        LEFT JOIN wiki_pages wp ON wp.id = bo.id
       WHERE (ent.id IS NULL OR ent.merged_into_id IS NULL)
         AND (con.id IS NULL OR con.merged_into_id IS NULL)
       ORDER BY bo.created_at ASC
    `;

    const allObjectsRes = await dbQuery<{
      id: string;
      object_type: string;
      title: string;
      summary: string;
      notes: string;
      subtype: string;
    }>(objectsSql);

    // Fetch EVERY active relationship in Postgres
    const allRelsRes = await dbQuery<{
      id: string;
      from_id: string;
      to_id: string;
      edge_type: string;
      confidence: number;
      review_state: string;
      source_id: string | null;
      metadata: Record<string, unknown>;
      created_at: string;
    }>(
      `SELECT id, from_id, to_id, edge_type, confidence, review_state, source_id, metadata, created_at::text
         FROM relationships
        WHERE superseded_at IS NULL
          AND review_state <> 'rejected'
        ORDER BY created_at ASC`
    );

    const adjMap = new Map<string, Set<string>>();
    for (const rel of allRelsRes.rows) {
      if (!adjMap.has(rel.from_id)) adjMap.set(rel.from_id, new Set());
      if (!adjMap.has(rel.to_id)) adjMap.set(rel.to_id, new Set());
      adjMap.get(rel.from_id)!.add(rel.to_id);
      adjMap.get(rel.to_id)!.add(rel.from_id);
    }

    const brainNodes: BrainNode[] = allObjectsRes.rows.map((obj, idx) => {
      const coords = deterministicCoords(
        obj.id,
        idx,
        allObjectsRes.rows.length
      );
      const conns = Array.from(adjMap.get(obj.id) || []);

      // Mapping rules:
      // project→project, source→note, artifact→artifact, entity→entity,
      // concept→concept, wiki_page→note, studio→studio, agent→agent
      let kind: BrainNode["kind"] = "note";
      let category: BrainNode["category"] = "Source";
      let area: BrainNode["area"] = "system";

      switch (obj.object_type) {
        case "project":
          kind = "project";
          category = "Project";
          area = "business";
          break;
        case "source":
          kind = "note";
          category = "Source";
          area = "content";
          break;
        case "artifact":
          kind = "artifact";
          category = "Artifact";
          area = "business";
          break;
        case "entity":
          kind = "entity";
          category = "Entity";
          area = "clients";
          break;
        case "concept":
          kind = "concept";
          category = "Concept";
          area = "content";
          break;
        case "wiki_page":
          kind = "note";
          category = "Wiki Page";
          area = "system";
          break;
        case "studio":
          kind = "studio";
          category = "Studio";
          area = "system";
          break;
        case "agent":
          kind = "agent";
          category = "Studio";
          area = "system";
          break;
        case "decision":
          kind = "artifact";
          category = "Artifact";
          area = "business";
          break;
        default:
          kind = "note";
          category = "Source";
          area = "system";
          break;
      }

      const isAnchor =
        obj.object_type === "project" ||
        obj.object_type === "studio" ||
        obj.object_type === "artifact";

      return {
        id: obj.id,
        title: obj.title,
        category,
        kind,
        area,
        summary: obj.summary || obj.title,
        notes: obj.notes || obj.summary || obj.title,
        stalenessDays: 0,
        needsAttention: false,
        connections: conns,
        tags: [obj.object_type, obj.subtype].filter(Boolean),
        x: coords.x,
        y: coords.y,
        z: coords.z,
        radius: obj.object_type === "project" ? 8.0 : isAnchor ? 6.5 : 4.8,
        isKeyAnchor: isAnchor,
      };
    });

    const edges = allRelsRes.rows.map((r) => ({
      from: r.from_id,
      to: r.to_id,
      edge_type: r.edge_type,
    }));

    return NextResponse.json({
      project_id: id,
      count: brainNodes.length,
      nodes: brainNodes,
      edges,
      relationships: allRelsRes.rows.map((r) => ({
        id: r.id,
        from_id: r.from_id,
        from_label: (r.metadata?.from_label as string) || r.from_id,
        to_id: r.to_id,
        to_label: (r.metadata?.to_label as string) || r.to_id,
        edge_type: r.edge_type,
        confidence: r.confidence,
        source_id: r.source_id || undefined,
        review_state: r.review_state,
        created_at: r.created_at,
      })),
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[GET /api/graph/project/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch project graph" },
      { status: 500 }
    );
  }
}

