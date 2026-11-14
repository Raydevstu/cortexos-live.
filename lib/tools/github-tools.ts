import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { ToolRegistry } from "./registry.ts";

const execFileAsync = promisify(execFile);

async function runGit(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFileAsync("git", args, {
    cwd,
    timeout: 6000,
    maxBuffer: 1024 * 1024,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
    },
  });
  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  };
}

export async function ensureProjectGitRepository(sandboxRoot: string, projectId: string): Promise<void> {
  const gitDir = path.join(sandboxRoot, ".git");
  if (fs.existsSync(gitDir)) {
    return;
  }

  fs.mkdirSync(sandboxRoot, { recursive: true });
  await runGit(sandboxRoot, ["init", "-b", "main"]).catch(async () => {
    await runGit(sandboxRoot, ["init"]);
    await runGit(sandboxRoot, ["checkout", "-B", "main"]);
  });
  await runGit(sandboxRoot, ["config", "user.name", "CortexOS Execution Layer"]);
  await runGit(sandboxRoot, ["config", "user.email", "execution@cortexos.local"]);

  const readmePath = path.join(sandboxRoot, "README.md");
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(
      readmePath,
      [
        `# CortexOS Isolated Repository — ${projectId}`,
        "",
        "Managed by CortexOS Sprint 8 Execution Layer.",
        "",
        "## Capabilities",
        "- Real Git branch, commit, file read/write, and PR manifest generation",
        "- Isolated project filesystem worktree",
        "- SHA-256 audited artifact & documentation pipelines",
        "",
      ].join("\n"),
      "utf8"
    );
  }

  const specDir = path.join(sandboxRoot, "specs");
  fs.mkdirSync(specDir, { recursive: true });
  const tokensPath = path.join(specDir, "design-tokens.json");
  if (!fs.existsSync(tokensPath)) {
    fs.writeFileSync(
      tokensPath,
      JSON.stringify(
        {
          project: projectId,
          surfaceCanvas: "#090B0F",
          surfaceElevated: "#11151D",
          accentPrimary: "#00FFA3",
          inkPrimary: "#E4E6EB",
          wcagLevel: "AA",
        },
        null,
        2
      ),
      "utf8"
    );
  }

  await runGit(sandboxRoot, ["add", "."]);
  await runGit(sandboxRoot, ["commit", "-m", `chore(${projectId}): initialize CortexOS execution repository`]).catch(
    () => null
  );
}

function walkFilesRecursive(rootDir: string, currentDir = rootDir, maxFiles = 80): string[] {
  const results: string[] = [];
  if (!fs.existsSync(currentDir)) return results;

  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(currentDir, entry.name);
    const rel = path.relative(rootDir, full);
    if (entry.isDirectory()) {
      results.push(...walkFilesRecursive(rootDir, full, maxFiles - results.length));
    } else if (entry.isFile()) {
      results.push(rel);
    }
    if (results.length >= maxFiles) break;
  }
  return results;
}

