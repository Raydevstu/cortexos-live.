MASTER_CONSTITUTION.md of CortexOS.

CORTEXOS MASTER CONSTITUTION v1
SYSTEM IDENTITY

CortexOS is an AI-Native Software Creation Operating System.

It is not a chatbot.

It is not a note-taking application.

It is not a dashboard.

It is not a project management tool.

It is an Operating System for building software, managing knowledge, orchestrating AI agents, and compounding organisational intelligence.

The platform combines:

MainBrain
Jarvis
Librarian
Agent Mesh
Studios
Knowledge Graph
Terminal Sandbox
War Room

into a single unified system.

NORTH STAR

The goal of CortexOS is:

Idea

↓

Project

↓

Artifacts

↓

Knowledge

↓

Reusable Intelligence

↓

Organizational Memory


Every interaction should increase the intelligence of the system.

PRIMARY DESIGN RULE

The centre of CortexOS is:

MAINBRAIN


Not pages.

Not menus.

Not navigation.

Not modules.

Everything revolves around MainBrain.

MAINBRAIN

MainBrain is the Unified Intelligence Layer.

It combines:

Projects
Artifacts
Knowledge
Decisions
Agents
Workflows
Memory
Context
Relationships

MainBrain is not:

A database
A wiki
A graph
A project manager

MainBrain is a unified view across all of them.

MainBrain acts as the intelligence core of the operating system.

Every system connects to MainBrain.

LIBRARIAN

Librarian is the Knowledge Steward.

Responsibilities:

Ingestion
Classification
Knowledge extraction
Wiki maintenance
Knowledge graph maintenance
Search indexing
Relationship discovery
Pattern extraction
Memory synchronization

Librarian owns:

Wiki
Graph
Knowledge
Search
Memory


Librarian is visible.

Librarian appears in the Agent Dock.

Librarian is a first-class system agent.

JARVIS

Jarvis is the Operating System Supervisor.

Jarvis is not a worker.

Jarvis is not a specialist.

Jarvis acts as:

Planner
Governor
Router
Orchestrator
Program Manager
Reviewer
Supervisor

Jarvis owns:

Project State
Workflow State
Studio Assignment
Work Routing
Risk Monitoring
Phase Transitions
Governance
Quality Gates

Jarvis never directly performs specialist work.

Jarvis delegates specialist work to Studios.

AGENT MESH

All agent communication happens through Agent Mesh.

There is no direct agent-to-agent communication.

Incorrect:

Design → Development


Correct:

Design

↓

Agent Mesh

↓

Jarvis

↓

Agent Mesh

↓

Development


This guarantees:

Auditability
Consistency
Traceability
Governance
STUDIO ARCHITECTURE

Studios replace traditional application pages.

Every Studio is an execution environment.

Every Studio contains:

Agent

Knowledge

Memory

Tools

Skills

Templates

Playbooks

Rules

Constraints

Plugins


Studios:

Discovery Studio
Product Studio
Design Studio
Architecture Studio
Development Studio
QA Studio
Release Studio
AGENT DOCK

The Agent Dock replaces navigation.

Do not create:

Sidebar navigation
Traditional pages
Deep menu structures

The Agent Dock remains visible globally.

Example:

Jarvis

Librarian

Discovery

Product

Design

Architecture

Development

QA

Release


Each Dock Item represents:

A Live Agent
Current Task
Current Status
Agent Health
Workload
Activity State
AGENT EXPERIENCE

Clicking an Agent must NOT open a page.

Clicking an Agent summons a Workspace.

Example:

Click Design Agent

↓

Design Workspace Slides In

↓

User Interacts

↓

Workspace Closes

↓

Return To MainBrain


The UX should feel like:

Summoning a teammate
Not opening an application
TERMINAL SANDBOX

Terminal Sandbox is the execution engine.

Terminal Sandbox is NOT chat.

Terminal Sandbox is where work happens.

Inspiration:

Hermes
Claude Code
DeepSeek Harness
OpenHands

Capabilities:

Multi-provider execution
File operations
Context injection
Artifact generation
Tool execution
Project-aware reasoning

Example:

Provider:
GPT-5

Studio:
Architecture

Project:
Solar CRM

Mode:
Execution

> Design authentication architecture

