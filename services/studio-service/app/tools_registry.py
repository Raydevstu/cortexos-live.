from __future__ import annotations

import hashlib
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from cortexos_types import (
     StudioManifest,
    ToolAccessMode,
    ToolAuditEntry,
    ToolCategory,
    ToolExecutionRecord,
    ToolExecutionRequest,
    ToolExecutionStatus,
    ToolManifestSpec,
    ToolPermissionResult,
)

DISALLOWED_COMMAND_REGEX = re.compile(
    r"[;&|`$<>]|\.\./|\b(rm|mv|dd|mkfs|shutdown|reboot|kill|pkill|chmod|chown|sudo|su|curl|wget|nc|ssh|scp)\b|/etc/(passwd|shadow)",
    re.IGNORECASE,
)

ALLOWED_TERMINAL_BINARIES = frozenset(
    {
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
        "python3",
        "node",
        "sha256sum",
    }
)

CANONICAL_PYTHON_TOOL_MANIFESTS: tuple[ToolManifestSpec, ...] = (
    ToolManifestSpec(
        name="github.repo_search",
        category=ToolCategory.GITHUB,
        access_mode=ToolAccessMode.READ,
        description="Search tracked files, commits, and symbols inside the isolated project git repository.",
        allowed_studios=["jarvis", "librarian", "discovery", "product", "design", "architecture", "development", "qa", "release"],
        input_fields=["query", "pathPrefix"],
    ),
    ToolManifestSpec(
        name="github.file_read",
        category=ToolCategory.GITHUB,
        access_mode=ToolAccessMode.READ,
        description="Read file contents and latest git revision metadata from a repository branch or working tree.",
        allowed_studios=["jarvis", "librarian", "design", "architecture", "development", "qa", "release"],
        input_fields=["filePath", "branch"],
    ),
    ToolManifestSpec(
        name="github.file_write",
        category=ToolCategory.GITHUB,
        access_mode=ToolAccessMode.WRITE,
        description="Write and stage a file inside the isolated project git worktree.",
        allowed_studios=["design", "architecture", "development", "qa"],
        input_fields=["filePath", "content"],
    ),
    ToolManifestSpec(
        name="github.commit_create",
        category=ToolCategory.GITHUB,
        access_mode=ToolAccessMode.WRITE,
        description="Stage changes and create a git commit in the isolated project repository.",
        allowed_studios=["design", "architecture", "development", "qa", "release"],
        input_fields=["message", "authorName", "authorEmail"],
    ),
    ToolManifestSpec(
        name="github.pr_create",
        category=ToolCategory.GITHUB,
        access_mode=ToolAccessMode.WRITE,
        description="Create a structured Pull Request manifest with diff stats, commit log, and target branch.",
        allowed_studios=["design", "architecture", "development", "qa", "release"],
        input_fields=["title", "sourceBranch", "targetBranch", "description"],
    ),
    ToolManifestSpec(
        name="github.branch_manage",
        category=ToolCategory.GITHUB,
        access_mode=ToolAccessMode.WRITE,
        description="List, create, or checkout branches inside the project git repository.",
        allowed_studios=["jarvis", "design", "architecture", "development", "qa", "release"],
        input_fields=["action", "branchName"],
    ),
    ToolManifestSpec(
        name="fs.dir_read",
        category=ToolCategory.FILESYSTEM,
        access_mode=ToolAccessMode.READ,
        description="List directory entries, byte sizes, and types inside the isolated project workspace.",
        allowed_studios=["jarvis", "librarian", "discovery", "product", "design", "architecture", "development", "qa", "release"],
        input_fields=["dirPath"],
    ),
    ToolManifestSpec(
        name="fs.file_read",
        category=ToolCategory.FILESYSTEM,
        access_mode=ToolAccessMode.READ,
        description="Read UTF-8 file contents and SHA-256 digest from the isolated project workspace.",
        allowed_studios=["jarvis", "librarian", "discovery", "product", "design", "architecture", "development", "qa", "release"],
        input_fields=["filePath"],
    ),
    ToolManifestSpec(
        name="fs.file_write",
        category=ToolCategory.FILESYSTEM,
        access_mode=ToolAccessMode.WRITE,
        description="Write or overwrite a file inside the isolated project workspace.",
        allowed_studios=["design", "architecture", "development", "qa"],
        input_fields=["filePath", "content"],
    ),
    ToolManifestSpec(
        name="fs.file_create",
        category=ToolCategory.FILESYSTEM,
        access_mode=ToolAccessMode.WRITE,
        description="Create a new file inside the isolated project workspace.",
        allowed_studios=["design", "architecture", "development", "qa"],
        input_fields=["filePath", "content", "overwrite"],
    ),
    ToolManifestSpec(
        name="fs.artifact_export",
        category=ToolCategory.FILESYSTEM,
        access_mode=ToolAccessMode.WRITE,
        description="Export a studio artifact bundle (Markdown + JSON metadata + SHA-256 manifest) to disk.",
        allowed_studios=["jarvis", "librarian", "discovery", "product", "design", "architecture", "development", "qa", "release"],
        input_fields=["title", "artifactType", "content", "exportSubdir"],
    ),
    ToolManifestSpec(
        name="docs.markdown_read",
        category=ToolCategory.DOCUMENTATION,
        access_mode=ToolAccessMode.READ,
        description="Parse Markdown documents into structured sections and links.",
        allowed_studios=["jarvis", "librarian", "discovery", "product", "design", "architecture", "development", "qa", "release"],
        input_fields=["filePath"],
    ),
    ToolManifestSpec(
        name="docs.wiki_read",
        category=ToolCategory.DOCUMENTATION,
        access_mode=ToolAccessMode.READ,
        description="Read and query Chief Librarian LLM Wiki pages and provenance claims.",
        allowed_studios=["jarvis", "librarian", "discovery", "product", "design", "architecture", "development", "qa", "release"],
        input_fields=["pathOrQuery", "projectId"],
    ),
    ToolManifestSpec(
        name="docs.artifact_read",
        category=ToolCategory.DOCUMENTATION,
        access_mode=ToolAccessMode.READ,
        description="Inspect persisted Studio Artifacts, versions, checksums, and markdown payloads.",
        allowed_studios=["jarvis", "librarian", "discovery", "product", "design", "architecture", "development", "qa", "release"],
        input_fields=["artifactId", "studioSlug"],
    ),
    ToolManifestSpec(
        name="docs.openapi_read",
        category=ToolCategory.DOCUMENTATION,
        access_mode=ToolAccessMode.READ,
        description="Inspect OpenAPI v3 specifications and FastAPI service route contracts across CortexOS services.",
        allowed_studios=["jarvis", "design", "architecture", "development", "qa", "release"],
        input_fields=["serviceName", "specPath"],
    ),
    ToolManifestSpec(
        name="terminal.exec",
        category=ToolCategory.TERMINAL,
        access_mode=ToolAccessMode.EXECUTE,
        description="Execute allowlisted commands inside an isolated work directory with strict sandbox rules and audit trails.",
        allowed_studios=["jarvis", "design", "architecture", "development", "qa", "release"],
        input_fields=["command", "workdir"],
    ),
)


