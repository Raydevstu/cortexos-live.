import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ArtifactExecutionExport } from "../../packages/artifact-sdk/src/index.ts";
import { ensureProjectGitRepository } from "./github-tools.ts";
import type { ToolRegistry } from "./registry.ts";

export function registerFilesystemTools(registry: ToolRegistry): void {
  // 1. fs.dir_read
  registry.bindHandler("fs.dir_read", async (req, permission) => {
    await ensureProjectGitRepository(permission.sandboxRoot, req.projectId);
    const relDir = String(req.parameters.dirPath ?? req.parameters.path ?? ".").replace(/^\/+/, "") || ".";
    const targetDir = path.resolve(permission.sandboxRoot, relDir);
    fs.mkdirSync(targetDir, { recursive: true });

    const dirents = fs.readdirSync(targetDir, { withFileTypes: true });
    const entries = dirents
      .filter((d) => d.name !== ".git")
      .map((d) => {
        const full = path.join(targetDir, d.name);
        const stat = fs.statSync(full);
        return {
          name: d.name,
          kind: d.isDirectory() ? "directory" : "file",
          byteSize: d.isFile() ? stat.size : 0,
          updatedAt: stat.mtime.toISOString(),
        };
      });

    const resultSummary = `Listed ${entries.length} entry/entries in workspace directory '${relDir}'.`;
    return {
      inputSummary: `dirPath="${relDir}"`,
      resultSummary,
      output: {
        dirPath: relDir,
        entryCount: entries.length,
        entriesCount: entries.length,
        entries,
      },
      artifactTitle: `Directory Listing: ${relDir}`,
      artifactType: "infrastructure",
      artifactMarkdown: [
        `# Workspace Directory Listing — \`${relDir}\``,
        "",
        `- **Project:** \`${req.projectId}\``,
        `- **Entries:** ${entries.length}`,
        "",
        "| Name | Kind | Size (bytes) |",
        "| --- | --- | --- |",
        ...entries.map((e) => `| \`${e.name}\` | ${e.kind} | ${e.byteSize} |`),
      ].join("\n"),
      knowledgeCandidateTitle: `Workspace Directory Topology: ${relDir}`,
      knowledgeCandidateSummary: resultSummary,
    };
  });

  // 2. fs.file_read
  registry.bindHandler("fs.file_read", async (req, permission) => {
    await ensureProjectGitRepository(permission.sandboxRoot, req.projectId);
    const relFile = String(req.parameters.filePath ?? req.parameters.path ?? "README.md").replace(/^\/+/, "");
    const targetFile = path.resolve(permission.sandboxRoot, relFile);

    if (!fs.existsSync(targetFile) || !fs.statSync(targetFile).isFile()) {
      throw new Error(`File '${relFile}' does not exist in isolated workspace.`);
    }

    const content = fs.readFileSync(targetFile, "utf8");
    const checksum = crypto.createHash("sha256").update(content).digest("hex");
    const byteSize = Buffer.byteLength(content, "utf8");

    const resultSummary = `Read '${relFile}' (${byteSize} bytes, sha256=${checksum.slice(0, 8)}) from project sandbox.`;
    return {
      inputSummary: `filePath="${relFile}"`,
      resultSummary,
      output: {
        filePath: relFile,
        byteSize,
        checksum,
        content,
      },
      artifactTitle: `Workspace File Read: ${relFile}`,
      artifactType: "source_code",
      artifactMarkdown: [
        `# Workspace File Content — \`${relFile}\``,
        "",
        `- **Bytes:** ${byteSize}`,
        `- **SHA-256:** \`${checksum}\``,
        "",
        "```",
        content.slice(0, 2000),
        "```",
      ].join("\n"),
      knowledgeCandidateTitle: `File Read: ${relFile}`,
      knowledgeCandidateSummary: resultSummary,
    };
  });

  // 3. fs.file_write
  registry.bindHandler("fs.file_write", async (req, permission) => {
    await ensureProjectGitRepository(permission.sandboxRoot, req.projectId);
    const relFile = String(
      req.parameters.filePath ?? req.parameters.path ?? `artifacts/${req.studioId}-output.md`
    ).replace(/^\/+/, "");
    const content = String(
      req.parameters.content ?? `# ${req.studioId.toUpperCase()} Output\n\nGenerated at ${new Date().toISOString()}\n`
    );

    const targetFile = path.resolve(permission.sandboxRoot, relFile);
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(targetFile, content, "utf8");

    const checksum = crypto.createHash("sha256").update(content).digest("hex");
    const byteSize = Buffer.byteLength(content, "utf8");

    const resultSummary = `Wrote '${relFile}' (${byteSize} bytes, sha256=${checksum.slice(0, 8)}) to isolated workspace.`;
    return {
      inputSummary: `filePath="${relFile}" (${byteSize} bytes)`,
      resultSummary,
      output: {
        filePath: relFile,
        byteSize,
        checksum,
      },
      artifactTitle: `Workspace File Write: ${relFile}`,
      artifactType: "source_code",
      artifactMarkdown: [
        `# Workspace File Written — \`${relFile}\``,
        "",
        `- **Studio:** \`${req.studioId}\``,
        `- **Bytes:** ${byteSize}`,
        `- **SHA-256:** \`${checksum}\``,
        "",
        "```",
        content.slice(0, 2000),
        "```",
      ].join("\n"),
      knowledgeCandidateTitle: `Workspace File Updated: ${relFile}`,
      knowledgeCandidateSummary: resultSummary,
    };
  });

  // 4. fs.file_create
  registry.bindHandler("fs.file_create", async (req, permission) => {
    await ensureProjectGitRepository(permission.sandboxRoot, req.projectId);
    const relFile = String(
      req.parameters.filePath ?? req.parameters.path ?? `specs/${req.studioId}-${Date.now().toString().slice(-5)}.md`
    ).replace(/^\/+/, "");
    const overwrite = Boolean(req.parameters.overwrite ?? true);
    const content = String(
      req.parameters.content ??
        `# Created by ${req.studioId} Studio\n\nProject: ${req.projectId}\nTimestamp: ${new Date().toISOString()}\n`
    );

    const targetFile = path.resolve(permission.sandboxRoot, relFile);
    if (fs.existsSync(targetFile) && !overwrite) {
      throw new Error(`File '${relFile}' already exists and overwrite=false.`);
    }

    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(targetFile, content, "utf8");
    const checksum = crypto.createHash("sha256").update(content).digest("hex");
    const byteSize = Buffer.byteLength(content, "utf8");

    const resultSummary = `Created file '${relFile}' (${byteSize} bytes, sha256=${checksum.slice(0, 8)}) in project workspace.`;
    return {
      inputSummary: `filePath="${relFile}"`,
      resultSummary,
      output: {
        filePath: relFile,
        byteSize,
        checksum,
        created: true,
      },
      artifactTitle: `Created File: ${relFile}`,
      artifactType: "source_code",
      artifactMarkdown: [
        `# Created Workspace File — \`${relFile}\``,
        "",
        `- **Studio:** \`${req.studioId}\``,
        `- **Bytes:** ${byteSize}`,
        `- **SHA-256:** \`${checksum}\``,
        "",
        "```",
        content.slice(0, 2000),
        "```",
      ].join("\n"),
      knowledgeCandidateTitle: `New Workspace File: ${relFile}`,
      knowledgeCandidateSummary: resultSummary,
    };
  });

  // 5. fs.artifact_export
  registry.bindHandler("fs.artifact_export", async (req, permission) => {
    await ensureProjectGitRepository(permission.sandboxRoot, req.projectId);
    const title = String(req.parameters.title ?? `${req.studioId} Exported Bundle`).trim();
    const artifactType = String(req.parameters.artifactType ?? "design_system").trim();
    const exportSubdir = String(req.parameters.exportSubdir ?? `exports/${req.studioId}`).replace(/^\/+/, "");
    const content = String(
      req.parameters.content ??
        `# ${title}\n\nExported by ${req.studioId} Studio via CortexOS Artifact SDK.\n`
    );

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    const bundleDir = path.resolve(permission.sandboxRoot, exportSubdir);
    fs.mkdirSync(bundleDir, { recursive: true });

    const mdRelPath = path.join(exportSubdir, `${slug || "artifact"}.md`);
    const manifestRelPath = path.join(exportSubdir, `${slug || "artifact"}.manifest.json`);

    const mdFullPath = path.resolve(permission.sandboxRoot, mdRelPath);
    const manifestFullPath = path.resolve(permission.sandboxRoot, manifestRelPath);

    fs.writeFileSync(mdFullPath, content, "utf8");
    const checksum = crypto.createHash("sha256").update(content).digest("hex");
    const byteSize = Buffer.byteLength(content, "utf8");

    const exportReceipt: ArtifactExecutionExport = {
      artifactId: `exp-${Date.now().toString().slice(-6)}`,
      projectId: req.projectId,
      studioId: req.studioId,
      title,
      storagePath: mdRelPath,
      checksum,
      byteSize,
      exportedAt: new Date().toISOString(),
    };
    fs.writeFileSync(manifestFullPath, JSON.stringify(exportReceipt, null, 2), "utf8");

    const resultSummary = `Exported artifact bundle '${mdRelPath}' + manifest (${byteSize} bytes, sha256=${checksum.slice(0, 8)}).`;
    return {
      inputSummary: `title="${title}" -> ${mdRelPath}`,
      resultSummary,
      output: {
        ...exportReceipt,
        manifestPath: manifestRelPath,
      },
      artifactTitle: `Exported Artifact: ${title.slice(0, 42)}`,
      artifactType,
      artifactMarkdown: content,
      knowledgeCandidateTitle: `Artifact Export: ${title.slice(0, 44)}`,
      knowledgeCandidateSummary: resultSummary,
    };
  });
}
