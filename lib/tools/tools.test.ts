import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createConfiguredToolRegistry, selectDefaultStudioTool } from "./index.ts";
import { CANONICAL_TOOL_MANIFESTS, ToolPermissions } from "./registry.ts";
import { getCortexRuntime } from "../runtime/cortex-runtime.ts";

describe("Sprint 8 Execution Layer — Tool Registry, GitHub, Filesystem, Docs, Terminal & MainBrain", () => {
  it("registers all 16 canonical tool manifests across github, filesystem, documentation, and terminal", () => {
    const registry = createConfiguredToolRegistry();
    const manifests = registry.listManifests();
    assert.equal(manifests.length, 16);

    const names = new Set(manifests.map((m) => m.name));
    // GitHub tools (6)
    assert.ok(names.has("github.repo_search"));
    assert.ok(names.has("github.file_read"));
    assert.ok(names.has("github.file_write"));
    assert.ok(names.has("github.commit_create"));
    assert.ok(names.has("github.pr_create"));
    assert.ok(names.has("github.branch_manage"));

    // Filesystem tools (5)
    assert.ok(names.has("fs.dir_read"));
    assert.ok(names.has("fs.file_read"));
    assert.ok(names.has("fs.file_write"));
    assert.ok(names.has("fs.file_create"));
    assert.ok(names.has("fs.artifact_export"));

    // Documentation tools (4)
    assert.ok(names.has("docs.markdown_read"));
    assert.ok(names.has("docs.wiki_read"));
    assert.ok(names.has("docs.artifact_read"));
    assert.ok(names.has("docs.openapi_read"));

    // Terminal tool (1)
    assert.ok(names.has("terminal.exec"));
  });

  it("enforces ToolPermissions studio allowlists, path traversal guards, and terminal sandbox rules", () => {
    const perms = new ToolPermissions();
    const commitManifest = CANONICAL_TOOL_MANIFESTS.find(
      (m) => m.name === "github.commit_create"
    );
    const fsWriteManifest = CANONICAL_TOOL_MANIFESTS.find(
      (m) => m.name === "fs.file_write"
    );
    const termManifest = CANONICAL_TOOL_MANIFESTS.find(
      (m) => m.name === "terminal.exec"
    );

    // Design studio is not allowlisted for github.commit_create
    const deniedStudio = perms.evaluate(commitManifest, {
      toolName: "github.commit_create",
      agentId: "design",
      studioId: "design",
      projectId: "proj-test-perms",
      parameters: { message: "unauthorised commit" },
    });
    assert.equal(deniedStudio.allowed, false);
    assert.match(deniedStudio.reason, /not allowlisted/);

    // Path traversal blocked
    const deniedTraversal = perms.evaluate(fsWriteManifest, {
      toolName: "fs.file_write",
      agentId: "design",
      studioId: "design",
      projectId: "proj-test-perms",
      parameters: { path: "../../etc/passwd", content: "bad" },
    });
    assert.equal(deniedTraversal.allowed, false);
    assert.match(deniedTraversal.reason, /Path traversal/);

    // Terminal metacharacter injection blocked
    const deniedInjection = perms.evaluate(termManifest, {
      toolName: "terminal.exec",
      agentId: "development",
      studioId: "development",
      projectId: "proj-test-perms",
      parameters: { command: "git status; rm -rf /" },
    });
    assert.equal(deniedInjection.allowed, false);
    assert.equal(deniedInjection.deniedRule, "shell_metacharacter_injection");

    // Disallowed binary blocked
    const deniedBinary = perms.evaluate(termManifest, {
      toolName: "terminal.exec",
      agentId: "development",
      studioId: "development",
      projectId: "proj-test-perms",
      parameters: { command: "curl http://example.com" },
    });
    assert.equal(deniedBinary.allowed, false);
    assert.equal(deniedBinary.deniedRule, "disallowed_destructive_or_network_binary");
  });

  it("executes real GitHub tools (branch_manage, file_write, commit_create, file_read, repo_search, pr_create)", async () => {
    const registry = createConfiguredToolRegistry();
    const projectId = "proj-test-github";

    const branchRes = await registry.execute({
      toolName: "github.branch_manage",
      agentId: "development",
      studioId: "development",
      projectId,
      parameters: { action: "create", branch: "feat/sprint8-verification" },
    });
    assert.equal(branchRes.record.status, "completed");
    assert.equal(branchRes.record.output.activeBranch, "feat/sprint8-verification");

    const writeRes = await registry.execute({
      toolName: "github.file_write",
      agentId: "development",
      studioId: "development",
      projectId,
      parameters: {
        path: "src/sprint8_engine.ts",
        content: "export const SPRINT8_VERIFIED = 'execution-layer-active';\n",
      },
    });
    assert.equal(writeRes.record.status, "completed");

    const commitRes = await registry.execute({
      toolName: "github.commit_create",
      agentId: "development",
      studioId: "development",
      projectId,
      parameters: {
        message: "feat(sprint8): add real tool execution engine",
      },
    });
    assert.equal(commitRes.record.status, "completed");
    assert.ok(String(commitRes.record.output.commitSha).length >= 7);

    const readRes = await registry.execute({
      toolName: "github.file_read",
      agentId: "development",
      studioId: "development",
      projectId,
      parameters: { path: "src/sprint8_engine.ts" },
    });
    assert.equal(readRes.record.status, "completed");
    assert.match(String(readRes.record.output.content), /execution-layer-active/);

    const searchRes = await registry.execute({
      toolName: "github.repo_search",
      agentId: "architecture",
      studioId: "architecture",
      projectId,
      parameters: { query: "execution-layer-active" },
    });
    assert.equal(searchRes.record.status, "completed");
    assert.ok(Number(searchRes.record.output.matchCount) >= 1);

    const prRes = await registry.execute({
      toolName: "github.pr_create",
      agentId: "development",
      studioId: "development",
      projectId,
      parameters: {
        title: "feat(sprint8): promote verified tool execution",
        sourceBranch: "feat/sprint8-verification",
        targetBranch: "main",
      },
    });
    assert.equal(prRes.record.status, "completed");
    assert.ok(prRes.artifactPayload);
    assert.match(prRes.artifactPayload.title, /Pull Request #/);
  });

  it("executes real Filesystem tools (file_create, file_write, file_read, dir_read, artifact_export)", async () => {
    const registry = createConfiguredToolRegistry();
    const projectId = "proj-test-fs";

    const createRes = await registry.execute({
      toolName: "fs.file_create",
      agentId: "design",
      studioId: "design",
      projectId,
      parameters: {
        path: "design/layout-grid.md",
        content: "# Layout Grid 12/8/4\n",
        overwrite: true,
      },
    });
    assert.equal(createRes.record.status, "completed");

    const writeRes = await registry.execute({
      toolName: "fs.file_write",
      agentId: "design",
      studioId: "design",
      projectId,
      parameters: {
        path: "design/tokens.json",
        content: JSON.stringify({ primary: "#00FFA3" }),
      },
    });
    assert.equal(writeRes.record.status, "completed");

    const readRes = await registry.execute({
      toolName: "fs.file_read",
      agentId: "design",
      studioId: "design",
      projectId,
      parameters: { path: "design/tokens.json" },
    });
    assert.equal(readRes.record.status, "completed");
    assert.match(String(readRes.record.output.content), /#00FFA3/);

    const dirRes = await registry.execute({
      toolName: "fs.dir_read",
      agentId: "design",
      studioId: "design",
      projectId,
      parameters: { path: "design" },
    });
    assert.equal(dirRes.record.status, "completed");
    assert.ok(Number(dirRes.record.output.entryCount) >= 2);

    const exportRes = await registry.execute({
      toolName: "fs.artifact_export",
      agentId: "design",
      studioId: "design",
      projectId,
      parameters: {
        title: "Design System Tokens Export",
        artifactType: "design_system",
        content: "# Design System Export\n\nVerified WCAG 2.1 AA tokens.\n",
      },
    });
    assert.equal(exportRes.record.status, "completed");
    assert.ok(exportRes.artifactPayload);
    assert.match(exportRes.artifactPayload.title, /Design System Tokens Export/);
  });

  it("executes real Documentation tools (markdown_read, openapi_read, wiki_read, artifact_read) and Terminal tool", async () => {
    const registry = createConfiguredToolRegistry();
    const projectId = "proj-solar-crm";

    const mdRes = await registry.execute({
      toolName: "docs.markdown_read",
      agentId: "librarian",
      studioId: "librarian",
      projectId,
      parameters: { path: "README.md" },
    });
    assert.equal(mdRes.record.status, "completed");
    assert.ok(Array.isArray(mdRes.record.output.headings));

    const openapiRes = await registry.execute({
      toolName: "docs.openapi_read",
      agentId: "architecture",
      studioId: "architecture",
      projectId,
      parameters: { service: "studio-service" },
    });
    assert.equal(openapiRes.record.status, "completed");
    assert.equal(openapiRes.record.output.openapiVersion, "3.1.0");

    const wikiRes = await registry.execute({
      toolName: "docs.wiki_read",
      agentId: "librarian",
      studioId: "librarian",
      projectId,
      parameters: { slug: "" },
    });
    assert.equal(wikiRes.record.status, "completed");

    const artReadRes = await registry.execute({
      toolName: "docs.artifact_read",
      agentId: "qa",
      studioId: "qa",
      projectId,
      parameters: { query: "" },
    });
    assert.equal(artReadRes.record.status, "completed");

    const termRes = await registry.execute({
      toolName: "terminal.exec",
      agentId: "qa",
      studioId: "qa",
      projectId,
      parameters: { command: "git status --short" },
    });
    assert.equal(termRes.record.status, "completed");
    assert.equal(termRes.record.output.exitCode, 0);
    assert.equal(termRes.auditEntry.checksum.length, 64);
  });

  it("integrates Tool Execution with MainBrain (Execution Record, Artifact, Knowledge Candidate, Audit Entry)", async () => {
    const runtime = getCortexRuntime();
    const chosen = selectDefaultStudioTool("architecture", "Generate OpenAPI contract for studio-service");
    assert.equal(chosen.toolName, "docs.openapi_read");

    const result = await runtime.executeTool({
      toolName: "fs.artifact_export",
      studioId: "design",
      projectId: "proj-solar-crm",
      parameters: {
        title: "Sprint 8 Verified Wireframe Artifact",
        artifactType: "wireframe",
        content: "# Sprint 8 Wireframe\n\nVerified MainBrain tool integration.\n",
      },
    });

    assert.equal(result.execution.status, "completed");
    assert.ok(result.artifact.id);
    assert.match(result.artifact.title, /Sprint 8 Verified Wireframe Artifact/);
    assert.ok(result.knowledgeCandidate.id);
    assert.match(result.knowledgeCandidate.title, /Knowledge Candidate/);
    assert.ok(result.auditEntry.id);
    assert.equal(result.auditEntry.allowed, true);
    assert.ok(result.snapshot.toolActivityFeed.some((t) => t.id === result.execution.id));
  });
});