class StudioToolRegistry:
    """Validates, audits, and executes allowlisted tools across Studios (Design, Architecture, Development, QA)."""

    def __init__(self, sandbox_base_dir: str | None = None) -> None:
        self._studio_tools: dict[str, tuple[str, ...]] = {}
        self._manifests: dict[str, ToolManifestSpec] = {
            m.name: m for m in CANONICAL_PYTHON_TOOL_MANIFESTS
        }
        self._executions: list[ToolExecutionRecord] = []
        self._audits: list[ToolAuditEntry] = []
        self._sandbox_base = Path(
            sandbox_base_dir
            or os.environ.get("CORTEX_SANDBOX_DIR")
            or Path.cwd() / ".cortex-sandbox"
        ).resolve()

    def register_manifest(self, manifest: StudioManifest) -> None:
        canonical_for_studio = [
            m.name for m in self._manifests.values() if manifest.id in m.allowed_studios
        ]
        merged = list(dict.fromkeys([*manifest.tools, *canonical_for_studio]))
        self._studio_tools[manifest.id] = tuple(merged)

    def list_tools(self, studio_id: str) -> list[str]:
        if studio_id in self._studio_tools:
            return list(self._studio_tools[studio_id])
        return [m.name for m in self._manifests.values() if studio_id in m.allowed_studios]

    def list_tool_manifests(self, studio_id: str | None = None) -> list[ToolManifestSpec]:
        if not studio_id:
            return list(self._manifests.values())
        return [m for m in self._manifests.values() if studio_id in m.allowed_studios]

    def is_tool_allowed(self, studio_id: str, tool_id: str) -> bool:
        spec = self._manifests.get(tool_id)
        if spec and studio_id in spec.allowed_studios:
            return True
        return tool_id in self._studio_tools.get(studio_id, ())

    def resolve_project_sandbox(self, project_id: str) -> Path:
        safe = re.sub(r"[^a-z0-9_-]", "-", (project_id or "proj-solar-crm").lower())[:64]
        root = (self._sandbox_base / (safe or "proj-solar-crm")).resolve()
        root.mkdir(parents=True, exist_ok=True)
        return root

    def evaluate_permissions(
        self,
        spec: ToolManifestSpec,
        req: ToolExecutionRequest,
    ) -> ToolPermissionResult:
        sandbox_root = self.resolve_project_sandbox(req.project_id)
        studio_id = req.studio_id.lower()

        if studio_id not in spec.allowed_studios:
            return ToolPermissionResult(
                allowed=False,
                reason=f"Studio '{studio_id}' is not permitted to invoke '{spec.name}'.",
                sandbox_root=str(sandbox_root),
                denied_rule="studio_not_in_allowlist",
            )

        for key in ("filePath", "dirPath", "workdir", "specPath"):
            val = req.parameters.get(key)
            if isinstance(val, str) and val.strip():
                if "../" in val or val.startswith("/etc") or "\x00" in val:
                    return ToolPermissionResult(
                        allowed=False,
                        reason=f"Parameter '{key}' violates sandbox path isolation.",
                        sandbox_root=str(sandbox_root),
                        denied_rule="path_traversal_blocked",
                    )

        if spec.category == ToolCategory.TERMINAL:
            cmd = str(req.parameters.get("command", "")).strip()
            if not cmd or DISALLOWED_COMMAND_REGEX.search(cmd):
                return ToolPermissionResult(
                    allowed=False,
                    reason=f"Command rejected by sandbox guard: '{cmd}'",
                    sandbox_root=str(sandbox_root),
                    denied_rule="terminal_sandbox_violation",
                )
            binary = cmd.split()[0]
            if binary not in ALLOWED_TERMINAL_BINARIES:
                return ToolPermissionResult(
                    allowed=False,
                    reason=f"Binary '{binary}' is not in allowlisted sandbox executables.",
                    sandbox_root=str(sandbox_root),
                    denied_rule="binary_not_allowlisted",
                )

        return ToolPermissionResult(
            allowed=True,
            reason=f"Permitted inside isolated sandbox '{sandbox_root}'.",
            sandbox_root=str(sandbox_root),
        )

    def execute_tool(self, req: ToolExecutionRequest) -> ToolExecutionRecord:
        started = datetime.now(timezone.utc)
        spec = self._manifests.get(req.tool_name)
        sandbox_root = self.resolve_project_sandbox(req.project_id)

        if spec is None:
            raise KeyError(f"Tool '{req.tool_name}' is not registered.")

        perm = self.evaluate_permissions(spec, req)
        exec_id = f"texec-{int(started.timestamp() * 1000)}"
        checksum = hashlib.sha256(f"{exec_id}:{req.tool_name}:{req.project_id}".encode("utf-8")).hexdigest()
        audit_id = f"aud-{checksum[:10]}"

        if not perm.allowed:
            completed = datetime.now(timezone.utc)
            audit = ToolAuditEntry(
                id=audit_id,
                execution_id=exec_id,
                tool_name=req.tool_name,
                category=spec.category,
                agent_id=req.agent_id,
                studio_id=req.studio_id,
                project_id=req.project_id,
                action=f"tool.denied:{req.tool_name}",
                allowed=False,
                reason=perm.reason,
                checksum=checksum,
                timestamp=completed,
                details={"deniedRule": perm.denied_rule},
            )
            self._audits.insert(0, audit)
            rec = ToolExecutionRecord(
                id=exec_id,
                tool_name=req.tool_name,
                category=spec.category,
                agent_id=req.agent_id,
                studio_id=req.studio_id,
                project_id=req.project_id,
                work_request_id=req.work_request_id,
                workflow_id=req.workflow_id,
                status=ToolExecutionStatus.DENIED,
                started_at=started,
                completed_at=completed,
                duration_ms=max(1.0, (completed - started).total_seconds() * 1000.0),
                input_summary=str(req.parameters)[:120],
                result_summary=perm.reason,
                output={"allowed": False, "deniedRule": perm.denied_rule},
                audit_entry_id=audit_id,
                checksum=checksum,
                sandbox_root=str(sandbox_root),
            )
            self._executions.insert(0, rec)
            return rec

        output: dict[str, Any] = {}
        result_summary = f"Executed {req.tool_name} in {sandbox_root.name}."

        if req.tool_name in ("fs.file_write", "fs.file_create", "github.file_write"):
            rel = str(req.parameters.get("filePath", f"artifacts/{req.studio_id}.md")).lstrip("/")
            content = str(req.parameters.get("content", f"# {req.studio_id} deliverable\n"))
            dest = (sandbox_root / rel).resolve()
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(content, encoding="utf-8")
            output = {"filePath": rel, "byteSize": len(content.encode("utf-8"))}
            result_summary = f"Wrote '{rel}' ({output['byteSize']} bytes) in sandbox."
        elif req.tool_name == "terminal.exec":
            cmd = str(req.parameters.get("command", "pwd")).strip()
            proc = subprocess.run(
                cmd.split(),
                cwd=str(sandbox_root),
                capture_output=True,
                text=True,
                timeout=4,
                check=False,
            )
            output = {"stdout": proc.stdout.strip(), "stderr": proc.stderr.strip(), "exitCode": proc.returncode}
            result_summary = f"Ran '{cmd}' (exit={proc.returncode})."
        else:
            output = {"tool": req.tool_name, "parameters": req.parameters, "sandbox": str(sandbox_root)}

        completed = datetime.now(timezone.utc)
        audit = ToolAuditEntry(
            id=audit_id,
            execution_id=exec_id,
            tool_name=req.tool_name,
            category=spec.category,
            agent_id=req.agent_id,
            studio_id=req.studio_id,
            project_id=req.project_id,
            action=f"tool.executed:{req.tool_name}",
            allowed=True,
            reason=perm.reason,
            checksum=checksum,
            timestamp=completed,
            details=output,
        )
        self._audits.insert(0, audit)

        rec = ToolExecutionRecord(
            id=exec_id,
            tool_name=req.tool_name,
            category=spec.category,
            agent_id=req.agent_id,
            studio_id=req.studio_id,
            project_id=req.project_id,
            work_request_id=req.work_request_id,
            workflow_id=req.workflow_id,
            status=ToolExecutionStatus.COMPLETED,
            started_at=started,
            completed_at=completed,
            duration_ms=max(1.0, (completed - started).total_seconds() * 1000.0),
            input_summary=str(req.parameters)[:120],
            result_summary=result_summary,
            output=output,
            artifact_title=f"Tool Deliverable: {req.tool_name}",
            knowledge_candidate_title=f"Knowledge Candidate: {req.tool_name}",
            audit_entry_id=audit_id,
            checksum=checksum,
            sandbox_root=str(sandbox_root),
        )
        self._executions.insert(0, rec)
        return rec

    def list_executions(self) -> list[ToolExecutionRecord]:
        return list(self._executions)

    def list_audits(self) -> list[ToolAuditEntry]:
        return list(self._audits)
