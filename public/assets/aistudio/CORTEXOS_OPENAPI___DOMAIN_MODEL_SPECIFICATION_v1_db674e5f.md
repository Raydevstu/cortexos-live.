CORTEXOS OPENAPI & DOMAIN MODEL SPECIFICATION v1
PURPOSE

This document is the final architecture-to-code bridge for CortexOS.

This specification defines:

Domain Models
API Contracts
Request Schemas
Response Schemas
Event Schemas
Database Objects
Service Interfaces
SDK Contracts

This document is the source of truth for:

OpenAPI

FastAPI

Pydantic

SQLAlchemy

Typescript Clients

Agent SDK

Studio SDK


After this document, AI Studio should begin generating actual implementation code.

DOMAIN MODEL

Every object inside CortexOS inherits:

BaseObject:
  id: UUID
  title: string
  summary: string
  created_at: datetime
  updated_at: datetime
  created_by: string
  tags: string[]
  metadata: object

PROJECT DOMAIN
Project:
  id: UUID
  name: string
  description: string

  status:
    - draft
    - active
    - paused
    - blocked
    - completed
    - archived

  phase:
    - discovery
    - product
    - design
    - architecture
    - development
    - qa
    - release
    - maintenance

  owner_id: UUID

  created_at: datetime
  updated_at: datetime

ARTIFACT DOMAIN

Artifacts are first-class objects.

Every Studio output becomes an Artifact.

Artifact:
  id: UUID

  project_id: UUID

  title: string

  artifact_type:
    - research
    - persona
    - prd
    - roadmap
    - requirement
    - wireframe
    - ui_design
    - design_system
    - architecture
    - openapi
    - database_schema
    - infrastructure
    - source_code
    - integration
    - test_plan
    - security_report
    - release_plan
    - deployment
    - doctrine
    - pattern

  version: string

  status:
    - draft
    - review
    - approved
    - archived

  content_uri: string

  summary: string

  created_by: UUID

  created_at: datetime

  updated_at: datetime

ENTITY DOMAIN
Entity:
  id: UUID

  name: string

  entity_type:
    - company
    - technology
    - framework
    - platform
    - provider
    - repository
    - service
    - database
    - infrastructure

  description: string

  aliases: string[]

CONCEPT DOMAIN
Concept:
  id: UUID

  name: string

  description: string

  domain: string

  keywords: string[]

DECISION DOMAIN
Decision:
  id: UUID

  project_id: UUID

  title: string

  context: string

  decision: string

  reasoning: string

  impact: string

PATTERN DOMAIN
Pattern:
  id: UUID

  name: string

  category: string

  description: string

  reusability_score: integer

STUDIO DOMAIN
Studio:
  id: UUID

  name: string

  version: string

  mission: string

  enabled: boolean

  status:
    - active
    - disabled
    - maintenance

AGENT DOMAIN
Agent:
  id: UUID

  studio_id: UUID

  name: string

  role: string

  status:
    - idle
    - planning
    - executing
    - reviewing
    - blocked
    - completed

  health_score: integer

  current_task: string

WORK REQUEST DOMAIN

Created by Jarvis.

WorkRequest:
  id: UUID

  project_id: UUID

  studio_id: UUID

  objective: string

  constraints: string[]

  success_criteria: string[]

  context_artifacts: UUID[]

  priority:
    - low
    - medium
    - high
    - critical

WORK RESPONSE DOMAIN

Returned by Studios.

WorkResponse:
  id: UUID

  request_id: UUID

  studio_id: UUID

  status:
    - completed
    - failed
    - blocked

  artifact_ids: UUID[]

  summary: string

  next_recommended_phase: string

API VERSIONING

All APIs must use:

/api/v1


Future versions:

/api/v2


Must remain backwards compatible.

BRAIN SERVICE APIS
Projects
Create Project
POST /api/v1/projects


Request:

{
  "name": "Solar CRM",
  "description": "CRM platform for solar installers"
}


Response:

{
  "id": "uuid",
  "status": "draft",
  "phase": "discovery"
}

Get Project
GET /api/v1/projects/{id}

List Projects
GET /api/v1/projects

