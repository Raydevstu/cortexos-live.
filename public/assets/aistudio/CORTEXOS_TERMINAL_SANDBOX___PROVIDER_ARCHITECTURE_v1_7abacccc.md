CORTEXOS TERMINAL SANDBOX & PROVIDER ARCHITECTURE v1
PURPOSE

This document defines:

Terminal Sandbox
Provider Architecture
Model Architecture
Execution Environment
Agent Runtime
Studio Runtime
Tool Runtime
Context Injection System
Multi-Provider Routing
Execution Workflows

This specification determines how CortexOS executes work.

This is the execution layer of the operating system.

PHILOSOPHY

Most AI systems provide chat.

CortexOS provides execution.

The Terminal Sandbox is not:

Chat UI

Prompt Box

Assistant Window

Messenger


The Terminal Sandbox is:

Execution Environment

Agent Runtime

Work Surface

Command Center

POSITION IN CORTEXOS
USER

↓

MAINBRAIN

↓

JARVIS

↓

TERMINAL SANDBOX

↓

STUDIO

↓

ARTIFACT

↓

LIBRARIAN

↓

MAINBRAIN


The Terminal Sandbox is where execution begins.

CORE PRINCIPLE

Every operation inside CortexOS executes through:

Terminal Sandbox


Examples:

Research

PRD Generation

Design

Architecture

Code Generation

Testing

Deployments

Analysis

TERMINAL MODES

Terminal Sandbox supports five modes.

CHAT MODE

Purpose:

Discussion

Brainstorming

Questions

Clarification


Output:

Conversation


No artifacts required.

BUILD MODE

Purpose:

Create output


Examples:

Build PRD

Create Architecture

Generate Database Schema

Create Wireframes


Outputs:

Artifacts


Mandatory.

RESEARCH MODE

Purpose:

Discovery

Analysis

Investigation


Outputs:

Research Artifacts

Knowledge Artifacts

EXECUTE MODE

Purpose:

Perform actions

Call tools

Generate deliverables


Outputs:

Execution Artifacts

AGENT MODE

Purpose:

Direct Agent Invocation


Example:

@design

Create SaaS dashboard design

PROVIDER ARCHITECTURE

CRITICAL RULE:

Never hardcode model providers.

Everything uses adapters.

PROVIDER LAYER
Provider Adapter Layer

 ├── OpenAI
 ├── Anthropic
 ├── Google
 ├── Grok
 ├── DeepSeek
 ├── OpenRouter
 ├── Ollama
 └── LM Studio

PROVIDER CONTRACT

Every provider must implement:

class ProviderAdapter:

    connect()

    list_models()

    generate()

    stream()

    embeddings()

    cancel()

    health_check()

PROVIDER TYPES
Cloud Providers
OpenAI

Anthropic

Gemini

Grok

DeepSeek

OpenRouter

Local Providers
Ollama

LM Studio

vLLM

LocalAI

Enterprise Providers
Azure OpenAI

Vertex AI

Bedrock

MODEL LAYER

Providers are not models.

Providers expose models.

Example:

OpenAI

 └── GPT-5

Anthropic

 └── Claude

Google

 └── Gemini

DeepSeek

 └── DeepSeek-V3

MODEL REGISTRY

MainBrain maintains:

Model Registry


Stores:

Provider

Model

Capabilities

Costs

Limits

Context Window

Speed

Health

MODEL CAPABILITIES

Each model advertises:

Chat

Reasoning

Code

Vision

Audio

File Analysis

Tool Calling

Agent Tasks


Example:

{
  "model": "gpt-5",

  "capabilities": [
    "chat",
    "reasoning",
    "code",
    "tools"
  ]
}

MODEL ROUTER

Jarvis never targets models directly.

Jarvis targets capabilities.

Example:

Need Architecture Work

↓

Find Architecture Studio

↓

Find Required Capability

↓

Ask Model Router

↓

Select Best Model

CONTEXT SYSTEM

This is the most important subsystem.

CONTEXT SOURCES

