---
id: tool-index
title: Complete Tool Index - All 26 Tools
category: reference
difficulty: advanced
estimatedTime: 20
tags:
  - reference
  - tools
  - api
  - complete-guide
relatedTools:
  - memory_save
  - memory_recall
  - agent_create
  - agent_invoke
  - plan_create
  - tdd_red
prerequisites: []
version: "0.4.0"
---

# Complete Tool Index - All 26 Tools

Reference guide for all tools in awesome-plugin organized by feature domain. Each tool includes usage pattern and common parameters.

## Memory System (6 tools)

### 1. memory_save
Store information with semantic tags for project knowledge base.

```
memory_save(
  key: string,
  content: string,
  tags: string[],
  metadata?: object
)
```

**Use Cases:** Document decisions, store specifications, save patterns

**Related Guides:** [Memory Basics](/guides/getting-started/memory-basics)

---

### 2. memory_recall
Retrieve specific memory entry by key.

```
memory_recall(
  key: string
)
```

**Returns:** { key, content, tags, metadata, createdAt, updatedAt }

**Related Guides:** [Memory Basics](/guides/getting-started/memory-basics)

---

### 3. memory_search
Semantic search using BM25 algorithm to find relevant entries.

```
memory_search(
  query: string,
  tags?: string[],
  topK?: number
)
```

**Returns:** Ranked array of matching entries with relevance scores

**Related Guides:** [Memory Basics](/guides/getting-started/memory-basics)

---

### 4. memory_list
List all memories, optionally filtered by tag.

```
memory_list(
  tag?: string,
  limit?: number,
  offset?: number
)
```

**Returns:** Paginated array of memory entries

**Related Guides:** [Memory Basics](/guides/getting-started/memory-basics)

---

### 5. memory_forget
Delete a memory entry by key.

```
memory_forget(
  key: string
)
```

**Returns:** { success: boolean, deleted: boolean }

**Related Guides:** [Memory Basics](/guides/getting-started/memory-basics)

---

### 6. memory_search_semantic
Advanced semantic search with metadata filtering and scoring.

```
memory_search_semantic(
  query: string,
  filters?: { importance?: "high" | "medium" | "low", tags?: string[] },
  limit?: number
)
```

**Returns:** Scored results with metadata

**Related Guides:** [Memory Basics](/guides/getting-started/memory-basics)

---

## Agent System (7 tools)

### 7. agent_create
Define a specialist agent with specific skills and personality.

```
agent_create(
  name: string,
  role: string,
  skills: string[],
  personality: string,
  systemPrompt?: string
)
```

**Returns:** { agentId, name, role, skills, createdAt }

**Related Guides:** [Memory + Agent Integration](/guides/tutorials/memory-agent-integration)

---

### 8. agent_invoke
Execute a task with a specific agent, optionally recalling memory context.

```
agent_invoke(
  agent: string,
  task: string,
  context?: { recallKeys?: string[], maxTokens?: number }
)
```

**Returns:** { taskId, agentName, status, result }

**Related Guides:** [Memory + Agent Integration](/guides/tutorials/memory-agent-integration)

---

### 9. agent_response
Retrieve the full response from a completed agent task.

```
agent_response(
  taskId: string
)
```

**Returns:** { taskId, agentName, task, result, executionTime, status }

**Related Guides:** [Memory + Agent Integration](/guides/tutorials/memory-agent-integration)

---

### 10. agent_list
List all available agents with their skills and personality.

```
agent_list()
```

**Returns:** Array of agents with full details

**Related Guides:** [Memory + Agent Integration](/guides/tutorials/memory-agent-integration)

---

### 11. agent_update
Modify agent properties after creation.

```
agent_update(
  agentId: string,
  updates: { role?: string, skills?: string[], personality?: string }
)
```

**Returns:** { agentId, updated: boolean, changes: object }

**Related Guides:** [Memory + Agent Integration](/guides/tutorials/memory-agent-integration)

---

### 12. agent_task_template
Create reusable task templates for agents.

```
agent_task_template(
  name: string,
  template: string,
  requiredParams: string[],
  defaultParams?: object
)
```

**Returns:** { templateId, name, createdAt }

**Related Guides:** [Memory + Agent Integration](/guides/tutorials/memory-agent-integration)

---

### 13. agent_task_history
Retrieve execution history for specific agent or task.

```
agent_task_history(
  agentId?: string,
  limit?: number
)
```

**Returns:** Array of past task executions with results

**Related Guides:** [Memory + Agent Integration](/guides/tutorials/memory-agent-integration)

---

## Planning System (6 tools)

### 14. plan_create
Create a new project plan with milestones and timeline.

```
plan_create(
  title: string,
  description: string,
  targetDate: string,
  milestones?: object[]
)
```

**Returns:** { planId, title, status: "active", createdAt }

**Related Guides:** [Getting Started](/guides/getting-started/index)

---

### 15. plan_add_milestone
Add milestone to existing plan with tasks and dependencies.

```
plan_add_milestone(
  planId: string,
  title: string,
  description: string,
  dueDate: string,
  tasks: string[],
  dependencies?: string[]
)
```

**Returns:** { milestoneId, planId, status: "pending", createdAt }

**Related Guides:** [Getting Started](/guides/getting-started/index)

---

### 16. plan_update_progress
Update progress on milestone or task with notes.

```
plan_update_progress(
  planId: string,
  milestoneId: string,
  taskId?: string,
  status: "pending" | "in_progress" | "completed",
  notes?: string
)
```

