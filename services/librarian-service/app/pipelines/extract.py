from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

from cortexos_types import Concept, Entity, Pattern
from cortexos_types.enums import EntityType

from app.schemas.librarian import ExtractionBundle

_ENTITY_CATALOG: dict[str, tuple[EntityType, str, list[str]]] = {
    "openai": (EntityType.PROVIDER, "AI model provider (GPT family)", ["gpt", "gpt-5"]),
    "anthropic": (EntityType.PROVIDER, "AI model provider (Claude family)", ["claude"]),
    "gemini": (EntityType.PROVIDER, "Google Gemini model family and provider", ["google gemini"]),
    "deepseek": (EntityType.PROVIDER, "DeepSeek reasoning and coding models", ["deepseek-v3"]),
    "ollama": (EntityType.PROVIDER, "Local LLM runtime server", []),
    "fastapi": (EntityType.FRAMEWORK, "Python async web framework for APIs", []),
    "sqlalchemy": (EntityType.FRAMEWORK, "Python ORM and SQL toolkit", []),
    "next.js": (EntityType.FRAMEWORK, "React full-stack web framework", ["nextjs"]),
    "react": (EntityType.FRAMEWORK, "UI component library", []),
    "postgresql": (EntityType.DATABASE, "Primary relational database (System of Record)", ["postgres"]),
    "neo4j": (EntityType.DATABASE, "Property graph database (Relationship Memory)", []),
    "qdrant": (EntityType.DATABASE, "Vector similarity search database (Semantic Memory)", []),
    "redis": (EntityType.DATABASE, "In-memory cache and event pub/sub store", []),
    "temporal": (EntityType.PLATFORM, "Durable workflow orchestration engine", []),
    "minio": (EntityType.INFRASTRUCTURE, "S3-compatible object storage for artifacts", []),
    "docker": (EntityType.INFRASTRUCTURE, "Container packaging and runtime", []),
    "kubernetes": (EntityType.INFRASTRUCTURE, "Container orchestration platform", ["k8s"]),
    "stripe": (EntityType.COMPANY, "Payments infrastructure provider", []),
}

_CONCEPT_CATALOG: dict[str, tuple[str, str, list[str]]] = {
    "rag": ("Retrieval-Augmented Generation", "ai-intelligence", ["retrieval", "embeddings", "context"]),
    "cqrs": ("Command Query Responsibility Segregation", "architecture", ["commands", "queries", "events"]),
    "knowledge graph": ("Connected graph representation of entities and concepts", "ai-intelligence", ["graph", "neo4j", "traversal"]),
    "microservices": ("Loosely coupled service-oriented system architecture", "architecture", ["services", "api", "boundaries"]),
    "event driven": ("Asynchronous architecture communicating via immutable domain events", "architecture", ["events", "outbox", "pubsub"]),
    "agent mesh": ("Multi-agent coordination topology across studios", "ai-intelligence", ["agents", "jarvis", "studios"]),
    "hybrid search": ("Combined keyword, vector, and graph retrieval", "ai-intelligence", ["postgres", "qdrant", "neo4j"]),
    "rbac": ("Policy-based role access control", "security", ["policies", "roles", "permissions"]),
}

_PATTERN_CATALOG: dict[str, tuple[str, str, int]] = {
    "repository pattern": ("data-access", "Encapsulates persistence behind a uniform CRUD/search repository", 8),
    "event driven pattern": ("integration", "Decouples services with transactional outbox events", 9),
    "agent pattern": ("ai-runtime", "Standardizes plan/execute/validate/summarize/handoff lifecycle", 8),
    "adapter pattern": ("provider", "Abstracts external model providers behind ProviderAdapter", 9),
    "outbox pattern": ("reliability", "Persists events atomically alongside domain mutations", 9),
    "soft delete": ("data-governance", "Retains records using deleted_at timestamps for traceability", 7),
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _deterministic_id(namespace: str, key: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"cortexos:{namespace}:{key.lower()}"))


def extract_entities(
    text: str,
    *,
    organization_id: str | None = None,
) -> list[Entity]:
    lowered = text.lower()
    now = _now()
    found: dict[str, Entity] = {}

    for canonical, (etype, desc, aliases) in _ENTITY_CATALOG.items():
        terms = [canonical, *aliases]
        if any(re.search(rf"\b{re.escape(term)}\b", lowered) for term in terms):
            eid = _deterministic_id("entity", canonical)
            found[canonical] = Entity(
                id=eid,
                organization_id=organization_id,
                name=canonical.title() if canonical not in ("fastapi", "next.js", "postgresql") else {
                    "fastapi": "FastAPI",
                    "next.js": "Next.js",
                    "postgresql": "PostgreSQL",
                }[canonical],
                entity_type=etype,
                description=desc,
                aliases=aliases,
                created_at=now,
                updated_at=now,
            )
    return list(found.values())


def extract_concepts(
    text: str,
    *,
    organization_id: str | None = None,
) -> list[Concept]:
    lowered = text.lower()
    now = _now()
    found: dict[str, Concept] = {}

    for canonical, (desc, domain, keywords) in _CONCEPT_CATALOG.items():
        if re.search(rf"\b{re.escape(canonical)}\b", lowered):
            cid = _deterministic_id("concept", canonical)
            found[canonical] = Concept(
                id=cid,
                organization_id=organization_id,
                name=canonical.upper() if canonical in ("rag", "cqrs", "rbac") else canonical.title(),
                description=desc,
                domain=domain,
                keywords=keywords,
                created_at=now,
                updated_at=now,
            )
    return list(found.values())


def extract_patterns(
    text: str,
    *,
    organization_id: str | None = None,
) -> list[Pattern]:
    lowered = text.lower()
    now = _now()
    found: dict[str, Pattern] = {}

    for canonical, (category, desc, score) in _PATTERN_CATALOG.items():
        if re.search(rf"\b{re.escape(canonical)}\b", lowered):
            pid = _deterministic_id("pattern", canonical)
            found[canonical] = Pattern(
                id=pid,
                organization_id=organization_id,
                name=canonical.title(),
                category=category,
                description=desc,
                reusability_score=score,
                created_at=now,
                updated_at=now,
            )
    return list(found.values())


def extract_knowledge(
    text: str,
    *,
    organization_id: str | None = None,
) -> ExtractionBundle:
    """Extract Entities, Concepts, and Patterns from normalized text."""
    return ExtractionBundle(
        entities=extract_entities(text, organization_id=organization_id),
        concepts=extract_concepts(text, organization_id=organization_id),
        patterns=extract_patterns(text, organization_id=organization_id),
    )