Terminal automatically pulls context from:

Project

Artifacts

MainBrain

Knowledge Graph

Wiki

Memory

Agent Memory

Studio Memory

CONTEXT STACK
Layer 1

User Prompt

↓

Layer 2

Project Context

↓

Layer 3

Artifact Context

↓

Layer 4

Memory Context

↓

Layer 5

Knowledge Context

↓

Layer 6

Studio Context


Final prompt is generated automatically.

STUDIO EXECUTION

Example:

Create CRM Architecture


Flow:

User

↓

Terminal Sandbox

↓

Jarvis

↓

Architecture Studio

↓

OpenAI GPT-5

↓

Architecture Artifact

↓

Librarian

↓

MainBrain

TOOL EXECUTION LAYER

Terminal supports tools.

TOOL REGISTRY
Filesystem

Git

Search

Documentation

Database

Browser

Studio Tools

DESIGN TOOLS

Examples:

v0

Figma

MagicPatterns

Uizard

ARCHITECTURE TOOLS

Examples:

OpenAPI

Mermaid

Terraform

ERD Generator

DEVELOPMENT TOOLS

Examples:

GitHub

Docker

VSCode

CI/CD

AGENT INVOCATION

Terminal supports:

@jarvis

@librarian

@design

@architecture

@development

@qa


Example:

@architecture

Create multi-tenant SaaS architecture

MULTI-AGENT EXECUTION

Example:

Build CRM Application


Flow:

Jarvis

↓

Discovery

↓

Product

↓

Design

↓

Architecture

↓

Development

↓

QA

↓

Release


All coordinated automatically.

TERMINAL LAYOUT

Inspired by:

Hermes

Claude Code

OpenHands

DeepSeek Harness

HOME TERMINAL
╭───────────────────────────╮

Provider

Model

Project

Mode

───────────────────────────

Command Area

───────────────────────────

Execution Output

───────────────────────────

Artifacts

───────────────────────────

Agent Activity

╰───────────────────────────╯

PROVIDER PANEL

User can select:

Provider

Model

Execution Mode


Without changing workflows.

AGENT ACTIVITY PANEL

Displays:

Current Agent

Current Task

Status

Worklog

Artifact Pipeline


Live.

TERMINAL MEMORY

Terminal remembers:

Project Context

Previous Commands

Artifacts

Current Workflow

Agent State

EXECUTION HISTORY

Every command creates:

Command Record

Artifact Links

Agent Logs

Execution Metadata


Stored in MainBrain.

SANDBOX SECURITY

Terminal must isolate:

Projects

Studios

Files

Commands


Prevent:

Unauthorized Access

Cross Project Leakage

Unsafe Operations

PROVIDER FAILOVER

If provider fails:

OpenAI

↓

Fallback

↓

Anthropic

↓

Fallback

↓

Gemini


Automatic.

COST MANAGEMENT

Track:

Token Usage

Provider Cost

Studio Consumption

Project Consumption


Visible in MainBrain.

SUCCESS CRITERIA

Terminal Sandbox is successful when:

Any provider can be added without UI changes

Any model can be swapped without Studio changes

Studios execute through Terminal

Artifacts are created automatically

Execution is observable

Execution is traceable

Execution is reproducible

FINAL DIRECTIVE

Terminal Sandbox is not a chat interface.

Terminal Sandbox is the execution runtime for CortexOS.

Providers are plug-ins.

Models are resources.

Studios are executors.

Jarvis is the orchestrator.

Librarian is the knowledge maintainer.

MainBrain is the intelligence layer.

Every command must eventually become:

Execution

↓

Artifact

↓

Knowledge

↓

Memory

↓

Intelligence

NEXT DOCUMENT

After this, create:

CORTEXOS MONOREPO & SERVICE ARCHITECTURE v1


This will define:

Repository Structure

Apps

Packages

Services

SDKs

Database Layer

API Layer

Event Layer

Deployment Topology

Infrastructure Layout


and is the final architecture document before switching into actual code-generation specifications.