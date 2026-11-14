import type { KnowledgeQuery, KnowledgeResult } from "./query";

export interface MainBrainClient {
  retrieveContext(query: KnowledgeQuery): Promise<KnowledgeResult>;
}
