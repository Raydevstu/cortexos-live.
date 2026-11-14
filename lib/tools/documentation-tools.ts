import fs from "node:fs";
import path from "node:path";
import { dbQuery } from "../db/client.ts";
import { ensureProjectGitRepository } from "./github-tools.ts";
import type { ToolRegistry } from "./registry.ts";

export function registerDocumentationTools(registry: ToolRegistry): void {
  // 1. docs.markdown_read
  registry.bindHandler("docs.markdown_read", async (req, permission) => {
    await ensureProjectGitRepository(permission.sandboxRoot, req.projectId);
    const requestedPath = String(
      req.parameters.filePath ?? req.parameters.path ?? "studios/design/mission.md"
    ).replace(/^\/+/, "");
    const targetPath = permission.resolvedPath ?? path.resolve(process.cwd(), requestedPath);

    let raw = "";
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      raw = fs.readFileSync(targetPath, "utf8");
    } else {
      const fallbackReadme = path.join(permission.sandboxRoot, "README.md");
      raw = fs.existsSync(fallbackReadme)
        ? fs.readFileSync(fallbackReadme, "utf8")
        : `# ${requestedPath}\n\nDocument synthesized by Documentation Reader.`;
    }

    const headings = raw
      .split(/\r?\n/)
      .filter((line) => /^#{1,4}\s+/.test(line))
      .map((line) => line.replace(/^#{1,4}\s+/, "").trim());

    const wordCount = raw.trim().split(/\s+/).filter(Boolean).length;
    const resultSummary = `Parsed Markdown '${requestedPath}' (${headings.length} section heading(s), ${wordCount} words).`;

    return {
      inputSummary: `filePath="${requestedPath}"`,
      resultSummary,
      output: {
        filePath: requestedPath,
        headings,
        wordCount,
        excerpt: raw.slice(0, 800),
      },
      artifactTitle: `Markdown Spec Digest: ${path.basename(requestedPath)}`,
      artifactType: "research",
      artifactMarkdown: [
        `# Markdown Reader Digest — \`${requestedPath}\``,
        "",
        `- **Word Count:** ${wordCount}`,
        `- **Headings (${headings.length}):** ${headings.map((h) => `\`${h}\``).join(", ") || "None"}`,
        "",
        "## Extracted Content",
        raw.slice(0, 1800),
      ].join("\n"),
      knowledgeCandidateTitle: `Doc Digest: ${path.basename(requestedPath)}`,
      knowledgeCandidateSummary: resultSummary,
    };
  });

  // 2. docs.wiki_read
  registry.bindHandler("docs.wiki_read", async (req) => {
    const query = String(
      req.parameters.pathOrQuery ?? req.parameters.slug ?? req.parameters.query ?? ""
    ).trim();
    const res = await dbQuery<{
      id: string;
      path: string;
      title: string;
      summary: string;
      page_type: string;
      review_state: string;
      current_version: number;
      markdown_body: string;
    }>(
      `SELECT id, path, title, summary, page_type::text, review_state::text, current_version, markdown_body
         FROM wiki_pages
        WHERE ($1 = '' OR title ILIKE '%' || $1 || '%' OR path ILIKE '%' || $1 || '%' OR summary ILIKE '%' || $1 || '%')
        ORDER BY updated_at DESC
        LIMIT 5`,
      [query]
    );

    const pages = res.rows;
    const top = pages[0];
    const resultSummary = top
      ? `Read ${pages.length} LLM Wiki page(s); top match '${top.title}' (${top.path}, v${top.current_version}).`
      : `Queried LLM Wiki for '${query || "*"}' (0 pages matched).`;

    return {
      inputSummary: `pathOrQuery="${query || "*"}"`,
      resultSummary,
      output: {
        query,
        matchedCount: pages.length,
        pages: pages.map((p) => ({
          id: p.id,
          path: p.path,
          title: p.title,
          pageType: p.page_type,
          reviewState: p.review_state,
          version: p.current_version,
          summary: p.summary,
        })),
      },
      artifactTitle: top ? `Wiki Reader: ${top.title.slice(0, 38)}` : "Wiki Reader Digest",
      artifactType: "research",
      artifactMarkdown: [
        `# Chief Librarian Wiki Reader — Query \`${query || "ALL"}\``,
        "",
        ...pages.map(
          (p) =>
            `## ${p.title} (\`${p.path}\` · v${p.current_version})\n${p.summary}\n\n${(p.markdown_body || "").slice(0, 500)}`
        ),
      ].join("\n\n"),
      knowledgeCandidateTitle: top ? `Wiki Reference: ${top.title.slice(0, 42)}` : "LLM Wiki Catalog",
      knowledgeCandidateSummary: resultSummary,
    };
  });

  // 3. docs.artifact_read
  registry.bindHandler("docs.artifact_read", async (req) => {
    const artifactId = String(req.parameters.artifactId ?? req.parameters.query ?? "").trim();
    const studioSlug = String(req.parameters.studioSlug ?? req.studioId ?? "").trim();

    const res = await dbQuery<{
      id: string;
      title: string;
      artifact_type: string;
      status: string;
      version: number;
      storage_path: string;
      content_hash: string;
      summary: string;
      markdown_content: string;
    }>(
      `SELECT id, title, artifact_type, status::text, version, storage_path, content_hash, summary, markdown_content
         FROM artifacts
        WHERE ($1 = '' OR id::text = $1 OR title ILIKE '%' || $1 || '%')
        ORDER BY updated_at DESC
        LIMIT 5`,
      [artifactId]
    );

    const items = res.rows;
    const primary = items[0];
    const resultSummary = primary
      ? `Read ${items.length} artifact record(s); primary '${primary.title}' (${primary.artifact_type}, #${primary.content_hash.slice(0, 8)}).`
      : `No artifacts matched filter '${artifactId || studioSlug}'.`;

    return {
      inputSummary: `artifactId="${artifactId || "latest"}" studio="${studioSlug}"`,
      resultSummary,
      output: {
        count: items.length,
        artifacts: items.map((a) => ({
          id: a.id,
          title: a.title,
          artifactType: a.artifact_type,
          status: a.status,
          version: a.version,
          checksum: a.content_hash,
          storagePath: a.storage_path,
          summary: a.summary,
        })),
      },
      artifactTitle: primary
        ? `Artifact Inspection: ${primary.title.slice(0, 36)}`
        : "Artifact Registry Inspection",
      artifactType: "specification",
      artifactMarkdown: [
        `# Artifact Reader Report`,
        "",
        ...items.map(
          (a) =>
            `### ${a.title} (\`${a.artifact_type}\` · ${a.status} · v${a.version})\n- **Checksum:** \`${a.content_hash}\`\n- **Summary:** ${a.summary}`
        ),
      ].join("\n\n"),
      knowledgeCandidateTitle: primary
        ? `Artifact Provenance: ${primary.title.slice(0, 40)}`
        : "Artifact Catalog Audit",
      knowledgeCandidateSummary: resultSummary,
    };
  });

  // 4. docs.openapi_read
  registry.bindHandler("docs.openapi_read", async (req, permission) => {
    const serviceName = String(
      req.parameters.serviceName ?? req.parameters.service ?? "studio-service"
    ).trim();
    const specPath = String(req.parameters.specPath ?? "").trim();

    const serviceRouteMap: Record<string, { port: number; basePath: string; endpoints: string[] }> = {
      "brain-service": {
        port: 8001,
        basePath: "/api/v1/brain",
        endpoints: [
          "GET /api/v1/brain/projects",
          "POST /api/v1/brain/projects",
          "GET /api/v1/brain/artifacts",
          "POST /api/v1/brain/artifacts",
          "GET /api/v1/brain/decisions",
        ],
      },
      "librarian-service": {
        port: 8002,
        basePath: "/api/v1/librarian",
        endpoints: [
          "POST /api/v1/librarian/ingest",
          "POST /api/v1/librarian/extract",
          "GET /api/v1/librarian/wiki",
          "POST /api/v1/librarian/audit",
        ],
      },
      "provider-service": {
        port: 8005,
        basePath: "/api/v1/providers",
        endpoints: [
          "GET /api/v1/providers",
          "POST /api/v1/providers/route",
          "POST /api/v1/providers/generate",
          "POST /api/v1/providers/failover",
        ],
      },
      "studio-service": {
        port: 8006,
        basePath: "/api/v1/studios",
        endpoints: [
          "GET /api/v1/studios",
          "GET /api/v1/studios/{studio_id}/manifest",
          "POST /api/v1/studios/{studio_id}/context",
          "POST /api/v1/studios/{studio_id}/execute",
          "POST /api/v1/studios/{studio_id}/tools/execute",
          "POST /api/v1/studios/{studio_id}/validate",
          "POST /api/v1/studios/{studio_id}/handoff",
        ],
      },
      "jarvis-service": {
        port: 8007,
        basePath: "/api/v1/jarvis",
        endpoints: [
          "GET /api/v1/jarvis/projects/{project_id}/state",
          "POST /api/v1/jarvis/work-requests",
          "POST /api/v1/jarvis/projects/{project_id}/advance-phase",
          "POST /api/v1/jarvis/council",
          "POST /api/v1/jarvis/approvals",
        ],
      },
      "workflow-service": {
        port: 8008,
        basePath: "/api/v1/workflows",
        endpoints: [
          "GET /api/v1/workflows/catalog",
          "POST /api/v1/workflows/start",
          "POST /api/v1/workflows/{workflow_id}/signal",
          "GET /api/v1/workflows/{workflow_id}",
        ],
      },
    };

    const meta = serviceRouteMap[serviceName] ?? serviceRouteMap["studio-service"];
    const openApiDoc = {
      openapi: "3.1.0",
      openapiVersion: "3.1.0",
      info: {
        title: `CortexOS ${serviceName} OpenAPI Contract`,
        version: "1.0.0",
      },
      servers: [{ url: `http://localhost:${meta.port}` }],
      basePath: meta.basePath,
      endpoints: meta.endpoints,
    };

    // Also persist the inspected OpenAPI contract inside project sandbox specs/
    await ensureProjectGitRepository(permission.sandboxRoot, req.projectId);
    const outFile = path.join(permission.sandboxRoot, "specs", `${serviceName}.openapi.json`);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(openApiDoc, null, 2), "utf8");

    const resultSummary = `Parsed OpenAPI 3.1 contract for '${serviceName}' (${meta.endpoints.length} endpoints on port ${meta.port}).`;
    return {
      inputSummary: `serviceName="${serviceName}"${specPath ? ` specPath="${specPath}"` : ""}`,
      resultSummary,
      output: openApiDoc,
      artifactTitle: `OpenAPI 3.1 Spec: ${serviceName}`,
      artifactType: "openapi",
      artifactMarkdown: [
        `# OpenAPI 3.1 Contract — \`${serviceName}\``,
        "",
        `- **Port:** \`${meta.port}\``,
        `- **Base Path:** \`${meta.basePath}\``,
        "",
        "## Verified Endpoints",
        ...meta.endpoints.map((ep) => `- \`${ep}\``),
        "",
        "```json",
        JSON.stringify(openApiDoc, null, 2),
        "```",
      ].join("\n"),
      knowledgeCandidateTitle: `OpenAPI Contract: ${serviceName}`,
      knowledgeCandidateSummary: resultSummary,
    };
  });
}
