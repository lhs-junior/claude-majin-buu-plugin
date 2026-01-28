---
id: getting-started-index
title: Getting Started with awesome-plugin
category: getting-started
difficulty: beginner
estimatedTime: 10
tags:
  - overview
  - introduction
  - quick-start
relatedTools:
  - memory_save
  - memory_recall
  - agent_create
  - tdd_red
prerequisites: []
version: "0.4.0"
---

# Welcome to awesome-plugin

awesome-plugin is a comprehensive toolkit that extends Claude Code with four powerful feature domains designed to enhance your development workflow. Whether you're managing complex project memories, orchestrating multi-step agent workflows, planning sophisticated projects, or practicing test-driven development, awesome-plugin provides the tools you need.

## Feature Domains

### Memory System
Store, retrieve, and semantically search project context using BM25 indexing. Perfect for maintaining documentation, design decisions, and project-specific knowledge.

**Key Tools:** `memory_save`, `memory_recall`, `memory_list`, `memory_forget`

### Agent System
Create and coordinate multiple specialist agents for complex tasks. Agents can be specialized in different domains and work together seamlessly.

**Key Tools:** `agent_create`, `agent_invoke`, `agent_response`, `agent_task_template`

### Planning System
Break down complex projects into structured milestones with dependencies, progress tracking, and team coordination support.

**Key Tools:** `plan_create`, `plan_add_milestone`, `plan_update_progress`, `plan_export`

### TDD Workflow
Implement test-driven development with structured RED-GREEN-REFACTOR cycles, integrated verification, and best practice enforcement.

**Key Tools:** `tdd_red`, `tdd_green`, `tdd_refactor`, `tdd_verify`

## Quick Start

### 1. Start with Memory
Save your first memory entry:
```
memory_save(
  key: "project-architecture",
  content: "My application uses microservices with Next.js frontend",
  tags: ["architecture", "project-overview"]
)
```

### 2. Create an Agent
Define a specialist agent for your workflow:
```
agent_create(
  name: "documentation-expert",
  role: "Technical writer",
  skills: ["documentation", "markdown", "API design"],
  personality: "clear, concise, user-focused"
)
```

### 3. Set Up Planning
Create your first project plan:
```
plan_create(
  title: "MVP Release",
  description: "First version of awesome-plugin",
  targetDate: "2026-03-01"
)
```

### 4. Practice TDD
Start a RED phase to define test requirements:
```
tdd_red(
  component: "UserAuth",
  testName: "should authenticate valid credentials",
  phase: "red"
)
```

## Next Steps

- **[Memory Basics](/guides/getting-started/memory-basics)** - Deep dive into the memory system
- **[Memory + Agent Integration](/guides/tutorials/memory-agent-integration)** - Combine systems for powerful workflows
- **[TDD Workflow](/guides/tutorials/tdd-workflow)** - Master test-driven development
- **[Tool Index](/guides/reference/tool-index)** - Complete reference of all 26 tools

## Tips for Success

1. **Start Small** - Begin with memory to understand the basics, then integrate other systems
2. **Document Decisions** - Use memory to capture architectural and design decisions
3. **Specialize Agents** - Create focused agents for specific domains (frontend, backend, testing, etc.)
4. **Plan Iteratively** - Break projects into small, manageable milestones
5. **Embrace TDD** - Let tests drive your implementation for better code quality

Happy building with awesome-plugin!
