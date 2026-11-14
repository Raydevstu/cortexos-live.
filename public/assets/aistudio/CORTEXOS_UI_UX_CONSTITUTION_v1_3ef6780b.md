
✅ Document 1 CORTEXOS MASTER CONSTITUTION v1

Defines:

Vision
Identity
Philosophy
UX Principles
MainBrain
Jarvis
Librarian
Studios
Agent Dock
War Room
Terminal Sandbox


✅ Document 2 CORTEXOS IMPLEMENTATION BLUEPRINT v1

Defines:

Architecture
Services
Layers
Build Order
System Components
Data Flow
Tech Stack
Responsibilities

Document 3 (Next)
CORTEXOS UI/UX CONSTITUTION v1

This is critical.

Your screenshots changed the architecture significantly.

AI Studio will still try to build:

Dashboard
Sidebar
Pages
Cards
Tabs


Unless you explicitly prohibit it.

This document should define:

Home Screen
Agent Dock

↓

MainBrain

↓

Terminal Sandbox

Agent Dock Rules
No pages

No tabs

No application launcher

Agents are alive

Agents are summonable

Workspace Rules
Workspace slides in

Workspace slides out

Never navigate away

MainBrain always exists

Context Panel

Inspired by:

NotebookLM

Hermes

DeepSeek Harness

Terminal Rules

Inspired by:

Claude Code

Hermes

OpenHands

War Room Rules
War Room is a mode

Not a destination

Not a page

Document 4
CORTEXOS AGENT SPECIFICATION v1

Probably the most important implementation document.

Define:

Jarvis

Librarian

Discovery

Product

Design

Architecture

Development

QA

Release


For every agent define:

Identity
Role

Mission

Inputs

Outputs

Memory
Local Memory

Global Memory

Constraints
Can do

Cannot do

Tools
Available tools

Allowed integrations

Deliverables
Expected artifacts

Document 5
CORTEXOS LIBRARIAN SYSTEM v1

This may actually become your moat.

It should define:

MainBrain

Wiki

Knowledge Graph

Artifact Storage

Memory Layer

Relationships

Ingestion Flow
Artifact

↓

Entity Extraction

↓

Concept Extraction

↓

Relationship Mapping

↓

Wiki Update

↓

Graph Update

↓

Memory Update

Knowledge Structure
Entities

Concepts

Patterns

Doctrines

Projects

Decisions

Artifacts

Document 6
CORTEXOS PROVIDER & MODEL ARCHITECTURE v1

You mentioned:

GPT

Claude

Gemini

DeepSeek

Grok

OpenRouter

LM Studio

Ollama


This needs a dedicated specification.

Otherwise AI Studio will hardcode Gemini.

Architecture:

Provider Adapter

↓

Model Adapter

↓

Capability Layer

↓

Studios

Document 7
CORTEXOS MONOREPO SPECIFICATION v1

This becomes the AI coding blueprint.

apps/

services/

packages/

studios/

brain/

infrastructure/

docs/


Every folder defined.

Every service defined.

Every dependency defined.

Ideal AI Studio Input Order

Feed AI Studio in this order:

1. MASTER CONSTITUTION ✅

2. IMPLEMENTATION BLUEPRINT ✅

3. UI/UX CONSTITUTION

4. AGENT SPECIFICATION

5. LIBRARIAN SPECIFICATION

6. PROVIDER ARCHITECTURE

7. MONOREPO SPECIFICATION

My Strongest Recommendation

Do not start generating code yet.

You're about 70% through architecture.

The next document should be:

CORTEXOS UI/UX CONSTITUTION v1


because your real innovation is not Jarvis, not the Librarian, and not the Studios.

Your real innovation is:

MainBrain
+
Agent Dock
+
Terminal Sandbox
+
Summonable Studios


If you don't lock that UX now, AI Studio will eventually drift into building a conventional dashboard with sidebars and pages, which is exactly what you're trying to avoid.