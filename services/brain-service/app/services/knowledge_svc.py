from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from cortexos_types import (
    AuditLog,
    Concept,
    CreateConceptRequest,
    CreateDecisionRequest,
    CreateEntityRequest,
    Decision,
    Doctrine,
    Entity,
    Pattern,
    Relationship,
    StoredEvent,
    Workflow,
)
from cortexos_types.enums import CortexEventType

from app.core.security import PolicyEvaluator, RequestContext
from app.models.concept import ConceptModel
from app.models.decision import DecisionModel
from app.models.doctrine import DoctrineModel
from app.models.entity import EntityModel
from app.models.knowledge import RelationshipModel
from app.models.pattern import PatternModel
from app.models.workflow import WorkflowModel
from app.repositories.knowledge_repo import (
    ConceptRepository,
    DecisionRepository,
    DoctrineRepository,
    EntityRepository,
    PatternRepository,
    RelationshipRepository,
)
from app.repositories.project_repo import ProjectRepository
from app.repositories.workflow_repo import (
    AuditLogRepository,
    EventRepository,
    WorkflowRepository,
)
from app.schemas.brain import (
    ConceptListResponse,
    CreateDoctrineRequest,
    CreatePatternRequest,
    CreateRelationshipRequest,
    CreateWorkflowRequest,
    DecisionListResponse,
    DoctrineListResponse,
    EntityListResponse,
    PatternListResponse,
    RelationshipListResponse,
    WorkflowListResponse,
    model_to_audit_log,
    model_to_concept,
    model_to_decision,
    model_to_doctrine,
    model_to_entity,
    model_to_pattern,
    model_to_relationship,
    model_to_stored_event,
    model_to_workflow,
)
from app.services.common import (
    authorize,
    emit_outbox_event,
    ensure_tenant_bootstrap,
    record_audit,
)


