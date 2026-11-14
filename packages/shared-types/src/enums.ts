export type ProjectStatus =
  | "draft"
  | "active"
  | "paused"
  | "blocked"
  | "completed"
  | "archived";

export type ProjectPhase =
  | "discovery"
  | "product"
  | "design"
  | "architecture"
  | "development"
  | "qa"
  | "release"
  | "maintenance";

export type ArtifactStatus =
  | "draft"
  | "review"
  | "approved"
  | "indexed"
  | "connected"
  | "archived";

export type ArtifactType =
  | "research"
  | "persona"
  | "prd"
  | "roadmap"
  | "requirement"
  | "wireframe"
  | "ui_design"
  | "design_system"
  | "architecture"
  | "openapi"
  | "database_schema"
  | "infrastructure"
  | "source_code"
  | "integration"
  | "test_plan"
  | "security_report"
  | "release_plan"
  | "deployment"
  | "release_notes"
  | "doctrine"
  | "pattern";

export type EntityType =
  | "company"
  | "technology"
  | "framework"
  | "platform"
  | "provider"
  | "repository"
  | "service"
  | "database"
  | "infrastructure";

export type SourceType =
  | "pdf"
  | "url"
  | "repo"
  | "meeting"
  | "chat"
  | "video"
  | "document";

export type AgentStatus =
  | "idle"
  | "planning"
  | "executing"
  | "waiting"
  | "reviewing"
  | "blocked"
  | "completed"
  | "failed";

export type RelationshipType =
  | "CONTAINS"
  | "REFERENCES"
  | "USES"
  | "DEPENDS_ON"
  | "CREATED_BY"
  | "IMPLEMENTS"
  | "DERIVED_FROM"
  | "INFLUENCES"
  | "PART_OF"
  | "SUPERSEDES";

export type SecurityRole =
  | "Owner"
  | "Admin"
  | "Builder"
  | "Reviewer"
  | "Observer";
