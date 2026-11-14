from __future__ import annotations

from typing import Any

from pydantic import Field

from cortexos_types import (
    Artifact,
    ArtifactVersion,
    AuditLog,
    Concept,
    CortexModel,
    Decision,
    Doctrine,
    Entity,
    Pattern,
    Project,
    Relationship,
    StoredEvent,
    Workflow,
)
from cortexos_types.enums import (
    ArtifactStatus,
    ArtifactType,
    DecisionStatus,
    EntityType,
    EventDeliveryStatus,
    ProjectPhase,
    ProjectStatus,
    RelationshipType,
    TemporalNamespace,
    TemporalTaskQueue,
    WorkflowStatus,
)

from app.models.artifact import ArtifactModel, ArtifactVersionModel
from app.models.audit import AuditLogModel
from app.models.concept import ConceptModel
from app.models.decision import DecisionModel
from app.models.doctrine import DoctrineModel
from app.models.entity import EntityModel
from app.models.event import EventModel
from app.models.knowledge import RelationshipModel
from app.models.pattern import PatternModel
from app.models.project import ProjectModel
from app.models.workflow import WorkflowModel


class CreatePatternRequest(CortexModel):
    organization_id: str | None = None
    name: str
    category: str
    description: str
    reusability_score: int = 1
    tags: list[str] = Field(default_factory=list)


class CreateDoctrineRequest(CortexModel):
    organization_id: str | None = None
    name: str
    description: str
    source_pattern_id: str
    approved_by: str | None = None
    tags: list[str] = Field(default_factory=list)


class CreateRelationshipRequest(CortexModel):
    organization_id: str | None = None
    source_id: str
    target_id: str
    relationship_type: RelationshipType
    weight: float = 1.0
    confidence: float = 1.0


class CreateWorkflowRequest(CortexModel):
    organization_id: str | None = None
    project_id: str
    workflow_type: str
    namespace: TemporalNamespace = TemporalNamespace.PROJECTS
    task_queue: TemporalTaskQueue = TemporalTaskQueue.JARVIS_SYSTEM
    current_step: str = "init"
    temporal_run_id: str | None = None
    input_payload: dict[str, Any] = Field(default_factory=dict)


class UpdateWorkflowRequest(CortexModel):
    status: WorkflowStatus | None = None
    current_step: str | None = None
    result_payload: dict[str, Any] | None = None
    temporal_run_id: str | None = None


class ProjectListResponse(CortexModel):
    items: list[Project]
    total: int
    limit: int
    offset: int


class EntityListResponse(CortexModel):
    items: list[Entity]
    total: int
    limit: int
    offset: int


class ConceptListResponse(CortexModel):
    items: list[Concept]
    total: int
    limit: int
    offset: int


class DecisionListResponse(CortexModel):
    items: list[Decision]
    total: int
    limit: int
    offset: int


class PatternListResponse(CortexModel):
    items: list[Pattern]
    total: int
    limit: int
    offset: int


class DoctrineListResponse(CortexModel):
    items: list[Doctrine]
    total: int
    limit: int
    offset: int


class RelationshipListResponse(CortexModel):
    items: list[Relationship]
    total: int
    limit: int
    offset: int


class WorkflowListResponse(CortexModel):
    items: list[Workflow]
    total: int
    limit: int
    offset: int


def model_to_project(row: ProjectModel) -> Project:
    return Project(
        id=row.id,
        organization_id=row.organization_id,
        name=row.name,
        description=row.description,
        status=ProjectStatus(row.status),
        phase=ProjectPhase(row.phase),
        owner_id=row.owner_id,
        vision=row.vision,
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
        created_by=row.created_by,
        updated_by=row.updated_by,
        tags=list(row.tags or []),
        metadata=dict(row.metadata_payload or {}),
    )


def model_to_artifact(row: ArtifactModel) -> Artifact:
    return Artifact(
        id=row.id,
        organization_id=row.organization_id,
        project_id=row.project_id,
        title=row.title,
        artifact_type=ArtifactType(row.artifact_type),
        status=ArtifactStatus(row.status),
        version=row.version,
        summary=row.summary,
        content_uri=row.content_uri,
        checksum=row.checksum,
        approved_by=row.approved_by,
        approved_at=row.approved_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
        created_by=row.created_by,
        updated_by=row.updated_by,
        tags=list(row.tags or []),
        metadata=dict(row.metadata_payload or {}),
    )


