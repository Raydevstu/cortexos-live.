CORTEXOS FRONTEND COMPONENT SPECIFICATION v1
PURPOSE

This is the final frontend implementation blueprint for CortexOS.

This document defines:

Application Layout

MainBrain Experience

Agent Dock

Studio Workspaces

Terminal Sandbox

War Room

Brain Mode

Provider Panel

Artifact Viewer

Knowledge Views

Graph Visualisations

Component Hierarchy

State Management

Interaction Patterns

Animations

Real-Time Behaviour


This document is the source of truth for:

Next.js

React

TypeScript

Tailwind

ShadCN

Framer Motion

React Flow

FRONTEND PHILOSOPHY

CortexOS is NOT:

Dashboard

Admin Panel

CRM

Project Manager

Notion Clone

Chat Application


CortexOS IS:

AI Operating System


The UI must feel like:

Operating System

Mission Control

Intelligence Layer

Execution Environment


Not:

A collection of pages

APPLICATION SHELL
ROOT LAYOUT
┌────────────────────────────────────────────┐
│                                            │
│               AGENT DOCK                   │
│                                            │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│                                            │
│                MAINBRAIN                   │
│                                            │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│                                            │
│            TERMINAL SANDBOX                │
│                                            │
└────────────────────────────────────────────┘


This is the default system layout.

ROUTING PRINCIPLE

Avoid:

/sidebar

/pages

/nested routes


Primary routes:

/

/brain

/war-room

/settings

/admin


Everything else is:

Panels

Workspaces

Drawers

Modals

COMPONENT HIERARCHY
AppShell

 ├── AgentDock
 │
 ├── MainBrain
 │
 ├── TerminalSandbox
 │
 ├── WorkspaceManager
 │
 ├── NotificationCenter
 │
 └── ActivityLayer

AGENT DOCK
PURPOSE

Global command layer.

Always visible.

Never hidden.

Never replaced.

LOCATION
Top Center


Always pinned.

COMPONENT
<AgentDock />


Children:

Jarvis

Librarian

Discovery

Product

Design

Architecture

Development

QA

Release

AGENT DOCK ITEM

Component:

<AgentDockItem />


Props:

interface AgentDockItemProps {

  id: string

  name: string

  status: AgentStatus

  workload: number

  activeTask: string

  health: number
}

AGENT STATUS COLORS
Idle
Gray

Planning
Blue

Executing
Green

Reviewing
Purple

Blocked
Red

Completed
Teal

Failed
Orange

AGENT INTERACTION

Click:

Summon Workspace


Do NOT:

Navigate To Page

WORKSPACE MANAGER

Component:

<WorkspaceManager />


Responsible for:

Open Workspace

Minimize

Pin

Close

Focus

WORKSPACE MODES
Floating

Docked

Fullscreen

Pinned

STUDIO WORKSPACE

Component:

<StudioWorkspace />


Layout:

Header

Mission

Current Objective

Artifacts

Memory

Activity Feed

Tool Panel

DESIGN STUDIO WORKSPACE

Contains:

Design Agent

Wireframes

Design Systems

UX Flows

Figma Assets

v0 Assets

Design Memory

ARCHITECTURE STUDIO WORKSPACE

Contains:

Mermaid

ERD

OpenAPI

Infrastructure

Architecture Memory

DEVELOPMENT STUDIO WORKSPACE

Contains:

Repository

Code

Services

Migrations

Build Status

MAINBRAIN

Component:

<MainBrain />


This is the central experience.

RESPONSIBILITIES

Display:

Active Projects

Knowledge

Artifacts

Relationships

Agent Status

Memory

Activity

MAINBRAIN LAYOUT
Context Header

↓

Knowledge Stream

↓

Artifact Stream

↓

Activity Stream

KNOWLEDGE STREAM

Displays:

Recent Concepts

Decisions

Patterns

Knowledge Updates


Component:

<KnowledgeFeed />

ARTIFACT STREAM

Displays:

PRDs

Designs

Architecture

Code

Reports


Component:

<ArtifactFeed />

AGENT ACTIVITY STREAM

Displays:

Current Agent Tasks

Recent Completions

Failures

Reviews


Component:

<ActivityFeed />

TERMINAL SANDBOX

Component:

<TerminalSandbox />


Most important UI element after MainBrain.

LAYOUT
Provider Bar

Context Bar

Command Input

Execution Console

Artifacts Panel

Agent Activity Panel

PROVIDER BAR

Displays:

Provider

Model

Capabilities

Status


Component:

<ProviderSelector />