class KnowledgeService:
    def __init__(
        self,
        session: AsyncSession,
        evaluator: PolicyEvaluator | None = None,
    ) -> None:
        self.session = session
        self.entity_repo = EntityRepository(session)
        self.concept_repo = ConceptRepository(session)
        self.decision_repo = DecisionRepository(session)
        self.pattern_repo = PatternRepository(session)
        self.doctrine_repo = DoctrineRepository(session)
        self.relationship_repo = RelationshipRepository(session)
        self.project_repo = ProjectRepository(session)
        self.workflow_repo = WorkflowRepository(session)
        self.event_repo = EventRepository(session)
        self.audit_repo = AuditLogRepository(session)
        self.evaluator = evaluator or PolicyEvaluator()

    # Entities
    async def create_entity(self, payload: CreateEntityRequest, ctx: RequestContext) -> Entity:
        authorize(self.evaluator, ctx, "knowledge", "write")
        org_id = payload.organization_id or ctx.organization_id
        await ensure_tenant_bootstrap(self.session, org_id, ctx.subject_id)

        entity_type = (
            payload.entity_type.value
            if hasattr(payload.entity_type, "value")
            else str(payload.entity_type)
        )
        created = await self.entity_repo.create(
            EntityModel(
                organization_id=org_id,
                name=payload.name.strip(),
                entity_type=entity_type,
                description=payload.description.strip(),
                aliases=list(payload.aliases),
                tags=list(payload.tags),
                created_by=ctx.subject_id,
                updated_by=ctx.subject_id,
            )
        )
        await emit_outbox_event(
            self.session,
            event_type=CortexEventType.KNOWLEDGE_CREATED.value,
            organization_id=org_id,
            project_id=None,
            object_id=created.id,
            payload={"knowledge_id": created.id, "knowledge_type": "entity", "name": created.name},
        )
        await record_audit(
            self.session,
            organization_id=org_id,
            entity_type="entity",
            entity_id=created.id,
            action="create",
            changed_by=ctx.subject_id,
            changes={"name": created.name, "entity_type": created.entity_type},
        )
        return model_to_entity(created)

    async def get_entity(self, entity_id: str, ctx: RequestContext) -> Entity:
        authorize(self.evaluator, ctx, "knowledge", "read")
        row = await self.entity_repo.get_by_id(entity_id, organization_id=ctx.organization_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Entity '{entity_id}' not found",
            )
        return model_to_entity(row)

    async def list_entities(
        self,
        ctx: RequestContext,
        *,
        entity_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> EntityListResponse:
        authorize(self.evaluator, ctx, "knowledge", "read")
        rows, total = await self.entity_repo.list(
            organization_id=ctx.organization_id,
            limit=limit,
            offset=offset,
            filters={"entity_type": entity_type},
        )
        return EntityListResponse(
            items=[model_to_entity(r) for r in rows],
            total=total,
            limit=limit,
            offset=offset,
        )

    # Concepts
    async def create_concept(self, payload: CreateConceptRequest, ctx: RequestContext) -> Concept:
        authorize(self.evaluator, ctx, "knowledge", "write")
        org_id = payload.organization_id or ctx.organization_id
        await ensure_tenant_bootstrap(self.session, org_id, ctx.subject_id)

        created = await self.concept_repo.create(
            ConceptModel(
                organization_id=org_id,
                name=payload.name.strip(),
                description=payload.description.strip(),
                domain=payload.domain.strip(),
                keywords=list(payload.keywords),
                tags=list(payload.tags),
                created_by=ctx.subject_id,
                updated_by=ctx.subject_id,
            )
        )
        await emit_outbox_event(
            self.session,
            event_type=CortexEventType.KNOWLEDGE_CREATED.value,
            organization_id=org_id,
            project_id=None,
            object_id=created.id,
            payload={"knowledge_id": created.id, "knowledge_type": "concept", "name": created.name},
        )
        await record_audit(
            self.session,
            organization_id=org_id,
            entity_type="concept",
            entity_id=created.id,
            action="create",
            changed_by=ctx.subject_id,
            changes={"name": created.name, "domain": created.domain},
        )
        return model_to_concept(created)

    async def get_concept(self, concept_id: str, ctx: RequestContext) -> Concept:
        authorize(self.evaluator, ctx, "knowledge", "read")
        row = await self.concept_repo.get_by_id(concept_id, organization_id=ctx.organization_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Concept '{concept_id}' not found",
            )
        return model_to_concept(row)

    async def list_concepts(
        self,
        ctx: RequestContext,
        *,
        domain: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> ConceptListResponse:
        authorize(self.evaluator, ctx, "knowledge", "read")
        rows, total = await self.concept_repo.list(
            organization_id=ctx.organization_id,
            limit=limit,
            offset=offset,
            filters={"domain": domain},
        )
        return ConceptListResponse(
            items=[model_to_concept(r) for r in rows],
            total=total,
            limit=limit,
            offset=offset,
        )

    # Decisions
    async def create_decision(self, payload: CreateDecisionRequest, ctx: RequestContext) -> Decision:
        authorize(self.evaluator, ctx, "knowledge", "write", project_id=payload.project_id)
        org_id = payload.organization_id or ctx.organization_id
        await ensure_tenant_bootstrap(self.session, org_id, ctx.subject_id)

        project = await self.project_repo.get_by_id(payload.project_id, organization_id=org_id)
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{payload.project_id}' not found",
            )

        status_val = (
            payload.status.value if hasattr(payload.status, "value") else str(payload.status)
        )
        created = await self.decision_repo.create(
            DecisionModel(
                organization_id=org_id,
                project_id=payload.project_id,
                title=payload.title.strip(),
                context=payload.context,
                decision=payload.decision,
                reasoning=payload.reasoning,
                impact=payload.impact,
                status=status_val,
                created_by=ctx.subject_id,
                updated_by=ctx.subject_id,
            )
        )
        await emit_outbox_event(
            self.session,
            event_type=CortexEventType.KNOWLEDGE_CREATED.value,
            organization_id=org_id,
            project_id=created.project_id,
            object_id=created.id,
            payload={
                "knowledge_id": created.id,
                "knowledge_type": "decision",
                "project_id": created.project_id,
            },
        )
        await record_audit(
            self.session,
            organization_id=org_id,
            entity_type="decision",
            entity_id=created.id,
            action="create",
            changed_by=ctx.subject_id,
            changes={"title": created.title, "project_id": created.project_id},
        )
        return model_to_decision(created)

    async def get_decision(self, decision_id: str, ctx: RequestContext) -> Decision:
        authorize(self.evaluator, ctx, "knowledge", "read")
        row = await self.decision_repo.get_by_id(decision_id, organization_id=ctx.organization_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Decision '{decision_id}' not found",
            )
        return model_to_decision(row)

    async def list_decisions(
        self,
        ctx: RequestContext,
        *,
        project_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> DecisionListResponse:
        authorize(self.evaluator, ctx, "knowledge", "read", project_id=project_id)
        rows, total = await self.decision_repo.list(
            organization_id=ctx.organization_id,
            limit=limit,
            offset=offset,
            filters={"project_id": project_id},
        )
        return DecisionListResponse(
            items=[model_to_decision(r) for r in rows],
            total=total,
            limit=limit,
            offset=offset,
        )

    # Patterns & Doctrines
    async def create_pattern(self, payload: CreatePatternRequest, ctx: RequestContext) -> Pattern:
        authorize(self.evaluator, ctx, "knowledge", "write")
        org_id = payload.organization_id or ctx.organization_id
        await ensure_tenant_bootstrap(self.session, org_id, ctx.subject_id)

        created = await self.pattern_repo.create(
            PatternModel(
                organization_id=org_id,
                name=payload.name.strip(),
                category=payload.category.strip(),
                description=payload.description.strip(),
                reusability_score=payload.reusability_score,
                tags=list(payload.tags),
                created_by=ctx.subject_id,
                updated_by=ctx.subject_id,
            )
        )
        await record_audit(
            self.session,
            organization_id=org_id,
            entity_type="pattern",
            entity_id=created.id,
            action="create",
            changed_by=ctx.subject_id,
            changes={"name": created.name, "category": created.category},
        )
        return model_to_pattern(created)

    async def list_patterns(
        self,
        ctx: RequestContext,
        *,
        category: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> PatternListResponse:
        authorize(self.evaluator, ctx, "knowledge", "read")
        rows, total = await self.pattern_repo.list(
            organization_id=ctx.organization_id,
            limit=limit,
            offset=offset,
            filters={"category": category},
        )
        return PatternListResponse(
            items=[model_to_pattern(r) for r in rows],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def create_doctrine(self, payload: CreateDoctrineRequest, ctx: RequestContext) -> Doctrine:
        authorize(self.evaluator, ctx, "knowledge", "write")
        org_id = payload.organization_id or ctx.organization_id
        await ensure_tenant_bootstrap(self.session, org_id, ctx.subject_id)

        pattern = await self.pattern_repo.get_by_id(
            payload.source_pattern_id,
            organization_id=org_id,
        )
        if pattern is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Source pattern '{payload.source_pattern_id}' not found",
            )

        created = await self.doctrine_repo.create(
            DoctrineModel(
                organization_id=org_id,
                name=payload.name.strip(),
                description=payload.description.strip(),
                source_pattern_id=payload.source_pattern_id,
                approved_by=payload.approved_by,
                tags=list(payload.tags),
                created_by=ctx.subject_id,
                updated_by=ctx.subject_id,
            )
        )
        await emit_outbox_event(
            self.session,
            event_type=CortexEventType.DOCTRINE_PROPOSED.value,
            organization_id=org_id,
            project_id=None,
            object_id=created.id,
            payload={"doctrine_id": created.id, "source_pattern_id": created.source_pattern_id},
        )
        await record_audit(
            self.session,
            organization_id=org_id,
            entity_type="doctrine",
            entity_id=created.id,
            action="create",
            changed_by=ctx.subject_id,
            changes={"name": created.name},
        )
        return model_to_doctrine(created)

    async def list_doctrines(
        self,
        ctx: RequestContext,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> DoctrineListResponse:
        authorize(self.evaluator, ctx, "knowledge", "read")
        rows, total = await self.doctrine_repo.list(
            organization_id=ctx.organization_id,
            limit=limit,
            offset=offset,
        )
        return DoctrineListResponse(
            items=[model_to_doctrine(r) for r in rows],
            total=total,
            limit=limit,
            offset=offset,
        )

    # Relationships
    async def create_relationship(
        self,
        payload: CreateRelationshipRequest,
        ctx: RequestContext,
    ) -> Relationship:
        authorize(self.evaluator, ctx, "knowledge", "write")
        if payload.source_id == payload.target_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Relationship source_id and target_id cannot form a self-loop",
            )

        org_id = payload.organization_id or ctx.organization_id
        await ensure_tenant_bootstrap(self.session, org_id, ctx.subject_id)

        rel_type = (
            payload.relationship_type.value
            if hasattr(payload.relationship_type, "value")
            else str(payload.relationship_type)
        )
        created = await self.relationship_repo.create(
            RelationshipModel(
                organization_id=org_id,
                source_id=payload.source_id,
                target_id=payload.target_id,
                relationship_type=rel_type,
                weight=payload.weight,
                confidence=payload.confidence,
                created_by=ctx.subject_id,
                updated_by=ctx.subject_id,
            )
        )
        return model_to_relationship(created)

    async def list_relationships(
        self,
        ctx: RequestContext,
        *,
        node_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> RelationshipListResponse:
        authorize(self.evaluator, ctx, "knowledge", "read")
        if node_id:
            rows = await self.relationship_repo.list_for_node(
                node_id,
                organization_id=ctx.organization_id,
                limit=limit,
            )
            items = [model_to_relationship(r) for r in rows]
            return RelationshipListResponse(
                items=items,
                total=len(items),
                limit=limit,
                offset=offset,
            )

        rows, total = await self.relationship_repo.list(
            organization_id=ctx.organization_id,
            limit=limit,
            offset=offset,
        )
        return RelationshipListResponse(
            items=[model_to_relationship(r) for r in rows],
            total=total,
            limit=limit,
            offset=offset,
        )

    # Workflows, Events, Audit Logs
    async def create_workflow(
        self,
        payload: CreateWorkflowRequest,
        ctx: RequestContext,
    ) -> Workflow:
        authorize(self.evaluator, ctx, "workflow", "start", project_id=payload.project_id)
        org_id = payload.organization_id or ctx.organization_id
        await ensure_tenant_bootstrap(self.session, org_id, ctx.subject_id)

        project = await self.project_repo.get_by_id(payload.project_id, organization_id=org_id)
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{payload.project_id}' not found",
            )

        ns = payload.namespace.value if hasattr(payload.namespace, "value") else str(payload.namespace)
        tq = payload.task_queue.value if hasattr(payload.task_queue, "value") else str(payload.task_queue)
        created = await self.workflow_repo.create(
            WorkflowModel(
                organization_id=org_id,
                project_id=payload.project_id,
                workflow_type=payload.workflow_type,
                namespace=ns,
                task_queue=tq,
                current_step=payload.current_step,
                temporal_run_id=payload.temporal_run_id,
                input_payload=dict(payload.input_payload),
                created_by=ctx.subject_id,
                updated_by=ctx.subject_id,
            )
        )
        await emit_outbox_event(
            self.session,
            event_type=CortexEventType.WORKFLOW_STARTED.value,
            organization_id=org_id,
            project_id=created.project_id,
            object_id=created.id,
            payload={"workflow_id": created.id, "workflow_type": created.workflow_type},
        )
        return model_to_workflow(created)

    async def list_workflows(
        self,
        ctx: RequestContext,
        *,
        project_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> WorkflowListResponse:
        authorize(self.evaluator, ctx, "workflow", "read", project_id=project_id)
        rows, total = await self.workflow_repo.list(
            organization_id=ctx.organization_id,
            limit=limit,
            offset=offset,
            filters={"project_id": project_id},
        )
        return WorkflowListResponse(
            items=[model_to_workflow(r) for r in rows],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def list_events(
        self,
        ctx: RequestContext,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> list[StoredEvent]:
        authorize(self.evaluator, ctx, "project", "read")
        rows, _ = await self.event_repo.list(
            organization_id=ctx.organization_id,
            limit=limit,
            offset=offset,
        )
        return [model_to_stored_event(r) for r in rows]

    async def list_audit_logs(
        self,
        ctx: RequestContext,
        *,
        entity_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[AuditLog]:
        authorize(self.evaluator, ctx, "project", "read")
        rows, _ = await self.audit_repo.list(
            organization_id=ctx.organization_id,
            limit=limit,
            offset=offset,
            filters={"entity_type": entity_type},
        )
        return [model_to_audit_log(r) for r in rows]
