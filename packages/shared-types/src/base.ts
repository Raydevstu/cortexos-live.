export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface BaseObject extends BaseEntity {
  title: string;
  summary: string;
}