def model_to_artifact_version(row: ArtifactVersionModel) -> ArtifactVersion:
    return ArtifactVersion(
        id=row.id,
        artifact_id=row.artifact_id,
        version=row.version,
        content_uri=row.content_uri,
        change_summary=row.change_summary,
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
        created_by=row.created_by,
        updated_by=row.updated_by,
    )


def model_to_entity(row: EntityModel) -> Entity:
    return Entity(
        id=row.id,
        organization_id=row.organization_id,
        name=row.name,
        entity_type=EntityType(row.entity_type),
        description=row.description,
        aliases=list(row.aliases or []),
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
        created_by=row.created_by,
        updated_by=row.updated_by,
        tags=list(row.tags or []),
        metadata=dict(row.metadata_payload or {}),
    )


def model_to_concept(row: ConceptModel) -> Concept:
    return Concept(
        id=row.id,
        organization_id=row.organization_id,
        name=row.name,
        description=row.description,
        domain=row.domain,
        keywords=list(row.keywords or []),
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
        created_by=row.created_by,
        updated_by=row.updated_by,
        tags=list(row.tags or []),
        metadata=dict(row.metadata_payload or {}),
    )


def model_to_decision(row: DecisionModel) -> Decision:
    return Decision(
        id=row.id,
        organization_id=row.organization_id,
        project_id=row.project_id,
        title=row.title,
        context=row.context,
        decision=row.decision,
        reasoning=row.reasoning,
        impact=row.impact,
        status=DecisionStatus(row.status),
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
        created_by=row.created_by,
        updated_by=row.updated_by,
        tags=list(row.tags or []),
        metadata=dict(row.metadata_payload or {}),
    )


def model_to_pattern(row: PatternModel) -> Pattern:
    return Pattern(
        id=row.id,
        organization_id=row.organization_id,
        name=row.name,
        category=row.category,
        description=row.description,
        reusability_score=row.reusability_score,
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
        created_by=row.created_by,
        updated_by=row.updated_by,
        tags=list(row.tags or []),
        metadata=dict(row.metadata_payload or {}),
    )


def model_to_doctrine(row: DoctrineModel) -> Doctrine:
    return Doctrine(
        id=row.id,
        organization_id=row.organization_id,
        name=row.name,
        description=row.description,
        source_pattern_id=row.source_pattern_id,
        approved_by=row.approved_by,
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
        created_by=row.created_by,
        updated_by=row.updated_by,
        tags=list(row.tags or []),
        metadata=dict(row.metadata_payload or {}),
    )


def model_to_relationship(row: RelationshipModel) -> Relationship:
    return Relationship(
        id=row.id,
        organization_id=row.organization_id,
        source_id=row.source_id,
        target_id=row.target_id,
        relationship_type=RelationshipType(row.relationship_type),
        weight=row.weight,
        confidence=row.confidence,
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
        created_by=row.created_by,
        updated_by=row.updated_by,
        tags=list(row.tags or []),
        metadata=dict(row.metadata_payload or {}),
    )


def model_to_workflow(row: WorkflowModel) -> Workflow:
    return Workflow(
        id=row.id,
        organization_id=row.organization_id,
        project_id=row.project_id,
        workflow_type=row.workflow_type,
        namespace=TemporalNamespace(row.namespace),
        task_queue=TemporalTaskQueue(row.task_queue),
        status=WorkflowStatus(row.status),
        current_step=row.current_step,
        started_at=row.started_at,
        completed_at=row.completed_at,
        temporal_run_id=row.temporal_run_id,
        input=dict(row.input_payload or {}),
        result=dict(row.result_payload or {}),
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
        created_by=row.created_by,
        updated_by=row.updated_by,
        tags=list(row.tags or []),
        metadata=dict(row.metadata_payload or {}),
    )


def model_to_stored_event(row: EventModel) -> StoredEvent:
    return StoredEvent(
        id=row.id,
        event_type=row.event_type,
        payload=dict(row.payload or {}),
        status=EventDeliveryStatus(row.status),
        timestamp=row.timestamp,
        attempts=row.attempts,
    )


def model_to_audit_log(row: AuditLogModel) -> AuditLog:
    return AuditLog(
        id=row.id,
        entity_type=row.entity_type,
        entity_id=row.entity_id,
        action=row.action,
        changed_by=row.changed_by,
        created_at=row.created_at,
        changes=dict(row.changes or {}),
    )
