import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  ToolAccessMode,
  ToolAuditEntry,
  ToolCategory,
  ToolExecutionRecord,
  ToolExecutionRequest,
  ToolManifest,
  ToolPermissionResult,
} from "../../packages/shared-types/src/index.ts";
import { dbQuery, toUuid } from "../db/client.ts";

export const CANONICAL_TOOL_MANIFESTS: readonly ToolManifest[] = [
  // 1. GitHub Tools (6)
  {
    name: "github.repo_search",
    category: "github",
    accessMode: "read",
    version: "1.0.0",
    description: "Search tracked files, commits, and symbols inside the isolated project git repository.",
    allowedStudios: ["jarvis", "librarian", "discovery", "product", "design", "architecture", "development", "qa", "release"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["query", "pathPrefix"],
  },
  {
    name: "github.file_read",
    category: "github",
    accessMode: "read",
    version: "1.0.0",
    description: "Read file contents and latest git revision metadata from a repository branch or working tree.",
    allowedStudios: ["jarvis", "librarian", "design", "architecture", "development", "qa", "release"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["filePath", "branch"],
  },
  {
    name: "github.file_write",
    category: "github",
    accessMode: "write",
    version: "1.0.0",
    description: "Write and stage a file inside the isolated project git worktree.",
    allowedStudios: ["design", "architecture", "development", "qa"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["filePath", "content"],
  },
  {
    name: "github.commit_create",
    category: "github",
    accessMode: "write",
    version: "1.0.0",
    description: "Stage changes and create a signed/verified git commit in the isolated project repository.",
    allowedStudios: ["architecture", "development", "qa", "release"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["message", "authorName", "authorEmail"],
  },
  {
    name: "github.pr_create",
    category: "github",
    accessMode: "write",
    version: "1.0.0",
    description: "Create a structured Pull Request manifest with diff stats, commit log, and target branch.",
    allowedStudios: ["design", "architecture", "development", "qa", "release"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["title", "sourceBranch", "targetBranch", "description"],
  },
  {
    name: "github.branch_manage",
    category: "github",
    accessMode: "write",
    version: "1.0.0",
    description: "List, create, or checkout branches inside the project git repository.",
    allowedStudios: ["jarvis", "design", "architecture", "development", "qa", "release"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["action", "branchName"],
  },

  // 2. Filesystem Tools (5)
  {
    name: "fs.dir_read",
    category: "filesystem",
    accessMode: "read",
    version: "1.0.0",
    description: "List directory entries, byte sizes, and types inside the isolated project workspace.",
    allowedStudios: ["jarvis", "librarian", "discovery", "product", "design", "architecture", "development", "qa", "release"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["dirPath"],
  },
  {
    name: "fs.file_read",
    category: "filesystem",
    accessMode: "read",
    version: "1.0.0",
    description: "Read UTF-8 file contents and SHA-256 digest from the isolated project workspace.",
    allowedStudios: ["jarvis", "librarian", "discovery", "product", "design", "architecture", "development", "qa", "release"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["filePath"],
  },
  {
    name: "fs.file_write",
    category: "filesystem",
    accessMode: "write",
    version: "1.0.0",
    description: "Write or overwrite a file inside the isolated project workspace.",
    allowedStudios: ["design", "architecture", "development", "qa"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["filePath", "content"],
  },
  {
    name: "fs.file_create",
    category: "filesystem",
    accessMode: "write",
    version: "1.0.0",
    description: "Create a new file inside the isolated project workspace (fails if file already exists unless overwrite=true).",
    allowedStudios: ["design", "architecture", "development", "qa"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["filePath", "content", "overwrite"],
  },
  {
    name: "fs.artifact_export",
    category: "filesystem",
    accessMode: "write",
    version: "1.0.0",
    description: "Export a studio artifact bundle (Markdown + JSON metadata + SHA-256 manifest) to disk.",
    allowedStudios: ["jarvis", "librarian", "discovery", "product", "design", "architecture", "development", "qa", "release"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["title", "artifactType", "content", "exportSubdir"],
  },

  // 3. Documentation Tools (4)
  {
    name: "docs.markdown_read",
    category: "documentation",
    accessMode: "read",
    version: "1.0.0",
    description: "Parse Markdown documents (studio charters, specs, playbooks) into structured sections and links.",
    allowedStudios: ["jarvis", "librarian", "discovery", "product", "design", "architecture", "development", "qa", "release"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["filePath"],
  },
  {
    name: "docs.wiki_read",
    category: "documentation",
    accessMode: "read",
    version: "1.0.0",
    description: "Read and query Chief Librarian LLM Wiki pages and provenance claims from PostgreSQL.",
    allowedStudios: ["jarvis", "librarian", "discovery", "product", "design", "architecture", "development", "qa", "release"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["pathOrQuery", "projectId"],
  },
  {
    name: "docs.artifact_read",
    category: "documentation",
    accessMode: "read",
    version: "1.0.0",
    description: "Inspect persisted Studio Artifacts, versions, checksums, and markdown payloads from PostgreSQL.",
    allowedStudios: ["jarvis", "librarian", "discovery", "product", "design", "architecture", "development", "qa", "release"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["artifactId", "studioSlug"],
  },
  {
    name: "docs.openapi_read",
    category: "documentation",
    accessMode: "read",
    version: "1.0.0",
    description: "Inspect OpenAPI v3 specifications and FastAPI service route contracts across CortexOS services.",
    allowedStudios: ["jarvis", "design", "architecture", "development", "qa", "release"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["serviceName", "specPath"],
  },

  // 4. Terminal Execution (1)
  {
    name: "terminal.exec",
    category: "terminal",
    accessMode: "execute",
    version: "1.0.0",
    description: "Execute allowlisted commands inside an isolated work directory with strict sandbox rules and audit trails.",
    allowedStudios: ["jarvis", "design", "architecture", "development", "qa", "release"],
    requiresSandboxIsolation: true,
    emitsArtifact: true,
    inputFields: ["command", "workdir"],
  },
] as const;

export const ALLOWED_TERMINAL_EXECUTABLES = new Set([
  "git",
  "ls",
  "pwd",
  "cat",
  "head",
  "tail",
  "wc",
  "grep",
  "find",
  "echo",
  "date",
  "uname",
  "node",
  "python3",
  "sha256sum",
]);

const FORBIDDEN_COMMAND_PATTERNS: readonly { pattern: RegExp; rule: string }[] = [
  { pattern: /[;&|`$<>]/, rule: "shell_metacharacter_injection" },
  { pattern: /\.\.\//, rule: "parent_directory_traversal" },
  { pattern: /\b(rm|mv|dd|mkfs|shutdown|reboot|kill|pkill|chmod|chown|sudo|su|curl|wget|nc|netcat|ssh|scp)\b/i, rule: "disallowed_destructive_or_network_binary" },
  { pattern: /\/etc\/(passwd|shadow|hosts)|\/proc\/|\/sys\//i, rule: "restricted_system_path" },
  { pattern: /node\s+(-e|--eval)|python3\s+-c/i, rule: "inline_arbitrary_code_eval_blocked" },
];

export function getSandboxBaseDir(): string {
  const configured = process.env.CORTEX_SANDBOX_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.resolve(process.cwd(), ".cortex-sandbox");
}

export function resolveProjectSandboxRoot(projectId: string): string {
  const safeSlug = (projectId || "proj-solar-crm")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
  const root = path.join(getSandboxBaseDir(), safeSlug || "proj-solar-crm");
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export class ToolPermissions {
  /**
   * Validates studio allowlist, access mode, path traversal boundaries, and terminal sandbox rules.
   */
  evaluate(
    manifest: ToolManifest | undefined,
    req: ToolExecutionRequest
  ): ToolPermissionResult {
    const studioId = (req.studioId || req.agentId || "design").toLowerCase();
    const sandboxRoot = resolveProjectSandboxRoot(req.projectId || "proj-solar-crm");

    if (!manifest) {
      return {
        allowed: false,
        reason: `Tool '${req.toolName}' is not registered in ToolRegistry.`,
        sandboxRoot,
        deniedRule: "unregistered_tool",
      };
    }

    if (!manifest.allowedStudios.includes(studioId)) {
      return {
        allowed: false,
        reason: `Studio '${studioId}' is not allowlisted for tool '${manifest.name}' (allowed: ${manifest.allowedStudios.join(", ")}).`,
        sandboxRoot,
        deniedRule: "studio_not_in_manifest_allowlist",
      };
    }

    // Check any path arguments for traversal escapes
    const pathCandidates = [
      req.parameters.path,
      req.parameters.filePath,
      req.parameters.dirPath,
      req.parameters.specPath,
      req.parameters.workdir,
      req.parameters.pathPrefix,
    ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);

    let resolvedPath: string | undefined;
    for (const rawPath of pathCandidates) {
      if (rawPath.includes("\0") || rawPath.includes("../") || rawPath.startsWith("/etc") || rawPath.startsWith("/root")) {
        return {
          allowed: false,
          reason: `Path traversal or system escape blocked for '${rawPath}'.`,
          sandboxRoot,
          deniedRule: "path_traversal_or_system_escape",
        };
      }

      // Documentation read tools can read read-only monorepo studio/service docs OR project sandbox files
      if (manifest.category === "documentation" && manifest.accessMode === "read") {
        const repoRoot = process.cwd();
        const candidateRepoPath = path.resolve(repoRoot, rawPath.replace(/^\/+/, ""));
        const candidateSandboxPath = path.resolve(sandboxRoot, rawPath.replace(/^\/+/, ""));
        const insideRepo =
          candidateRepoPath === repoRoot ||
          candidateRepoPath.startsWith(repoRoot + path.sep);
        const insideSandbox =
          candidateSandboxPath === sandboxRoot ||
          candidateSandboxPath.startsWith(sandboxRoot + path.sep);
        if (!insideRepo && !insideSandbox) {
          return {
            allowed: false,
            reason: `Documentation path '${rawPath}' escapes both project sandbox and monorepo documentation root.`,
            sandboxRoot,
            deniedRule: "doc_path_escape",
          };
        }
        resolvedPath = fs.existsSync(candidateSandboxPath) ? candidateSandboxPath : candidateRepoPath;
      } else {
        const target = path.resolve(sandboxRoot, rawPath.replace(/^\/+/, ""));
        if (target !== sandboxRoot && !target.startsWith(sandboxRoot + path.sep)) {
          return {
            allowed: false,
            reason: `Resolved path '${target}' escapes isolated project sandbox '${sandboxRoot}'.`,
            sandboxRoot,
            deniedRule: "sandbox_boundary_escape",
          };
        }
        resolvedPath = target;
      }
    }

    // Terminal command sandbox inspection
    if (manifest.category === "terminal") {
      const commandStr = String(req.parameters.command ?? "").trim();
      if (!commandStr) {
        return {
          allowed: false,
          reason: "Terminal execution requires a non-empty command string.",
          sandboxRoot,
          deniedRule: "empty_terminal_command",
        };
      }

      for (const rule of FORBIDDEN_COMMAND_PATTERNS) {
        if (rule.pattern.test(commandStr)) {
          return {
            allowed: false,
            reason: `Command rejected by sandbox rule '${rule.rule}': ${commandStr}`,
            sandboxRoot,
            deniedRule: rule.rule,
          };
        }
      }

      const tokens = commandStr.split(/\s+/).filter(Boolean);
      const binary = tokens[0] || "";
      if (!ALLOWED_TERMINAL_EXECUTABLES.has(binary)) {
        return {
          allowed: false,
          reason: `Executable '${binary}' is not in the sandboxed terminal allowlist (${Array.from(ALLOWED_TERMINAL_EXECUTABLES).join(", ")}).`,
          sandboxRoot,
          deniedRule: "executable_not_allowlisted",
        };
      }

      if (binary === "node" && tokens[1] !== "--version" && tokens[1] !== "-v") {
        return {
          allowed: false,
          reason: "Sandbox allows 'node --version' or '-v' only in direct terminal tool.",
          sandboxRoot,
          deniedRule: "node_subcommand_restricted",
        };
      }
      if (binary === "python3" && tokens[1] !== "--version" && tokens[1] !== "-V") {
        return {
          allowed: false,
          reason: "Sandbox allows 'python3 --version' or '-V' only in direct terminal tool.",
          sandboxRoot,
          deniedRule: "python_subcommand_restricted",
        };
      }
    }

    return {
      allowed: true,
      reason: `Permitted for studio '${studioId}' inside isolated sandbox '${sandboxRoot}'.`,
      sandboxRoot,
      resolvedPath,
    };
  }
}

export class ToolAuditing {
  private entries: ToolAuditEntry[] = [];
  private readonly maxEntries: number;

  constructor(maxEntries = 200) {
    this.maxEntries = maxEntries;
  }

  async record(params: {
    executionId: string;
    toolName: string;
    category: ToolCategory;
    agentId: string;
    studioId: string;
    projectId: string;
    action: string;
    allowed: boolean;
    reason: string;
    details: Record<string, unknown>;
    objectUuid?: string;
  }): Promise<ToolAuditEntry> {
    const timestamp = new Date().toISOString();
    const payloadDigest = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          executionId: params.executionId,
          toolName: params.toolName,
          studioId: params.studioId,
          projectId: params.projectId,
          allowed: params.allowed,
          details: params.details,
          timestamp,
        })
      )
      .digest("hex");

    const entry: ToolAuditEntry = {
      id: `aud-${Date.now()}-${payloadDigest.slice(0, 8)}`,
      executionId: params.executionId,
      toolName: params.toolName,
      category: params.category,
      agentId: params.agentId,
      studioId: params.studioId,
      projectId: params.projectId,
      action: params.action,
      allowed: params.allowed,
      reason: params.reason,
      checksum: payloadDigest,
      timestamp,
      details: params.details,
    };

    this.entries = [entry, ...this.entries].slice(0, this.maxEntries);

    // Persist to PostgreSQL append-only audit_log table
    try {
      const objectId = params.objectUuid ? toUuid(params.objectUuid) : toUuid(params.projectId);
      await dbQuery(
        `INSERT INTO audit_log (actor_type, actor_id, action, object_id, details)
         VALUES ('agent'::actor_type, $1, $2, $3, $4::jsonb)`,
        [
          `${params.studioId}:${params.agentId}`,
          `tool.${params.toolName}`,
          objectId,
          JSON.stringify({
            auditId: entry.id,
            executionId: entry.executionId,
            category: entry.category,
            projectId: entry.projectId,
            allowed: entry.allowed,
            reason: entry.reason,
            checksum: entry.checksum,
            ...entry.details,
          }),
        ]
      );
    } catch {
      // Non-fatal if DB is initializing in unit test isolation
    }

    return entry;
  }

  listEntries(projectId?: string, limit = 50): ToolAuditEntry[] {
    const filtered = projectId
      ? this.entries.filter((e) => e.projectId === projectId)
      : this.entries;
    return filtered.slice(0, limit);
  }
}

export type ToolHandlerFn = (
  req: ToolExecutionRequest,
  permission: ToolPermissionResult,
  manifest: ToolManifest
) => Promise<{
  inputSummary: string;
  resultSummary: string;
  output: Record<string, unknown>;
  artifactTitle: string;
  artifactType: string;
  artifactMarkdown: string;
  knowledgeCandidateTitle: string;
  knowledgeCandidateSummary: string;
}>;

export class ToolExecution {
  private readonly permissions: ToolPermissions;
  private readonly auditing: ToolAuditing;

  constructor(permissions: ToolPermissions, auditing: ToolAuditing) {
    this.permissions = permissions;
    this.auditing = auditing;
  }

  async run(
    manifest: ToolManifest,
    req: ToolExecutionRequest,
    handler: ToolHandlerFn
  ): Promise<{
    record: ToolExecutionRecord;
    auditEntry: ToolAuditEntry;
    artifactPayload?: {
      title: string;
      artifactType: string;
      markdown: string;
      knowledgeTitle: string;
      knowledgeSummary: string;
    };
  }> {
    const startedMs = Date.now();
    const startedAt = new Date(startedMs).toISOString();
    const execId = `texec-${startedMs}-${Math.random().toString(16).slice(2, 8)}`;

    const permission = this.permissions.evaluate(manifest, req);

    if (!permission.allowed) {
      const completedAt = new Date().toISOString();
      const durationMs = Math.max(1, Date.now() - startedMs);
      const auditEntry = await this.auditing.record({
        executionId: execId,
        toolName: manifest.name,
        category: manifest.category,
        agentId: req.agentId,
        studioId: req.studioId,
        projectId: req.projectId,
        action: `tool.denied:${manifest.name}`,
        allowed: false,
        reason: permission.reason,
        details: {
          parameters: req.parameters,
          deniedRule: permission.deniedRule,
        },
      });

      const record: ToolExecutionRecord = {
        id: execId,
        toolName: manifest.name,
        category: manifest.category,
        agentId: req.agentId,
        studioId: req.studioId,
        projectId: req.projectId,
        workRequestId: req.workRequestId,
        workflowId: req.workflowId,
        status: "denied",
        startedAt,
        completedAt,
        durationMs,
        inputSummary: JSON.stringify(req.parameters).slice(0, 140),
        resultSummary: permission.reason,
        output: {
          allowed: false,
          deniedRule: permission.deniedRule,
          reason: permission.reason,
        },
        auditEntryId: auditEntry.id,
        checksum: auditEntry.checksum,
        sandboxRoot: permission.sandboxRoot,
      };

      return { record, auditEntry };
    }

    try {
      const result = await handler(req, permission, manifest);
      const completedAt = new Date().toISOString();
      const durationMs = Math.max(1, Date.now() - startedMs);

      const auditEntry = await this.auditing.record({
        executionId: execId,
        toolName: manifest.name,
        category: manifest.category,
        agentId: req.agentId,
        studioId: req.studioId,
        projectId: req.projectId,
        action: `tool.executed:${manifest.name}`,
        allowed: true,
        reason: permission.reason,
        details: {
          inputSummary: result.inputSummary,
          resultSummary: result.resultSummary,
          durationMs,
        },
      });

      const record: ToolExecutionRecord = {
        id: execId,
        toolName: manifest.name,
        category: manifest.category,
        agentId: req.agentId,
        studioId: req.studioId,
        projectId: req.projectId,
        workRequestId: req.workRequestId,
        workflowId: req.workflowId,
        status: "completed",
        startedAt,
        completedAt,
        durationMs,
        inputSummary: result.inputSummary,
        resultSummary: result.resultSummary,
        output: result.output,
        artifactTitle: result.artifactTitle,
        knowledgeCandidateTitle: result.knowledgeCandidateTitle,
        auditEntryId: auditEntry.id,
        checksum: auditEntry.checksum,
        sandboxRoot: permission.sandboxRoot,
      };

      return {
        record,
        auditEntry,
        artifactPayload: {
          title: result.artifactTitle,
          artifactType: result.artifactType,
          markdown: result.artifactMarkdown,
          knowledgeTitle: result.knowledgeCandidateTitle,
          knowledgeSummary: result.knowledgeCandidateSummary,
        },
      };
    } catch (err) {
      const completedAt = new Date().toISOString();
      const durationMs = Math.max(1, Date.now() - startedMs);
      const errMsg = err instanceof Error ? err.message : String(err);

      const auditEntry = await this.auditing.record({
        executionId: execId,
        toolName: manifest.name,
        category: manifest.category,
        agentId: req.agentId,
        studioId: req.studioId,
        projectId: req.projectId,
        action: `tool.failed:${manifest.name}`,
        allowed: true,
        reason: errMsg,
        details: {
          parameters: req.parameters,
          error: errMsg,
        },
      });

      const record: ToolExecutionRecord = {
        id: execId,
        toolName: manifest.name,
        category: manifest.category,
        agentId: req.agentId,
        studioId: req.studioId,
        projectId: req.projectId,
        workRequestId: req.workRequestId,
        workflowId: req.workflowId,
        status: "failed",
        startedAt,
        completedAt,
        durationMs,
        inputSummary: JSON.stringify(req.parameters).slice(0, 140),
        resultSummary: `Tool execution failed: ${errMsg}`,
        output: { error: errMsg },
        auditEntryId: auditEntry.id,
        checksum: auditEntry.checksum,
        sandboxRoot: permission.sandboxRoot,
      };

      return { record, auditEntry };
    }
  }
}

export class ToolRegistry {
  private readonly manifests = new Map<string, ToolManifest>();
  private readonly handlers = new Map<string, ToolHandlerFn>();
  readonly permissions: ToolPermissions;
  readonly auditing: ToolAuditing;
  readonly executor: ToolExecution;
  private executions: ToolExecutionRecord[] = [];

  constructor() {
    this.permissions = new ToolPermissions();
    this.auditing = new ToolAuditing(200);
    this.executor = new ToolExecution(this.permissions, this.auditing);
    for (const manifest of CANONICAL_TOOL_MANIFESTS) {
      this.manifests.set(manifest.name, manifest);
    }
  }

  registerTool(manifest: ToolManifest, handler: ToolHandlerFn): void {
    this.manifests.set(manifest.name, manifest);
    this.handlers.set(manifest.name, handler);
  }

  bindHandler(toolName: string, handler: ToolHandlerFn): void {
    if (!this.manifests.has(toolName)) {
      throw new Error(`Cannot bind handler for unknown tool '${toolName}'.`);
    }
    this.handlers.set(toolName, handler);
  }

  getManifest(toolName: string): ToolManifest | undefined {
    return this.manifests.get(toolName);
  }

  listManifests(filter?: { studioId?: string; category?: ToolCategory; accessMode?: ToolAccessMode }): ToolManifest[] {
    let items = Array.from(this.manifests.values());
    if (filter?.studioId) {
      const sid = filter.studioId.toLowerCase();
      items = items.filter((m) => m.allowedStudios.includes(sid));
    }
    if (filter?.category) {
      items = items.filter((m) => m.category === filter.category);
    }
    if (filter?.accessMode) {
      items = items.filter((m) => m.accessMode === filter.accessMode);
    }
    return items;
  }

  listExecutions(projectId?: string, limit = 40): ToolExecutionRecord[] {
    const list = projectId
      ? this.executions.filter((e) => e.projectId === projectId)
      : this.executions;
    return list.slice(0, limit);
  }

  recordExecution(record: ToolExecutionRecord): void {
    this.executions = [
      record,
      ...this.executions.filter((e) => e.id !== record.id),
    ].slice(0, 120);
  }

  async execute(req: ToolExecutionRequest): Promise<{
    record: ToolExecutionRecord;
    auditEntry: ToolAuditEntry;
    artifactPayload?: {
      title: string;
      artifactType: string;
      markdown: string;
      knowledgeTitle: string;
      knowledgeSummary: string;
    };
  }> {
    const manifest = this.manifests.get(req.toolName);
    if (!manifest) {
      const dummyManifest: ToolManifest = {
        name: req.toolName,
        category: "filesystem",
        accessMode: "read",
        version: "1.0.0",
        description: "Unregistered tool",
        allowedStudios: [],
        requiresSandboxIsolation: true,
        emitsArtifact: false,
        inputFields: [],
      };
      const out = await this.executor.run(dummyManifest, req, async () => {
        throw new Error(`Tool '${req.toolName}' is not registered.`);
      });
      this.recordExecution(out.record);
      return out;
    }

    const handler = this.handlers.get(req.toolName);
    if (!handler) {
      throw new Error(`No execution handler registered for tool '${req.toolName}'.`);
    }

    const result = await this.executor.run(manifest, req, handler);
    this.recordExecution(result.record);
    return result;
  }
}