PROVIDER ARCHITECTURE

Must use Provider Adapters.

Never hardcode providers.

Supported Providers:

OpenAI
Anthropic
Gemini
Grok
DeepSeek
OpenRouter
Ollama
LM Studio

Architecture:

Provider Adapter Layer

↓

Unified Model Interface

↓

Studios

HOME SCREEN

Home screen must remain clean.

Structure:

────────────────────────

Agent Dock

────────────────────────


────────────────────────

MainBrain

────────────────────────


────────────────────────

Terminal Sandbox

────────────────────────


No dashboard clutter.

No excessive widgets.

No application-launcher behaviour.

WAR ROOM

War Room is not navigation.

War Room is not the default screen.

War Room is a temporary execution mode.

Purpose:

Mission Control for a project.

Activation:

Enter War Room


Layout:

Knowledge Panel

↓

Agent Council

↓

Tool Panel

WAR ROOM LAYOUT

Left Panel:

Sources
Notes
Research
Browser
Search
Documents

Centre Panel:

Jarvis
Agent Council
Plans
Decisions
Timeline
Execution

Right Panel:

Studios
Tools
Apps
Artifacts
Generators
BRAIN MODE

Brain Mode focuses on navigation and intelligence.

Displays:

Knowledge Graph
Entities
Concepts
Relationships
Projects
Patterns
Decisions
ARTIFACT-FIRST ARCHITECTURE

CortexOS is Artifact Driven.

Not Prompt Driven.

Every output becomes an Artifact.

Examples:

PRD
Roadmap
Design System
Wireframe
Architecture Diagram
OpenAPI Spec
Database Schema
Source Code
Test Plan
Deployment Plan
DATA FLOW

All system activity follows:

User

↓

Jarvis

↓

Studio

↓

Artifact

↓

Librarian

↓

MainBrain

↓

Knowledge Graph

↓

Search

↓

Memory


Studios never write directly to MainBrain.

KNOWLEDGE RULES

Librarian owns:

Wiki
Graph
Search
Knowledge

Studios own:

Execution

Jarvis owns:

Coordination

MainBrain owns:

Intelligence
TECHNICAL ARCHITECTURE

Backend:

FastAPI
PostgreSQL
Neo4j
Qdrant
Redis
Temporal
MinIO

Frontend:

Next.js
TypeScript
Tailwind
shadcn/ui
React Flow
Framer Motion

Infrastructure:

Docker
Kubernetes
OpenTelemetry
Prometheus
Grafana
BUILD ORDER

Build in this exact sequence:

Phase 1
MainBrain Infrastructure

Phase 2
Librarian

Phase 3
Knowledge Graph

Phase 4
Search Engine

Phase 5
Studio SDK

Phase 6
Agent Dock

Phase 7
Design Studio

Phase 8
Discovery Studio

Phase 9
Product Studio

Phase 10
Architecture Studio

Phase 11
Development Studio

Phase 12
QA Studio

Phase 13
Release Studio

Phase 14
Jarvis

Phase 15
Terminal Sandbox

Phase 16
War Room

Phase 17
Brain Visualization

Phase 18
Agent Mesh

NON-NEGOTIABLE RULES
MainBrain is the center of the experience.
Agent Dock replaces navigation.
Studios are summoned, not opened.
Jarvis orchestrates.
Librarian maintains knowledge.
Everything becomes an Artifact.
Every Artifact enters Librarian.
Knowledge is cumulative.
Providers are adapter-based.
War Room is a mode, not a page.
MainBrain remains visible at all times.
The UI must feel like a living operating system, not a SaaS dashboard.
FINAL DIRECTIVE TO AI STUDIO

Build CortexOS as an AI-native operating system.

Do not build it as:

a dashboard
a knowledge base
a chatbot
a project management application
a note-taking application

Build it as:

MainBrain
+
Jarvis
+
Librarian
+
Agent Mesh
+
Studios
+
Terminal Sandbox
+
War Room


working together as one unified intelligent operating system where every interaction compounds into organisational knowledge and software delivery capability.

One extra recommendation: paste this first as the system/constitution prompt, then separately provide the technical blueprint (services, database schema, SDK contracts) as a second document. AI Studio performs significantly better when the vision and implementation instructions are separated rather than merged into one giant prompt.