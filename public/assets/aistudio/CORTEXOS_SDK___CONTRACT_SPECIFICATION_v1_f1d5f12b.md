CORTEXOS SDK & CONTRACT SPECIFICATION v1
PURPOSE

This document defines the shared software development kits, runtime contracts, interfaces, event contracts, domain contracts, and integration contracts for CortexOS.

This document is the source of truth for:

Agent SDK

Studio SDK

Provider SDK

Workflow SDK

Artifact SDK

MainBrain SDK

UI SDK

Event Contracts

Type Contracts

API Contracts


All services, agents, studios, applications, workers, and workflows must use these contracts.

No service may define incompatible contracts.

SDK ARCHITECTURE
packages/

agent-sdk/

studio-sdk/

provider-sdk/

workflow-sdk/

brain-sdk/

artifact-sdk/

event-sdk/

ui-sdk/

shared-types/

SHARED TYPES PACKAGE

Package:

shared-types


Purpose:

Single source of truth for all interfaces


Exports:

Project

Artifact

Decision

Concept

Entity

Studio

Agent

Provider

Workflow

Event

BASE CONTRACTS
BaseEntity
interface BaseEntity {
  id: string

  createdAt: string

  updatedAt: string

  createdBy?: string

  metadata?: Record<string, any>
}

BaseArtifact
interface BaseArtifact
  extends BaseEntity {

  projectId: string

  title: string

  artifactType: string

  status: string

  version: string

  summary?: string

  contentUri?: string
}

AGENT SDK

Package:

agent-sdk


Purpose:

Defines runtime behaviour for every CortexOS agent

Agent Contract
interface CortexAgent {

  id: string

  name: string

  role: string

  studioId: string

  status: AgentStatus

  plan(): Promise<void>

  execute(): Promise<void>

  validate(): Promise<void>

  summarize(): Promise<void>

  createArtifact(): Promise<void>

  handoff(): Promise<void>
}

Agent Status
type AgentStatus =
  | "idle"
  | "planning"
  | "executing"
  | "reviewing"
  | "blocked"
  | "completed"
  | "failed"

Agent Context
interface AgentContext {

  projectId: string

  workspaceId: string

  workRequestId: string

  memoryIds: string[]

  artifactIds: string[]

  constraints: string[]
}

Agent Response
interface AgentResponse {

  success: boolean

  summary: string

  artifactIds: string[]

  recommendations: string[]

  blockers: string[]
}

STUDIO SDK

Package:

studio-sdk


Purpose:

Provide a standard interface for all Studios

Studio Manifest
interface StudioManifest {

  id: string

  name: string

  version: string

  mission: string

  capabilities: string[]

  supportedArtifacts: string[]

  tools: string[]

  constraints: string[]
}

Studio Contract
interface Studio {

  manifest: StudioManifest

  initialize(): Promise<void>

  execute(
    request: WorkRequest
  ): Promise<WorkResponse>

  validate(
    artifactId: string
  ): Promise<boolean>

  handoff(): Promise<void>
}

Design Studio Contract
interface DesignStudio
  extends Studio {

  createWireframes()

  createFlows()

  createDesignSystem()

  accessibilityReview()
}

Architecture Studio Contract
interface ArchitectureStudio
  extends Studio {

  createArchitecture()

  createOpenAPI()

  createDatabaseSchema()

  createInfrastructure()
}

PROVIDER SDK

Package:

provider-sdk


Purpose:

Unified model abstraction layer

Provider Contract
interface ProviderAdapter {

  id: string

  name: string

  initialize()

  healthCheck()

  listModels()

  generate()

  stream()

  embed()

  cancel()
}

Supported Providers
OpenAI

Anthropic

Gemini

Grok

DeepSeek

OpenRouter

Ollama

LM Studio

Azure OpenAI

Provider Capabilities
interface ProviderCapability {

  chat: boolean

  reasoning: boolean

  coding: boolean

  tools: boolean

  files: boolean

  vision: boolean
}

Model Registry Contract
interface ModelDescriptor {

  provider: string

  model: string

  displayName: string

  capabilities: ProviderCapability

  contextWindow: number

  costInput: number

  costOutput: number

