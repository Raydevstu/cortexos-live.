from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from cortexos_types import Concept, Entity, KnowledgeArticle, Pattern, Relationship
from cortexos_types.enums import KnowledgeArticleType

from app.schemas.librarian import ExtractionBundle, WikiArticleOutput


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "untitled"


def _folder_for_type(article_type: KnowledgeArticleType) -> str:
    mapping = {
        KnowledgeArticleType.ENTITY: "entities",
        KnowledgeArticleType.CONCEPT: "concepts",
        KnowledgeArticleType.PATTERN: "patterns",
        KnowledgeArticleType.DOCTRINE: "doctrines",
        KnowledgeArticleType.PROJECT: "projects",
        KnowledgeArticleType.DECISION: "decisions",
        KnowledgeArticleType.SUMMARY: "summaries",
        KnowledgeArticleType.PLAYBOOK: "playbooks",
    }
    return mapping[article_type]


def _render_entity_markdown(entity: Entity, relationships: list[Relationship]) -> str:
    related = [r for r in relationships if r.target_id == entity.id or r.source_id == entity.id]
    rel_lines = (
        "\n".join(f"- `{r.relationship_type}` `{r.source_id}` -> `{r.target_id}`" for r in related)
        or "- Pending relationship discovery"
    )
    return (
        f"# {entity.name}\n\n"
        f"## Overview\n{entity.description}\n\n"
        f"- **Type**: `{entity.entity_type}`\n"
        f"- **Aliases**: {', '.join(entity.aliases) or 'None'}\n\n"
        f"## Relationships\n{rel_lines}\n\n"
        "## Projects\n- Tracked via Brain Service graph mirror\n\n"
        "## Artifacts\n- Linked during Librarian ingestion\n\n"
        "## Decisions\n- Synchronized automatically by MainBrain\n\n"
        f"## References\n- Entity ID: `{entity.id}`\n"
    )


def _render_concept_markdown(concept: Concept, relationships: list[Relationship]) -> str:
    related = [r for r in relationships if r.target_id == concept.id or r.source_id == concept.id]
    rel_lines = (
        "\n".join(f"- `{r.relationship_type}` `{r.source_id}` -> `{r.target_id}`" for r in related)
        or "- Pending relationship discovery"
    )
    return (
        f"# {concept.name}\n\n"
        f"## Definition\n{concept.description}\n\n"
        f"- **Domain**: `{concept.domain}`\n"
        f"- **Keywords**: {', '.join(concept.keywords) or 'None'}\n\n"
        f"## Relationships\n{rel_lines}\n\n"
        "## Examples\n- Captured in CortexOS Artifacts & Studios\n\n"
        f"## References\n- Concept ID: `{concept.id}`\n\n"
        "## Related Patterns\n- Linked via Knowledge Compounding\n"
    )


def _render_pattern_markdown(pattern: Pattern, relationships: list[Relationship]) -> str:
    related = [r for r in relationships if r.target_id == pattern.id or r.source_id == pattern.id]
    rel_lines = (
        "\n".join(f"- `{r.relationship_type}` `{r.source_id}` -> `{r.target_id}`" for r in related)
        or "- Pending implementation links"
    )
    return (
        f"# {pattern.name}\n\n"
        f"## Overview\n{pattern.description}\n\n"
        f"- **Category**: `{pattern.category}`\n"
        f"- **Reusability Score**: {pattern.reusability_score}/10\n\n"
        f"## Relationships\n{rel_lines}\n"
    )


def generate_wiki_pages(
    *,
    title: str,
    summary: str,
    bundle: ExtractionBundle,
    relationships: list[Relationship],
    organization_id: str | None = None,
    vault_dir: Path | None = None,
    write_files: bool = False,
) -> list[WikiArticleOutput]:
    """Generate structured Markdown Wiki outputs and optionally persist to brain/wiki/."""
    now = datetime.now(timezone.utc)
    outputs: list[WikiArticleOutput] = []

    summary_rel = f"wiki/{_folder_for_type(KnowledgeArticleType.SUMMARY)}/{slugify(title)}.md"
    summary_md = (
        f"# {title}\n\n"
        f"## Summary\n{summary}\n\n"
        f"## Extracted Entities\n"
        + ("\n".join(f"- {e.name} (`{e.entity_type}`)" for e in bundle.entities) or "- None")
        + "\n\n## Extracted Concepts\n"
        + ("\n".join(f"- {c.name} (`{c.domain}`)" for c in bundle.concepts) or "- None")
        + "\n\n## Extracted Patterns\n"
        + ("\n".join(f"- {p.name} (score {p.reusability_score})" for p in bundle.patterns) or "- None")
        + "\n"
    )
    outputs.append(
        WikiArticleOutput(
            article=KnowledgeArticle(
                id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"cortexos:wiki:{summary_rel}")),
                organization_id=organization_id,
                title=title,
                article_type=KnowledgeArticleType.SUMMARY,
                content=summary_md,
                summary=summary,
                generated_by="librarian-service",
                created_at=now,
                updated_at=now,
            ),
            relative_path=summary_rel,
            markdown=summary_md,
        )
    )

    for entity in bundle.entities:
        rel_path = f"wiki/{_folder_for_type(KnowledgeArticleType.ENTITY)}/{slugify(entity.name)}.md"
        md = _render_entity_markdown(entity, relationships)
        outputs.append(
            WikiArticleOutput(
                article=KnowledgeArticle(
                    id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"cortexos:wiki:{rel_path}")),
                    organization_id=organization_id,
                    title=entity.name,
                    article_type=KnowledgeArticleType.ENTITY,
                    content=md,
                    summary=entity.description,
                    generated_by="librarian-service",
                    created_at=now,
                    updated_at=now,
                ),
                relative_path=rel_path,
                markdown=md,
            )
        )

    for concept in bundle.concepts:
        rel_path = f"wiki/{_folder_for_type(KnowledgeArticleType.CONCEPT)}/{slugify(concept.name)}.md"
        md = _render_concept_markdown(concept, relationships)
        outputs.append(
            WikiArticleOutput(
                article=KnowledgeArticle(
                    id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"cortexos:wiki:{rel_path}")),
                    organization_id=organization_id,
                    title=concept.name,
                    article_type=KnowledgeArticleType.CONCEPT,
                    content=md,
                    summary=concept.description,
                    generated_by="librarian-service",
                    created_at=now,
                    updated_at=now,
                ),
                relative_path=rel_path,
                markdown=md,
            )
        )

    for pattern in bundle.patterns:
        rel_path = f"wiki/{_folder_for_type(KnowledgeArticleType.PATTERN)}/{slugify(pattern.name)}.md"
        md = _render_pattern_markdown(pattern, relationships)
        outputs.append(
            WikiArticleOutput(
                article=KnowledgeArticle(
                    id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"cortexos:wiki:{rel_path}")),
                    organization_id=organization_id,
                    title=pattern.name,
                    article_type=KnowledgeArticleType.PATTERN,
                    content=md,
                    summary=pattern.description,
                    generated_by="librarian-service",
                    created_at=now,
                    updated_at=now,
                ),
                relative_path=rel_path,
                markdown=md,
            )
        )

    if write_files and vault_dir is not None:
        for item in outputs:
            target = vault_dir / item.relative_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(item.markdown, encoding="utf-8")

    return outputs
