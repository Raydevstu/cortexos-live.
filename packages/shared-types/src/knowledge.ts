import type { BaseEntity } from "./base";
import type { EntityType, RelationshipType, SourceType } from "./enums";

export interface Entity extends BaseEntity {
  name: string;
  entityType: EntityType;
  description: string;
  aliases: string[];
}

export interface Concept extends BaseEntity {
  name: string;
  description: string;
  domain: string;
  keywords: string[];
}

export interface Decision extends BaseEntity {
  projectId: string;
  title: string;
  context: string;
  decision: string;
  reasoning: string;
  impact: string;
  status: string;
}

export interface Pattern extends BaseEntity {
  name: string;
  category: string;
  description: string;
  reusabilityScore: number;
}

export interface Doctrine extends BaseEntity {
  name: string;
  description: string;
  sourcePatternId: string;
}

export interface Source extends BaseEntity {
  sourceType: SourceType;
  title: string;
  sourceUri: string;
  checksum: string;
}

export interface KnowledgeArticle extends BaseEntity {
  title: string;
  articleType: string;
  content: string;
  summary: string;
  generatedBy: string;
}

export interface Relationship extends BaseEntity {
  sourceId: string;
  targetId: string;
  relationshipType: RelationshipType;
}