Update Project
PATCH /api/v1/projects/{id}

ARTIFACT APIS
Create Artifact
POST /api/v1/artifacts

Retrieve Artifact
GET /api/v1/artifacts/{id}

Search Artifacts
GET /api/v1/artifacts


Parameters:

project_id

artifact_type

status

ENTITY APIS
POST /api/v1/entities

GET /api/v1/entities

GET /api/v1/entities/{id}

CONCEPT APIS
POST /api/v1/concepts

GET /api/v1/concepts

GET /api/v1/concepts/{id}

DECISION APIS
POST /api/v1/decisions

GET /api/v1/decisions

GET /api/v1/decisions/{id}

JARVIS APIS
Create Work Request
POST /api/v1/jarvis/work


Request:

{
  "project_id": "uuid",
  "studio_id": "design",
  "objective": "Create CRM dashboard wireframes"
}

Advance Phase
POST /api/v1/jarvis/advance

Project State
GET /api/v1/jarvis/projects/{id}/state

Agent Status
GET /api/v1/jarvis/agents

LIBRARIAN APIS
Ingest Artifact
POST /api/v1/librarian/ingest

Extract Entities
POST /api/v1/librarian/extract/entities

Extract Concepts
POST /api/v1/librarian/extract/concepts

Build Relationships
POST /api/v1/librarian/relationships

Sync MainBrain
POST /api/v1/librarian/sync

STUDIO APIS

All Studios use the same interface.

Execute
POST /api/v1/studios/{studio_id}/execute

Validate
POST /api/v1/studios/{studio_id}/validate

Summarize
POST /api/v1/studios/{studio_id}/summarize

Handoff
POST /api/v1/studios/{studio_id}/handoff

SEARCH APIS

Hybrid Retrieval.

GET /api/v1/search


Parameters:

query:
project_id:
entity_type:
artifact_type:
limit:


Returns:

{
  "artifacts": [],
  "concepts": [],
  "entities": [],
  "decisions": []
}

GRAPH APIS
Retrieve Node
GET /api/v1/graph/nodes/{id}

Retrieve Project Graph
GET /api/v1/graph/projects/{project_id}

Retrieve Subgraph
GET /api/v1/graph/subgraph/{id}

PROVIDER APIS
List Providers
GET /api/v1/providers

Provider Health
GET /api/v1/providers/health

List Models
GET /api/v1/providers/{provider}/models

EVENT MODEL

Everything creates events.

Artifact Created
{
  "event": "artifact.created",
  "artifact_id": "uuid",
  "project_id": "uuid"
}

Knowledge Created
{
  "event": "knowledge.created",
  "knowledge_id": "uuid"
}

Agent Started
{
  "event": "agent.started",
  "agent_id": "uuid"
}

Agent Completed
{
  "event": "agent.completed",
  "agent_id": "uuid"
}

Workflow Completed
{
  "event": "workflow.completed",
  "workflow_id": "uuid"
}

GRAPH MODEL

Node Types:

Project

Artifact

Decision

Entity

Concept

Pattern

Studio

Agent

Workflow


Relationship Types:

CONTAINS

REFERENCES

USES

DEPENDS_ON

CREATED_BY

IMPLEMENTS

DERIVED_FROM

INFLUENCES

PART_OF

SECURITY MODEL

Roles:

Owner

Admin

Builder

Reviewer

Observer


Permissions must be policy-based.

Never hardcode role checks.

CODE GENERATION TARGETS

AI Studio must generate:

FastAPI

OpenAPI

SQLAlchemy

Alembic

Pydantic

Typescript SDK

Studio SDK

Agent SDK


from this specification.

IMPLEMENTATION FREEZE

After this document, architecture is complete.

The next documents are implementation documents:

CORTEXOS DATABASE SCHEMA & SQLALCHEMY SPECIFICATION v1

CORTEXOS TEMPORAL WORKFLOW SPECIFICATION v1

CORTEXOS SDK & CONTRACT SPECIFICATION v1

CORTEXOS FRONTEND COMPONENT SPECIFICATION v1


These are no longer architecture documents.

They are direct code-generation blueprints for AI Studio.