**Returns:** { updated: boolean, previousStatus, newStatus }

**Related Guides:** [TDD Workflow](/guides/tutorials/tdd-workflow)

---

### 17. plan_list_milestones
List all milestones in a plan with progress.

```
plan_list_milestones(
  planId: string
)
```

**Returns:** Array of milestones with progress percentages

**Related Guides:** [Getting Started](/guides/getting-started/index)

---

### 18. plan_export
Export plan as timeline or Gantt chart data.

```
plan_export(
  planId: string,
  format: "timeline" | "gantt" | "json"
)
```

**Returns:** Formatted plan data ready for visualization

**Related Guides:** [Getting Started](/guides/getting-started/index)

---

### 19. plan_dependencies
Analyze milestone dependencies and critical path.

```
plan_dependencies(
  planId: string
)
```

**Returns:** { criticalPath: string[], dependencies: object, estimatedDuration: number }

**Related Guides:** [Getting Started](/guides/getting-started/index)

---

## TDD System (4 tools)

### 20. tdd_red
Write failing tests that express requirements before implementation.

```
tdd_red(
  component: string,
  testName: string,
  testFile: string,
  requirements: string[]
)
```

**Returns:** { testFile, failingTests: number, generatedTests: object }

**Related Guides:** [TDD Workflow](/guides/tutorials/tdd-workflow)

---

### 21. tdd_green
Write minimal implementation to pass all failing tests.

```
tdd_green(
  component: string,
  testFile: string,
  implementation: string,
  goal: string
)
```

**Returns:** { implementationFile, testsPassing: number, totalTests: number }

**Related Guides:** [TDD Workflow](/guides/tutorials/tdd-workflow)

---

### 22. tdd_refactor
Improve code quality while maintaining test coverage.

```
tdd_refactor(
  component: string,
  testFile: string,
  focusAreas: string[]
)
```

**Returns:** { refactored: boolean, testsPassing: number, improvements: string[] }

**Related Guides:** [TDD Workflow](/guides/tutorials/tdd-workflow)

---

### 23. tdd_verify
Validate implementation meets quality and coverage standards.

```
tdd_verify(
  component: string,
  testFile: string,
  checks: string[]
)
```

**Returns:** { passed: boolean, coverage: number, details: object }

**Related Guides:** [TDD Workflow](/guides/tutorials/tdd-workflow)

---

## Utility Tools (3 tools)

### 24. context_save
Save tool execution context for debugging and analysis.

```
context_save(
  executionId: string,
  context: object,
  metadata?: object
)
```

**Returns:** { contextId, saved: boolean }

---

### 25. context_retrieve
Retrieve saved execution context for analysis.

```
context_retrieve(
  contextId: string
)
```

**Returns:** { context: object, metadata: object, timestamp: string }

---

### 26. health_check
Verify all systems operational and get performance metrics.

```
health_check()
```

**Returns:** { status: "healthy" | "degraded", services: object, uptime: number }

---

## Tool Organization by Use Case

### When Building a Feature
1. `memory_save` - Document feature requirements
2. `agent_create` - Create specialized agents
3. `tdd_red` - Write failing tests
4. `tdd_green` - Implement feature
5. `tdd_refactor` - Improve code
6. `tdd_verify` - Validate quality
7. `plan_update_progress` - Track completion

### When Documenting
1. `memory_search` - Find related context
2. `agent_create` - Create documentation agent
3. `agent_invoke` - Generate documentation
4. `memory_save` - Store documentation reference

### When Coordinating Team
1. `plan_create` - Create project plan
2. `plan_add_milestone` - Break into phases
3. `agent_create` - Assign specialist agents
4. `memory_save` - Document decisions
5. `plan_update_progress` - Track progress
6. `plan_export` - Share timeline with team

### When Investigating Issues
1. `context_save` - Capture execution state
2. `memory_search` - Find related solutions
3. `agent_invoke` - Get analysis from specialist
4. `context_retrieve` - Review captured context

## Quick Reference by Category

### Memory Tools
- Store: `memory_save`, `memory_search_semantic`
- Retrieve: `memory_recall`, `memory_search`, `memory_list`
- Manage: `memory_forget`

### Agent Tools
- Setup: `agent_create`, `agent_update`, `agent_list`
- Execute: `agent_invoke`, `agent_response`
- Organize: `agent_task_template`, `agent_task_history`

### Planning Tools
- Create: `plan_create`, `plan_add_milestone`
- Track: `plan_update_progress`, `plan_list_milestones`
- Analyze: `plan_dependencies`, `plan_export`

### TDD Tools
- Define: `tdd_red`
- Implement: `tdd_green`
- Improve: `tdd_refactor`
- Validate: `tdd_verify`

### Utility Tools
- Debug: `context_save`, `context_retrieve`
- Monitor: `health_check`

## Related Guides

- [Getting Started](/guides/getting-started/index) - Overview of all features
- [Memory Basics](/guides/getting-started/memory-basics) - Memory system deep dive
- [Memory + Agent Integration](/guides/tutorials/memory-agent-integration) - Combined workflows
- [TDD Workflow](/guides/tutorials/tdd-workflow) - Complete TDD guide

## API Documentation Links

For detailed API documentation, parameters, and examples, see:
- Memory API: `tools/memory/api.md`
- Agent API: `tools/agent/api.md`
- Planning API: `tools/planning/api.md`
- TDD API: `tools/tdd/api.md`