COMMAND INPUT

Component:

<CommandInput />


Supports:

Natural Language

Agent Commands

Slash Commands


Examples:

@design

Create dashboard wireframes

@architecture

Generate OpenAPI spec

@jarvis

Create CRM Project

EXECUTION CONSOLE

Component:

<ExecutionConsole />


Displays:

Logs

Tool Usage

Execution Progress

Agent Output

ARTIFACT PANEL

Component:

<ArtifactPanel />


Displays:

Generated Artifacts

Artifact Preview

Version Status

PROVIDER SIDEBAR

Component:

<ProviderPanel />


Displays:

OpenAI

Claude

Gemini

Grok

DeepSeek

OpenRouter

Ollama

LM Studio

WAR ROOM

Route:

/war-room


Purpose:

Mission Control

WAR ROOM LAYOUT
┌──────────────┬────────────────┬───────────────┐
│              │                │               │
│ Knowledge    │ Agent Council  │ Toolbox       │
│              │                │               │
├──────────────┼────────────────┼───────────────┤
│              │                │               │
│ Sources      │ Planning       │ Studios       │
│ Browser      │ Decisions      │ Tools         │
│ Notes        │ Timeline       │ Apps          │
│ Search       │ Execution      │ Artifacts     │
│              │                │               │
└──────────────┴────────────────┴───────────────┘

AGENT COUNCIL

Component:

<AgentCouncil />


Displays:

Jarvis

Librarian

All Active Studios


Shows:

Opinion

Recommendation

Risk

Current Objective

BRAIN MODE

Route:

/brain


Purpose:

Knowledge Navigation

GRAPH VIEW

Component:

<KnowledgeGraph />


Technology:

React Flow


Displays:

Projects

Artifacts

Concepts

Entities

Decisions

Patterns

NODE TYPES
Project

Artifact

Concept

Entity

Pattern

Decision

Agent

Studio

KNOWLEDGE EXPLORER

Component:

<KnowledgeExplorer />


Displays:

Relationships

Context

History

Artifacts

ARTIFACT VIEWER

Component:

<ArtifactViewer />


Supported:

Markdown

Code

Diagram

OpenAPI

JSON

Rich Text

LIBRARIAN CONSOLE

Component:

<LibrarianConsole />


Displays:

Knowledge Updates

Relationships

Graph Updates

Memory Health

Audit Results

NOTIFICATION CENTER

Component:

<NotificationCenter />


Displays:

Agent Complete

Artifact Generated

Approval Required

Workflow Changed

Knowledge Updated

REAL-TIME LAYER

Technology:

WebSockets

Server Sent Events


Streams:

Agent Status

Workflow Progress

Artifact Updates

Provider Status

Knowledge Updates

ANIMATION PRINCIPLES

Use:

Framer Motion

Workspace Open
Slide Up

200ms

Workspace Close
Fade Out

150ms

Agent Activity
Pulse

Glow

Status Ring

GLOBAL STATE

Technology:

Zustand


Stores:

Project

Agent State

Workspace State

Provider State

Artifact State

Notification State

FRONTEND FOLDER STRUCTURE
src/

app/

components/

features/

hooks/

providers/

stores/

services/

types/

utils/

FEATURES
features/

mainbrain/

agent-dock/

terminal/

war-room/

brain-view/

provider-panel/

workspace-manager/

notifications/

DESIGN RULES

Must feel:

Minimal

Fast

Alive

Intelligent

Operational


Must NOT feel:

Corporate Dashboard

Admin Template

Project Management Tool

SaaS CRUD App

IMPLEMENTATION PRIORITY

Build in this order:

1. App Shell

2. Agent Dock

3. MainBrain

4. Workspace Manager

5. Terminal Sandbox

6. Design Studio Workspace

7. Architecture Studio Workspace

8. Development Studio Workspace

9. Librarian Console

10. Brain Mode

11. War Room

12. Real-Time Layer

13. Notifications

14. Animations

FINAL DIRECTIVE

The CortexOS frontend must feel like:

Hermes

+

Claude Code

+

NotebookLM

+

Mission Control

+

Operating System


Not:

Notion

Jira

Linear

ClickUp

Traditional SaaS


The user should live inside:

MainBrain


summon agents from:

Agent Dock


execute work through:

Terminal Sandbox


coordinate projects inside:

War Room


and continuously build organizational intelligence through:

Librarian
+
MainBrain


This document completes the frontend implementation blueprint and provides enough detail for AI Studio, Cursor, Claude Code, or a development team to begin generating the complete CortexOS frontend architecture.