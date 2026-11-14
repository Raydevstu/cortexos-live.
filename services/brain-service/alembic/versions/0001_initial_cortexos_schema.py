"""Initial CortexOS canonical PostgreSQL schema.

Revision ID: 0001_initial_cortexos_schema
Revises:
Create Date: 2026-11-14 00:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_cortexos_schema"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

UUID_COL = sa.Uuid(as_uuid=False)
JSONB_COL = sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql")
ARRAY_STR_COL = sa.JSON().with_variant(postgresql.ARRAY(sa.String()), "postgresql")


def _base_columns() -> list[sa.Column[object]]:
    return [
        sa.Column("id", UUID_COL, primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", UUID_COL, nullable=True),
        sa.Column("updated_by", UUID_COL, nullable=True),
    ]


def _tenant_columns() -> list[sa.Column[object]]:
    return [
        sa.Column(
            "organization_id",
            UUID_COL,
            sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("tags", ARRAY_STR_COL, nullable=False),
        sa.Column("metadata", JSONB_COL, nullable=False),
    ]


def upgrade() -> None:
    # 1. Users
    op.create_table(
        "users",
        *_base_columns(),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("avatar_url", sa.String(1024), nullable=True),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("preferences", JSONB_COL, nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_status", "users", ["status"])
    op.create_index("ix_users_created_at", "users", ["created_at"])

    # 2. Organizations
    op.create_table(
        "organizations",
        *_base_columns(),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False, unique=True),
        sa.Column("plan", sa.String(32), nullable=False),
        sa.Column("settings", JSONB_COL, nullable=False),
    )
    op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=True)
    op.create_index("ix_organizations_created_at", "organizations", ["created_at"])

    # 3. Studios & Projects
    op.create_table(
        "studios",
        *_base_columns(),
        sa.Column("slug", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("version", sa.String(32), nullable=False),
        sa.Column("mission", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("manifest", JSONB_COL, nullable=False),
    )
    op.create_index("ix_studios_slug", "studios", ["slug"], unique=True)
    op.create_index("ix_studios_status", "studios", ["status"])

    op.create_table(
        "projects",
        *_base_columns(),
        *_tenant_columns(),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("phase", sa.String(32), nullable=False),
        sa.Column(
            "owner_id",
            UUID_COL,
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("vision", sa.Text(), nullable=True),
    )
    op.create_index("ix_projects_status", "projects", ["status"])
    op.create_index("ix_projects_phase", "projects", ["phase"])
    op.create_index("ix_projects_created_at", "projects", ["created_at"])
    op.create_index("ix_projects_org_status", "projects", ["organization_id", "status"])
    op.create_index("ix_projects_org_phase", "projects", ["organization_id", "phase"])

    # 4. Artifacts & Artifact Versions
    op.create_table(
        "artifacts",
        *_base_columns(),
        *_tenant_columns(),
        sa.Column(
            "project_id",
            UUID_COL,
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("artifact_type", sa.String(64), nullable=False),
        sa.Column("title", sa.String(320), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("version", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("content_uri", sa.String(1024), nullable=True),
        sa.Column("checksum", sa.String(128), nullable=True),
        sa.Column("approved_by", UUID_COL, nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_artifacts_project_id", "artifacts", ["project_id"])
    op.create_index("ix_artifacts_artifact_type", "artifacts", ["artifact_type"])
    op.create_index("ix_artifacts_status", "artifacts", ["status"])
    op.create_index("ix_artifacts_created_at", "artifacts", ["created_at"])
    op.create_index("ix_artifacts_project_type", "artifacts", ["project_id", "artifact_type"])
    op.create_index("ix_artifacts_project_status", "artifacts", ["project_id", "status"])

    op.create_table(
        "artifact_versions",
        *_base_columns(),
        sa.Column(
            "artifact_id",
            UUID_COL,
            sa.ForeignKey("artifacts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.String(32), nullable=False),
        sa.Column("content_uri", sa.String(1024), nullable=False),
        sa.Column("change_summary", sa.Text(), nullable=False),
        sa.Column("versioned_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_artifact_versions_artifact_id", "artifact_versions", ["artifact_id"])

    # 5. Knowledge Layer
    op.create_table(
        "decisions",
        *_base_columns(),
        *_tenant_columns(),
        sa.Column(
            "project_id",
            UUID_COL,
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(320), nullable=False),
        sa.Column("context", sa.Text(), nullable=False),
        sa.Column("decision", sa.Text(), nullable=False),
        sa.Column("reasoning", sa.Text(), nullable=False),
        sa.Column("impact", sa.Text(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
    )
    op.create_index("ix_decisions_project_id", "decisions", ["project_id"])
    op.create_index("ix_decisions_status", "decisions", ["status"])

    op.create_table(
        "entities",
        *_base_columns(),
        *_tenant_columns(),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column("entity_type", sa.String(64), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("aliases", ARRAY_STR_COL, nullable=False),
    )
    op.create_index("ix_entities_name", "entities", ["name"])
    op.create_index("ix_entities_entity_type", "entities", ["entity_type"])

    op.create_table(
        "concepts",
        *_base_columns(),
        *_tenant_columns(),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("domain", sa.String(120), nullable=False),
        sa.Column("keywords", ARRAY_STR_COL, nullable=False),
    )
    op.create_index("ix_concepts_name", "concepts", ["name"])
    op.create_index("ix_concepts_domain", "concepts", ["domain"])

    op.create_table(
        "patterns",
        *_base_columns(),
        *_tenant_columns(),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column("category", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("reusability_score", sa.Integer(), nullable=False),
    )
    op.create_index("ix_patterns_name", "patterns", ["name"])
    op.create_index("ix_patterns_category", "patterns", ["category"])

    op.create_table(
        "doctrines",
        *_base_columns(),
        *_tenant_columns(),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "source_pattern_id",
            UUID_COL,
            sa.ForeignKey("patterns.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("approved_by", UUID_COL, nullable=True),
    )
    op.create_index("ix_doctrines_name", "doctrines", ["name"])
    op.create_index("ix_doctrines_source_pattern_id", "doctrines", ["source_pattern_id"])

    op.create_table(
        "sources",
        *_base_columns(),
        *_tenant_columns(),
        sa.Column(
            "project_id",
            UUID_COL,
            sa.ForeignKey("projects.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("source_type", sa.String(32), nullable=False),
        sa.Column("title", sa.String(320), nullable=False),
        sa.Column("source_uri", sa.String(1024), nullable=False),
        sa.Column("raw_content", sa.Text(), nullable=True),
        sa.Column("checksum", sa.String(128), nullable=False),
    )
    op.create_index("ix_sources_project_id", "sources", ["project_id"])
    op.create_index("ix_sources_checksum", "sources", ["checksum"])

    op.create_table(
        "knowledge_articles",
        *_base_columns(),
        *_tenant_columns(),
        sa.Column("title", sa.String(320), nullable=False),
        sa.Column("article_type", sa.String(64), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("generated_by", sa.String(120), nullable=False),
    )
    op.create_index("ix_knowledge_articles_type", "knowledge_articles", ["article_type"])

    op.create_table(
        "relationships",
        *_base_columns(),
        *_tenant_columns(),
        sa.Column("source_id", UUID_COL, nullable=False),
        sa.Column("target_id", UUID_COL, nullable=False),
        sa.Column("relationship_type", sa.String(64), nullable=False),
        sa.Column("weight", sa.Float(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.UniqueConstraint(
            "source_id",
            "target_id",
            "relationship_type",
            name="uq_relationships_edge",
        ),
    )
    op.create_index("ix_relationships_source_target", "relationships", ["source_id", "target_id"])
    op.create_index("ix_relationships_type", "relationships", ["relationship_type"])

    op.create_table(
        "search_documents",
        *_base_columns(),
        sa.Column(
            "organization_id",
            UUID_COL,
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("source_type", sa.String(64), nullable=False),
        sa.Column("source_id", UUID_COL, nullable=False),
        sa.Column("project_id", UUID_COL, nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding_id", sa.String(128), nullable=True),
        sa.Column("indexed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_search_documents_source", "search_documents", ["source_type", "source_id"])

    # 6. Workflows & Executions
    op.create_table(
        "workflows",
        *_base_columns(),
        *_tenant_columns(),
        sa.Column(
            "project_id",
            UUID_COL,
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("workflow_type", sa.String(120), nullable=False),
        sa.Column("namespace", sa.String(64), nullable=False),
        sa.Column("task_queue", sa.String(64), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("current_step", sa.String(160), nullable=False),
        sa.Column("temporal_run_id", sa.String(200), nullable=True),
        sa.Column("input_payload", JSONB_COL, nullable=False),
        sa.Column("result_payload", JSONB_COL, nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_workflows_status", "workflows", ["status"])
    op.create_index("ix_workflows_project_id", "workflows", ["project_id"])
    op.create_index("ix_workflows_created_at", "workflows", ["created_at"])

    op.create_table(
        "workflow_executions",
        *_base_columns(),
        sa.Column(
            "workflow_id",
            UUID_COL,
            sa.ForeignKey("workflows.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("execution_id", sa.String(200), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("retry_count", sa.Integer(), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_workflow_executions_workflow_id", "workflow_executions", ["workflow_id"])

    # 7. Agents, Agent Memory, Work Requests & Responses
    op.create_table(
        "agents",
        *_base_columns(),
        *_tenant_columns(),
        sa.Column(
            "studio_id",
            UUID_COL,
            sa.ForeignKey("studios.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("role", sa.String(160), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("health_score", sa.Integer(), nullable=False),
        sa.Column("current_task", sa.String(320), nullable=False),
        sa.Column("model_id", sa.String(160), nullable=True),
    )
    op.create_index("ix_agents_status", "agents", ["status"])
    op.create_index("ix_agents_studio_id", "agents", ["studio_id"])

    op.create_table(
        "agent_memory",
        *_base_columns(),
        *_tenant_columns(),
        sa.Column(
            "agent_id",
            UUID_COL,
            sa.ForeignKey("agents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            UUID_COL,
            sa.ForeignKey("projects.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("memory_type", sa.String(64), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("importance_score", sa.Float(), nullable=False),
    )
    op.create_index("ix_agent_memory_agent_id", "agent_memory", ["agent_id"])

    op.create_table(
        "work_requests",
        *_base_columns(),
        *_tenant_columns(),
        sa.Column(
            "project_id",
            UUID_COL,
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("studio_id", sa.String(64), nullable=False),
        sa.Column("objective", sa.Text(), nullable=False),
        sa.Column("constraints", ARRAY_STR_COL, nullable=False),
        sa.Column("success_criteria", ARRAY_STR_COL, nullable=False),
        sa.Column("context_artifacts", ARRAY_STR_COL, nullable=False),
        sa.Column("priority", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
    )
    op.create_index("ix_work_requests_project_id", "work_requests", ["project_id"])
    op.create_index("ix_work_requests_status", "work_requests", ["status"])

    op.create_table(
        "work_responses",
        *_base_columns(),
        sa.Column(
            "work_request_id",
            UUID_COL,
            sa.ForeignKey("work_requests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("studio_id", sa.String(64), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("artifact_ids", ARRAY_STR_COL, nullable=False),
        sa.Column("next_phase", sa.String(64), nullable=True),
    )
    op.create_index("ix_work_responses_request_id", "work_responses", ["work_request_id"])

    # 8. Events Outbox
    op.create_table(
        "events",
        sa.Column("id", UUID_COL, primary_key=True, nullable=False),
        sa.Column("event_type", sa.String(120), nullable=False),
        sa.Column("organization_id", UUID_COL, nullable=True),
        sa.Column("project_id", UUID_COL, nullable=True),
        sa.Column("source", sa.String(120), nullable=False),
        sa.Column("correlation_id", sa.String(128), nullable=True),
        sa.Column("idempotency_key", sa.String(160), nullable=True, unique=True),
        sa.Column("payload", JSONB_COL, nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_events_event_type", "events", ["event_type"])
    op.create_index("ix_events_status", "events", ["status"])
    op.create_index("ix_events_timestamp", "events", ["timestamp"])

    # 9. Audit Logs
    op.create_table(
        "audit_logs",
        sa.Column("id", UUID_COL, primary_key=True, nullable=False),
        sa.Column("organization_id", UUID_COL, nullable=True),
        sa.Column("entity_type", sa.String(64), nullable=False),
        sa.Column("entity_id", UUID_COL, nullable=False),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("changed_by", UUID_COL, nullable=False),
        sa.Column("changes", JSONB_COL, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_logs_entity", "audit_logs", ["entity_type", "entity_id"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("events")
    op.drop_table("work_responses")
    op.drop_table("work_requests")
    op.drop_table("agent_memory")
    op.drop_table("agents")
    op.drop_table("workflow_executions")
    op.drop_table("workflows")
    op.drop_table("search_documents")
    op.drop_table("relationships")
    op.drop_table("knowledge_articles")
    op.drop_table("sources")
    op.drop_table("doctrines")
    op.drop_table("patterns")
    op.drop_table("concepts")
    op.drop_table("entities")
    op.drop_table("decisions")
    op.drop_table("artifact_versions")
    op.drop_table("artifacts")
    op.drop_table("projects")
    op.drop_table("studios")
    op.drop_table("organizations")
    op.drop_table("users")