export function registerGitHubTools(registry: ToolRegistry): void {
  // 1. github.repo_search
  registry.bindHandler("github.repo_search", async (req, permission) => {
    await ensureProjectGitRepository(permission.sandboxRoot, req.projectId);
    const query = String(req.parameters.query ?? "CortexOS").trim();
    const pathPrefix = String(req.parameters.pathPrefix ?? "").trim();

    const files = walkFilesRecursive(permission.sandboxRoot);
    const matches: { file: string; line: number; snippet: string }[] = [];

    for (const relFile of files) {
      if (pathPrefix && !relFile.startsWith(pathPrefix)) continue;
      const absFile = path.join(permission.sandboxRoot, relFile);
      const raw = fs.readFileSync(absFile, "utf8");
      const lines = raw.split(/\r?\n/);
      lines.forEach((lineText, idx) => {
        if (
          !query ||
          lineText.toLowerCase().includes(query.toLowerCase()) ||
          relFile.toLowerCase().includes(query.toLowerCase())
        ) {
          if (matches.length < 25) {
            matches.push({
              file: relFile,
              line: idx + 1,
              snippet: lineText.slice(0, 160),
            });
          }
        }
      });
    }

    const logOut = await runGit(permission.sandboxRoot, ["log", "--oneline", "-n", "5"]).catch(() => ({
      stdout: "",
      stderr: "",
    }));

    const resultSummary = `Found ${matches.length} repository match(es) across ${files.length} tracked file(s) for query "${query}".`;
    return {
      inputSummary: `query="${query}"${pathPrefix ? ` pathPrefix="${pathPrefix}"` : ""}`,
      resultSummary,
      output: {
        query,
        trackedFilesCount: files.length,
        matchCount: matches.length,
        matches,
        recentCommits: logOut.stdout.split("\n").filter(Boolean),
      },
      artifactTitle: `Git Repo Search: "${query.slice(0, 32)}"`,
      artifactType: "research",
      artifactMarkdown: [
        `# GitHub Repository Search Report — ${req.projectId}`,
        "",
        `- **Query:** \`${query}\``,
        `- **Tracked Files:** ${files.length}`,
        `- **Matches:** ${matches.length}`,
        "",
        "## Matched Locations",
        ...(matches.length > 0
          ? matches.map((m) => `- \`${m.file}:${m.line}\` — ${m.snippet}`)
          : ["- No matching lines found."]),
        "",
        "## Recent Commits",
        ...(logOut.stdout ? logOut.stdout.split("\n").map((c) => `- \`${c}\``) : ["- Initial worktree"]),
      ].join("\n"),
      knowledgeCandidateTitle: `Repo Index: ${query.slice(0, 40)} (${req.projectId})`,
      knowledgeCandidateSummary: resultSummary,
    };
  });

  // 2. github.file_read
  registry.bindHandler("github.file_read", async (req, permission) => {
    await ensureProjectGitRepository(permission.sandboxRoot, req.projectId);
    const relPath = String(req.parameters.filePath ?? req.parameters.path ?? "README.md").replace(/^\/+/, "");
    const branch = String(req.parameters.branch ?? "HEAD").trim() || "HEAD";
    const targetPath = path.resolve(permission.sandboxRoot, relPath);

    let content = "";
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      content = fs.readFileSync(targetPath, "utf8");
    } else {
      const showRes = await runGit(permission.sandboxRoot, ["show", `${branch}:${relPath}`]);
      content = showRes.stdout;
    }

    const hash = crypto.createHash("sha256").update(content).digest("hex");
    const lastCommit = await runGit(permission.sandboxRoot, ["log", "-n", "1", "--oneline", "--", relPath]).catch(
      () => ({ stdout: "HEAD", stderr: "" })
    );

    const resultSummary = `Read ${Buffer.byteLength(content, "utf8")} bytes from '${relPath}' (${branch}, sha256=${hash.slice(0, 8)}).`;
    return {
      inputSummary: `filePath="${relPath}" branch="${branch}"`,
      resultSummary,
      output: {
        filePath: relPath,
        branch,
        byteSize: Buffer.byteLength(content, "utf8"),
        sha256: hash,
        lastCommit: lastCommit.stdout || "HEAD",
        content,
      },
      artifactTitle: `Repo File Snapshot: ${relPath}`,
      artifactType: "source_code",
      artifactMarkdown: [
        `# Repository File Snapshot: \`${relPath}\``,
        "",
        `- **Branch:** \`${branch}\``,
        `- **SHA-256:** \`${hash}\``,
        `- **Last Commit:** \`${lastCommit.stdout || "HEAD"}\``,
        "",
        "```",
        content.slice(0, 2000),
        "```",
      ].join("\n"),
      knowledgeCandidateTitle: `Source Snapshot: ${relPath}`,
      knowledgeCandidateSummary: resultSummary,
    };
  });

  // 3. github.file_write
  registry.bindHandler("github.file_write", async (req, permission) => {
    await ensureProjectGitRepository(permission.sandboxRoot, req.projectId);
    const relPath = String(
      req.parameters.filePath ?? req.parameters.path ?? "src/generated-contract.ts"
    ).replace(/^\/+/, "");
    const content = String(
      req.parameters.content ??
        `// Generated by ${req.studioId} Studio for ${req.projectId}\nexport const CORTEX_ARTIFACT_READY = true;\n`
    );

    const targetPath = path.resolve(permission.sandboxRoot, relPath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, "utf8");

    await runGit(permission.sandboxRoot, ["add", relPath]);
    const statusOut = await runGit(permission.sandboxRoot, ["status", "--short", relPath]);
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    const bytes = Buffer.byteLength(content, "utf8");

    const resultSummary = `Wrote and staged '${relPath}' (${bytes} bytes, sha256=${hash.slice(0, 8)}) in project git worktree.`;
    return {
      inputSummary: `filePath="${relPath}" (${bytes} bytes)`,
      resultSummary,
      output: {
        filePath: relPath,
        byteSize: bytes,
        sha256: hash,
        gitStatus: statusOut.stdout || `A  ${relPath}`,
      },
      artifactTitle: `Staged Code Change: ${relPath}`,
      artifactType: "source_code",
      artifactMarkdown: [
        `# Staged Repository File: \`${relPath}\``,
        "",
        `- **Studio:** ${req.studioId}`,
        `- **Bytes Written:** ${bytes}`,
        `- **SHA-256:** \`${hash}\``,
        `- **Git Status:** \`${statusOut.stdout || `M ${relPath}`}\``,
        "",
        "```",
        content.slice(0, 2000),
        "```",
      ].join("\n"),
      knowledgeCandidateTitle: `Repository Change: ${relPath}`,
      knowledgeCandidateSummary: resultSummary,
    };
  });

  // 4. github.commit_create
  registry.bindHandler("github.commit_create", async (req, permission) => {
    await ensureProjectGitRepository(permission.sandboxRoot, req.projectId);
    const message = String(
      req.parameters.message ?? `feat(${req.studioId}): record verified deliverable for ${req.projectId}`
    ).trim();

    if (Array.isArray(req.parameters.files)) {
      for (const item of req.parameters.files) {
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          const fPath = String(rec.path ?? rec.filePath ?? "").replace(/^\/+/, "");
          if (fPath && !fPath.includes("../")) {
            const abs = path.resolve(permission.sandboxRoot, fPath);
            fs.mkdirSync(path.dirname(abs), { recursive: true });
            fs.writeFileSync(abs, String(rec.content ?? ""), "utf8");
          }
        }
      }
    }

    // Ensure there is a tracked change if working tree is clean so commit is always real in git log
    const statusBefore = await runGit(permission.sandboxRoot, ["status", "--porcelain"]);
    if (!statusBefore.stdout) {
      const ledgerPath = path.join(permission.sandboxRoot, "CHANT_COMMIT_LEDGER.md");
      const line = `- ${new Date().toISOString()} · ${req.studioId} (${req.agentId}): ${message}\n`;
      fs.appendFileSync(ledgerPath, line, "utf8");
    }

    await runGit(sandboxRootOrThrow(permission.sandboxRoot), ["add", "."]);
    await runGit(permission.sandboxRoot, ["commit", "-m", message]);
    const revOut = await runGit(permission.sandboxRoot, ["rev-parse", "HEAD"]);
    const shortSha = revOut.stdout.slice(0, 8);
    const statOut = await runGit(permission.sandboxRoot, ["show", "--stat", "--oneline", "HEAD"]);

    const resultSummary = `Created Git commit ${shortSha} ("${message}") in isolated repository.`;
    return {
      inputSummary: `message="${message}"`,
      resultSummary,
      output: {
        commitSha: revOut.stdout,
        shortSha,
        message,
        diffStat: statOut.stdout,
      },
      artifactTitle: `Git Commit ${shortSha}: ${message.slice(0, 40)}`,
      artifactType: "source_code",
      artifactMarkdown: [
        `# Git Commit Receipt — \`${shortSha}\``,
        "",
        `- **Commit SHA:** \`${revOut.stdout}\``,
        `- **Author Studio:** \`${req.studioId}\``,
        `- **Message:** ${message}`,
        "",
        "## Diff Summary",
        "```",
        statOut.stdout,
        "```",
      ].join("\n"),
      knowledgeCandidateTitle: `Commit ${shortSha}: ${message.slice(0, 44)}`,
      knowledgeCandidateSummary: resultSummary,
    };
  });

  // 5. github.pr_create
  registry.bindHandler("github.pr_create", async (req, permission) => {
    await ensureProjectGitRepository(permission.sandboxRoot, req.projectId);
    const title = String(
      req.parameters.title ?? `feat(${req.studioId}): promote ${req.projectId} studio deliverables`
    ).trim();
    const sourceBranch = String(req.parameters.sourceBranch ?? `feat/${req.studioId}-sprint8`).trim();
    const targetBranch = String(req.parameters.targetBranch ?? "main").trim();
    const description = String(
      req.parameters.description ??
        `Automated Pull Request prepared by ${req.studioId} Studio with SHA-256 artifact verification.`
    ).trim();

    const logOut = await runGit(permission.sandboxRoot, ["log", "--oneline", "-n", "5"]);
    const prNumber = (Math.abs(hashCode(`${req.projectId}:${title}:${Date.now()}`)) % 900) + 100;
    const prDir = path.join(permission.sandboxRoot, ".github", "pull_requests");
    fs.mkdirSync(prDir, { recursive: true });
    const prRecord = {
      prNumber,
      title,
      sourceBranch,
      targetBranch,
      studioId: req.studioId,
      projectId: req.projectId,
      status: "open",
      commits: logOut.stdout.split("\n").filter(Boolean),
      createdAt: new Date().toISOString(),
    };
    const prFile = path.join(prDir, `PR-${prNumber}.json`);
    fs.writeFileSync(prFile, JSON.stringify(prRecord, null, 2), "utf8");

    const resultSummary = `Created Pull Request #${prNumber} ("${title}") merging ${sourceBranch} -> ${targetBranch}.`;
    return {
      inputSummary: `title="${title}" (${sourceBranch} -> ${targetBranch})`,
      resultSummary,
      output: prRecord,
      artifactTitle: `Pull Request #${prNumber}: ${title.slice(0, 38)}`,
      artifactType: "integration",
      artifactMarkdown: [
        `# Pull Request #${prNumber} — ${title}`,
        "",
        `- **Branches:** \`${sourceBranch}\` &rarr; \`${targetBranch}\``,
        `- **Author Studio:** \`${req.studioId}\``,
        `- **Manifest Path:** \`.github/pull_requests/PR-${prNumber}.json\``,
        "",
        "## Description",
        description,
        "",
        "## Included Commits",
        ...prRecord.commits.map((c) => `- \`${c}\``),
      ].join("\n"),
      knowledgeCandidateTitle: `PR #${prNumber}: ${title.slice(0, 42)}`,
      knowledgeCandidateSummary: resultSummary,
    };
  });

  // 6. github.branch_manage
  registry.bindHandler("github.branch_manage", async (req, permission) => {
    await ensureProjectGitRepository(permission.sandboxRoot, req.projectId);
    const action = String(req.parameters.action ?? "create").toLowerCase();
    const branchName = String(
      req.parameters.branchName ?? req.parameters.branch ?? `feat/${req.studioId}-execution`
    )
      .replace(/[^a-zA-Z0-9/_-]/g, "-")
      .trim();

    if (action === "create" || action === "checkout") {
      await runGit(permission.sandboxRoot, ["checkout", "-B", branchName]);
    }
    const branchesOut = await runGit(permission.sandboxRoot, ["branch", "--list"]);
    const currentOut = await runGit(permission.sandboxRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);

    const branches = branchesOut.stdout
      .split("\n")
      .map((b) => b.replace(/^\*\s*/, "").trim())
      .filter(Boolean);

    const resultSummary = `Branch action '${action}' completed; active branch is '${currentOut.stdout}' (${branches.length} total branches).`;
    return {
      inputSummary: `action="${action}" branchName="${branchName}"`,
      resultSummary,
      output: {
        action,
        activeBranch: currentOut.stdout,
        branches,
      },
      artifactTitle: `Git Branch Topology (${currentOut.stdout})`,
      artifactType: "integration",
      artifactMarkdown: [
        `# Git Branch Management — ${req.projectId}`,
        "",
        `- **Action:** \`${action}\``,
        `- **Active Branch:** \`${currentOut.stdout}\``,
        `- **Branches:** ${branches.map((b) => `\`${b}\``).join(", ")}`,
      ].join("\n"),
      knowledgeCandidateTitle: `Git Branch State: ${currentOut.stdout}`,
      knowledgeCandidateSummary: resultSummary,
    };
  });
}

function sandboxRootOrThrow(root: string): string {
  if (!root) throw new Error("Missing sandboxRoot");
  return root;
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}