  available: boolean
}

WORKFLOW SDK

Package:

workflow-sdk


Purpose:

Temporal abstraction layer

Workflow Contract
interface CortexWorkflow {

  id: string

  name: string

  start()

  execute()

  monitor()

  rollback()

  complete()

  fail()
}

Activity Contract
interface Activity {

  id: string

  execute()

  validate()

  audit()
}

WORK REQUEST CONTRACT

Used by Jarvis.

interface WorkRequest {

  id: string

  projectId: string

  studioId: string

  objective: string

  constraints: string[]

  successCriteria: string[]

  contextArtifacts: string[]

  priority:
    | "low"
    | "medium"
    | "high"
    | "critical"
}

WORK RESPONSE CONTRACT
interface WorkResponse {

  requestId: string

  studioId: string

  status:
    | "completed"
    | "failed"
    | "blocked"

  artifactIds: string[]

  summary: string

  nextRecommendedPhase?: string
}

ARTIFACT SDK

Package:

artifact-sdk


Purpose:

Manage all Studio outputs

Artifact Contract
interface Artifact {

  id: string

  projectId: string

  artifactType: string

  title: string

  summary: string

  version: string

  contentUri: string

  metadata: Record<string, any>
}

Artifact Lifecycle
Draft

↓

Review

↓

Approved

↓

Indexed

↓

Connected

↓

Archived

MAINBRAIN SDK

Package:

brain-sdk


Purpose:

Unified access layer for MainBrain

Knowledge Query
interface KnowledgeQuery {

  query: string

  entityTypes?: string[]

  projects?: string[]

  limit?: number
}

Knowledge Result
interface KnowledgeResult {

  artifacts: Artifact[]

  concepts: Concept[]

  entities: Entity[]

  decisions: Decision[]

  relationships: Relationship[]
}

EVENT SDK

Package:

event-sdk


Purpose:

Common event contracts

Base Event
interface CortexEvent {

  id: string

  type: string

  timestamp: string

  source: string

  payload: Record<string, any>
}

Artifact Created Event
interface ArtifactCreatedEvent
  extends CortexEvent {

  artifactId: string

  projectId: string
}

Knowledge Created Event
interface KnowledgeCreatedEvent
  extends CortexEvent {

  knowledgeId: string
}

Agent Started Event
interface AgentStartedEvent
  extends CortexEvent {

  agentId: string
}

Provider Failed Event
interface ProviderFailedEvent
  extends CortexEvent {

  provider: string

  reason: string
}

UI SDK

Package:

ui-sdk


Purpose:

Shared UI components

Agent Dock Contract
interface AgentDockItem {

  id: string

  name: string

  status: string

  workload: number

  currentTask: string

  healthScore: number
}

Workspace Contract
interface Workspace {

  id: string

  agentId: string

  title: string

  state:
    | "open"
    | "closed"
    | "pinned"
}

Terminal Session Contract
interface TerminalSession {

  id: string

  provider: string

  model: string

  projectId: string

  mode:
    | "chat"
    | "build"
    | "research"
    | "execute"
    | "agent"
}

CONTRACT RULES
Rule 1

All services use SDK contracts.

Rule 2

No custom event formats.

Rule 3

No custom agent interfaces.

Rule 4

No direct provider implementation outside Provider SDK.

Rule 5

All artifacts use Artifact SDK.

Rule 6

All workflows use Workflow SDK.

Rule 7

All UI uses UI SDK contracts.

CODE GENERATION TARGETS

Generate:

TypeScript Interfaces

Python Pydantic Models

SQLAlchemy Models

OpenAPI Schemas

Temporal Contracts

Frontend Types

SDK Packages


from this specification.

IMPLEMENTATION FREEZE

After this document:

Architecture Layer ✅

Data Layer ✅

Workflow Layer ✅

SDK Layer ✅


The next document should be:

CORTEXOS FRONTEND COMPONENT SPECIFICATION v1

This will be the final major blueprint before code generation and will define every React component, layout, panel, Agent Dock behaviour, MainBrain experience, Terminal Sandbox UI, War Room UI, Studio Workspace system, and interaction pattern needed to build the CortexOS frontend exactly as envisioned.