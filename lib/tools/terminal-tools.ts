import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { ensureProjectGitRepository } from "./github-tools.ts";
import type { ToolRegistry } from "./registry.ts";

const execFileAsync = promisify(execFile);

export function registerTerminalTools(registry: ToolRegistry): void {
  registry.bindHandler("terminal.exec", async (req, permission) => {
    await ensureProjectGitRepository(permission.sandboxRoot, req.projectId);
    const commandStr = String(req.parameters.command ?? "git status --short").trim();
    const relWorkdir = String(req.parameters.workdir ?? ".").replace(/^\/+/, "") || ".";
    const cwd = path.resolve(permission.sandboxRoot, relWorkdir);

    const tokens = commandStr.split(/\s+/).filter(Boolean);
    const binary = tokens[0];
    const args = tokens.slice(1);

    const started = Date.now();
    const { stdout, stderr } = await execFileAsync(binary, args, {
      cwd,
      timeout: 5000,
      maxBuffer: 512 * 1024,
      env: {
        NODE_ENV: process.env.NODE_ENV || "development",
        PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
        HOME: permission.sandboxRoot,
        LANG: "C.UTF-8",
        GIT_TERMINAL_PROMPT: "0",
      },
    });
    const elapsedMs = Math.max(1, Date.now() - started);

    const cleanStdout = stdout.trim();
    const cleanStderr = stderr.trim();
    const firstLine = (cleanStdout || cleanStderr || "(exit 0)").split(/\r?\n/)[0].slice(0, 120);
    const resultSummary = `Executed '${commandStr}' in isolated workdir (${elapsedMs}ms) -> ${firstLine}`;

    return {
      inputSummary: `$ ${commandStr} (cwd=${relWorkdir})`,
      resultSummary,
      output: {
        command: commandStr,
        binary,
        args,
        workdir: relWorkdir,
        sandboxRoot: permission.sandboxRoot,
        exitCode: 0,
        elapsedMs,
        stdout: cleanStdout,
        stderr: cleanStderr,
      },
      artifactTitle: `Terminal Execution Log: ${binary} ${args[0] ?? ""}`.trim(),
      artifactType: "deployment",
      artifactMarkdown: [
        `# Sandboxed Terminal Execution Receipt`,
        "",
        `- **Command:** \`$ ${commandStr}\``,
        `- **Isolated Workdir:** \`${cwd}\``,
        `- **Agent / Studio:** \`${req.agentId}\` / \`${req.studioId}\``,
        `- **Duration:** ${elapsedMs}ms`,
        "",
        "## Standard Output",
        "```",
        cleanStdout || "(empty)",
        "```",
        ...(cleanStderr
          ? [
              "",
              "## Standard Error",
              "```",
              cleanStderr,
              "```",
            ]
          : []),
      ].join("\n"),
      knowledgeCandidateTitle: `Terminal Audit: ${commandStr.slice(0, 42)}`,
      knowledgeCandidateSummary: resultSummary,
    };
  });
}
