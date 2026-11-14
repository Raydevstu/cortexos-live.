import type {
  Artifact,
  Concept,
  Decision,
  Entity,
  Relationship,
} from "../../shared-types/src";

export interface KnowledgeQuery {
  query: string;
  entityTypes?: string[];
  projects?: string[];
  limit?: number;
}

export interface KnowledgeResult {
  artifacts: Artifact[];
  concepts: Concept[];
  entities: Entity[];
  decisions: Decision[];
  relationships: Relationship[];
}
