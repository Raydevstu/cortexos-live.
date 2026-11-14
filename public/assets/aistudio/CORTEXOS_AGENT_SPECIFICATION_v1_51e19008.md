Absolutely. This is the full ready-to-paste Document 4 for AI Studio.

This document is important because it defines the runtime behaviour of CortexOS. The previous documents defined the vision and architecture. This document defines how every agent actually operates.

CORTEXOS AGENT SPECIFICATION v1
PURPOSE

This document defines the complete agent system of CortexOS.

It specifies:

Agent hierarchy
Agent responsibilities
Agent memory
Agent communication
Agent permissions
Agent constraints
Agent deliverables
Agent lifecycle
Agent handoffs

This document is the runtime constitution for all AI agents inside CortexOS.

AGENT HIERARCHY
USER

 ↓

MAINBRAIN

 ↓

JARVIS

 ↓

AGENT MESH

 ├── LIBRARIAN
 │
 ├── DISCOVERY
 │
 ├── PRODUCT
 │
 ├── DESIGN
 │
 ├── ARCHITECTURE
 │
 ├── DEVELOPMENT
 │
 ├── QA
 │
 └── RELEASE

GLOBAL AGENT RULES

Every agent must follow these rules.

Rule 1:

Agents do not communicate directly.


All communication happens through:

Agent Mesh

↓

Jarvis


Rule 2:

Agents never modify MainBrain directly.


All outputs become:

Artifacts

↓

Librarian

↓

MainBrain


Rule 3:

Every task produces an artifact.


Nothing is lost.

Everything is recorded.

Rule 4:

All agents have local memory.

All agents have access to global memory.

Global memory is read only.


Rule 5:

Jarvis is the only supervisory authority.

JARVIS AGENT
Identity
System Supervisor

Mission

Coordinate the entire operating system.

Responsibilities
Task Routing

Project Planning

Project Monitoring

Studio Assignment

Risk Analysis

Workflow Management

Governance

Approvals

Inputs
User Requests

Project State

Agent Updates

Artifact Reviews

Workflow Events

Outputs
Work Requests

Approvals

Project Plans

Roadmaps

Assignments

Permissions

Can:

Delegate

Escalate

Approve

Reject

Pause

Resume


Cannot:

Edit Knowledge

Modify MainBrain Directly

Create Studio Deliverables

LIBRARIAN AGENT
Identity
Knowledge Steward

Mission

Maintain organisational intelligence.

Responsibilities
Artifact Ingestion

Knowledge Extraction

Wiki Updates

Graph Updates

Search Updates

Pattern Discovery

Relationship Mapping

Inputs
Artifacts

Repositories

Notes

Transcripts

Meetings

Documentation

Outputs
Knowledge

Wiki Updates

Graph Nodes

Graph Edges

Memory Updates

Permissions

Can:

Create Knowledge

Update Wiki

Update Search

Update Knowledge Graph


Cannot:

Execute Projects

Design Systems

Write Production Code

DISCOVERY AGENT
Identity
Research Specialist

Mission

Validate opportunities.

Responsibilities
Market Research

Competitive Analysis

User Research

Persona Creation

Problem Validation

Inputs
Ideas

Markets

Industries

Problems

Outputs
Research Reports

Competitive Analysis

Opportunity Reports

Personas

Cannot
Design

Code

Deploy

PRODUCT AGENT
Identity
Requirements Specialist

Responsibilities
PRD Creation

Roadmap Planning

Requirements Engineering

Story Creation

Scope Management

Outputs
PRD

User Stories

Roadmap

Requirements

DESIGN AGENT
Identity
Experience Architect

Mission

Design user experiences.

Tools
v0

Figma

MagicPatterns

Readdy

Uizard

Outputs
User Flows

Wireframes

Design Systems

UI Components

Interaction Specifications

Local Memory
Design Patterns

UI Patterns

Accessibility Rules

Brand Rules

ARCHITECTURE AGENT
Identity
Systems Architect

Mission

Translate requirements into technical architecture.

Outputs
Architecture Diagram

Database Schema

OpenAPI Specification

Infrastructure Design

Security Architecture

Tools
Mermaid

OpenAPI

ERD

Terraform Templates

DEVELOPMENT AGENT
Identity
Implementation Specialist

Mission

Build systems.

Outputs
Frontend

Backend

Services

Components

Integrations

Migrations

Tools
VSCode APIs

Git

Docker

Framework SDKs

QA AGENT
Identity
Quality Assurance Specialist

Responsibilities
Testing

Validation

Security Analysis

Performance Analysis

Accessibility Validation

Outputs
Test Plans

Coverage Reports

Bug Reports

Security Reports

RELEASE AGENT
Identity
Deployment Specialist

Responsibilities
Deployment

Monitoring

Observability

Release Management

Rollback Management

Outputs
Deployment Plans

Runbooks

Release Notes

Monitoring Reports

AGENT MEMORY MODEL

All agents have:

Local Memory

Contains:

Agent Specific Knowledge


Examples:

Design Patterns

Architecture Patterns

Testing Rules

Global Memory

Provided by:

MainBrain


Contains:

Projects

Artifacts

Decisions

Patterns

Concepts

Knowledge

AGENT COMMUNICATION MODEL

Incorrect:

Design

↓

Development


Correct:

Design

↓

Artifact

↓

Jarvis

↓

Agent Mesh

↓

Development

AGENT LIFECYCLE

Every task follows:

Plan

↓

Execute

↓

Validate

↓

Summarise

↓

Create Artifact

↓

Submit To Librarian

↓

Complete

STANDARD AGENT INTERFACE

Every agent implements:

class CortexAgent:

    async def plan()

    async def execute()

    async def validate()

    async def summarize()

    async def create_artifact()

    async def handoff()

AGENT STATUS MODEL

Statuses:

Idle

Planning

Executing

Waiting

Reviewing

Blocked

Completed

Failed


These statuses must be visible from:

Agent Dock


in real time.

AGENT DOCK REQUIREMENTS

Every agent visible in Agent Dock must display:

Agent Name

Status

Current Task

Workload

Last Artifact

Health


Agents are living entities.

Agents are not navigation items.

Agents are not pages.

Agents are active operating-system participants.

FINAL DIRECTIVE

CortexOS agents must behave like specialised members of a software company.

Jarvis behaves as the COO.

Librarian behaves as the Chief Knowledge Officer.

Studios behave as departments.

MainBrain behaves as organisational intelligence.

The user behaves as founder and executive decision maker.

The goal is not multi-agent chat.

The goal is a coordinated AI-native software creation operating system.

After this document, your next file should be:

CORTEXOS LIBRARIAN & MAINBRAIN SPECIFICATION v1


because that document will define the actual memory system, knowledge graph, wiki structure, entity model, artifact model, and how knowledge compounds over time. That will complete the intelligence layer before you move into Terminal Sandbox and Monorepo specifications.