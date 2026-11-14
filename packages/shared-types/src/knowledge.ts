import type { Artifact } from "./artifact";
import type { BaseEntity } from "./base";
import type {
  ArtifactType,
  DecisionStatus,
  EntityType,
  GraphNodeType,
  KnowledgeArticleType,
  RelationshipType,
  SearchSourceType,
  SourceType,
} from "./enums";
import type { Project } from "./project";

export interface Entity extends BaseEntity {
  organizationId?: string;
  name: string;
  entityType: EntityType;
  description: string;
  aliases: string[];
}

export interface Concept extends BaseEntity {
  organizationId?: string;
  name: string;
  description: string;
  domain: string;
  keywords: string[];
}

export interface Decision extends BaseEntity {
  organizationId?: string;
  projectId: string;
  title: string;
  context: string;
  decision: string;
  reasoning: string;
  impact: string;
  status: DecisionStatus | string;
}

export interface Pattern extends BaseEntity {
  organizationId?: string;
  name: string;
  category: string;
  description: string;
  reusabilityScore: number;
}

export interface Doctrine extends BaseEntity {
  organizationId?: string;
  name: string;
  description: string;
  sourcePatternId: string;
  approvedBy?: string | null;
}

export interface Source extends BaseEntity {
  organizationId?: string;
  projectId?: string | null;
  sourceType: SourceType;
  title: string;
  sourceUri: string;
  rawContent?: string;
  checksum: string;
}

export interface KnowledgeArticle extends BaseEntity {
  organizationId?: string;
  title: string;
  articleType: KnowledgeArticleType | string;
  content: string;
  summary: string;
  generatedBy: string;
}

export interface Relationship extends BaseEntity {
  organizationId?: string;
  sourceId: string;
  targetId: string;
  relationshipType: RelationshipType;
  weight?: number;
  confidence?: number;
}

export interface SearchDocument {
  id: string;
  sourceType: SearchSourceType;
  sourceId: string;
  projectId?: string | null;
  content: string;
  embeddingId?: string | null;
  indexedAt: string;
}

export interface GraphNode {
  id: string;
  label: string;
  nodeType: GraphNodeType;
  projectId?: string | null;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: RelationshipType;
  properties?: Record<string, unknown>;
}

export interface GraphSubgraph {
  rootId?: string | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface KnowledgeQuery {
  query: string;
  projectId?: string;
  entityTypes?: EntityType[];
  artifactTypes?: ArtifactType[];
  projects?: string[];
  limit?: number;
}

export interface KnowledgeResult {
  artifacts: Artifact[];
  concepts: Concept[];
  entities: Entity[];
  decisions: Decision[];
  patterns?: Pattern[];
  relationships: Relationship[];
}

export interface SearchRequestParams {
  query: string;
  projectId?: string;
  entityType?: EntityType;
  artifactType?: ArtifactType;
  limit?: number;
}

export interface SearchResponse {
  artifacts: Artifact[];
  concepts: Concept[];
  entities: Entity[];
  decisions: Decision[];
  articles?: KnowledgeArticle[];
  total: number;
}

export interface MainBrainContext {
  project?: Project | null;
  artifacts: Artifact[];
  decisions: Decision[];
  concepts: Concept[];
  entities: Entity[];
  patterns: Pattern[];
  articles: KnowledgeArticle[];
  relationships: Relationship[];
}

export interface CreateEntityRequest {
  organizationId?: string;
  name: string;
  entityType: EntityType;
  description: string;
  aliases?: string[];
  tags?: string[];
}

export interface CreateConceptRequest {
  organizationId?: string;
  name: string;
  description: string;
  domain: string;
  keywords?: string[];
  tags?: string[];
}

export interface CreateDecisionRequest {
  organizationId?: string;
  projectId: string;
  title: string;
  context: string;
  decision: string;
  reasoning: string;
  impact: string;
  status?: DecisionStatus;
}

export interface LibrarianIngestRequest {
  organizationId?: string;
  projectId?: string;
  artifactId?: string;
  sourceType?: SourceType;
  title: string;
  content: string;
  sourceUri?: string;
  metadata?: Record<string, unknown>;
}

export interface LibrarianIngestResult {
  sourceId?: string;
  artifactId?: string;
  entityIds: string[];
  conceptIds: string[];
  patternIds: string[];
  relationshipIds: string[];
  wikiArticleIds: string[];
  indexedCount: number;
}

export interface LibrarianExtractRequest {
  text: string;
  projectId?: string;
  artifactId?: string;
}

export interface LibrarianRelationshipRequest {
  sourceId: string;
  targetId: string;
  relationshipType: RelationshipType;
  confidence?: number;
}

export interface LibrarianSyncRequest {
  projectId?: string;
  fullReindex?: boolean;
}

export interface LibrarianAuditIssue {
  issueType:
    | "duplicate_knowledge"
    | "broken_reference"
    | "orphan_artifact"
    | "stale_knowledge"
    | "missing_relationship"
    | "missing_metadata"
    | "knowledge_gap";
  objectId: string;
  objectType: GraphNodeType | string;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface LibrarianAuditReport {
  checkedAt: string;
  projectId?: string | null;
  healthy: boolean;
  issueCount: number;
  issues: LibrarianAuditIssue[];
}
