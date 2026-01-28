---
id: memory-agent-integration
title: Integrating Memory and Agent Systems
category: tutorials
difficulty: intermediate
estimatedTime: 25
tags:
  - memory
  - agents
  - integration
  - workflow
relatedTools:
  - memory_save
  - memory_recall
  - memory_search
  - agent_create
  - agent_invoke
  - agent_response
prerequisites:
  - getting-started-index
  - memory-basics
version: "0.4.0"
---

# Integrating Memory and Agent Systems

Combining Memory and Agent systems creates powerful workflows where agents can access project knowledge and store results for future reference. This tutorial walks through real-world integration patterns.

## Why Combine Memory + Agents?

Memory provides the knowledge base. Agents provide the execution capability. Together:

- **Agents recall context** before executing tasks
- **Agents save results** for future retrieval
- **Multiple agents share knowledge** through memory
- **Decisions are documented** automatically

## Architecture Pattern

```
┌─────────────────────────────────────┐
│     Agent Task Request              │
└────────────┬────────────────────────┘
             │
             ├─→ Query Memory (Context)
             │   - Recall relevant decisions
             │   - Understand constraints
             │
             ├─→ Execute Task
             │   - Use retrieved context
             │   - Perform action
             │
             ├─→ Save Result to Memory
             │   - Store outcome
             │   - Document decisions
             │
             └─→ Return Response
```

## Tutorial: Documentation Agent Workflow

### Step 1: Set Up Context Memory

First, save your project context so agents can understand the system:

```
memory_save(
  key: "project-tech-stack",
  content: "Frontend: Next.js 14, React 18, TailwindCSS. Backend: Node.js, Express. Database: PostgreSQL 15. Testing: Jest, Cypress. Deployment: Docker, Kubernetes.",
  tags: ["project", "technology", "stack"]
)

memory_save(
  key: "api-design-standard",
  content: "All APIs return JSON with structure: { success: boolean, data: T, error?: string }. HTTP status codes: 200 OK, 400 Bad Request, 401 Unauthorized, 500 Server Error. Use pagination with limit and offset.",
  tags: ["api", "standards", "design"]
)

memory_save(
  key: "naming-conventions",
  content: "Variables: camelCase. Constants: UPPER_SNAKE_CASE. Files: kebab-case. Classes: PascalCase. Functions: camelCase. Database tables: snake_case plural. Use descriptive names, avoid abbreviations except common ones.",
  tags: ["coding-standards", "naming"]
)
```

### Step 2: Create a Documentation Agent

Create an agent specialized in documentation:

```
agent_create(
  name: "doc-writer",
  role: "Technical Documentation Specialist",
  skills: ["markdown", "technical writing", "API documentation", "code examples"],
  personality: "clear, precise, user-focused",
  systemPrompt: "You are a documentation expert. Always follow project standards and conventions stored in memory. Check naming conventions and API standards before writing."
)
```

### Step 3: Agent Recalls Context Before Task

When the documentation agent gets a task, it first recalls context:

```
# Before generating API documentation:

1. doc-writer recalls standards:
   memory_recall(key: "api-design-standard")
   → Returns: API response format, HTTP status codes, pagination rules

2. doc-writer recalls naming conventions:
   memory_recall(key: "naming-conventions")
   → Returns: camelCase for functions, PascalCase for classes, etc.

3. doc-writer recalls tech stack:
   memory_recall(key: "project-tech-stack")
   → Returns: All technologies used in project

4. doc-writer generates documentation following all standards

5. doc-writer saves the result:
   memory_save(
     key: "api-documentation-users",
     content: "[Generated API docs for users endpoint]",
     tags: ["documentation", "api", "users"]
   )
```

### Step 4: Multiple Agents Sharing Knowledge

Create complementary agents that share memory:

```
# Create backend agent
agent_create(
  name: "backend-dev",
  role: "Backend Engineer",
  skills: ["Node.js", "Express", "PostgreSQL", "REST APIs"],
  personality: "thorough, detail-oriented"
)

# Create frontend agent
agent_create(
  name: "frontend-dev",
  role: "Frontend Engineer",
  skills: ["Next.js", "React", "TailwindCSS", "API integration"],
  personality: "user-focused, efficient"
)

# Task: Build user authentication
# Backend agent saves decision
memory_save(
  key: "auth-implementation",
  content: "Implemented JWT-based auth. Token endpoint at POST /api/auth/login. Returns { token, refreshToken, expiresIn }. Middleware validates token on protected routes.",
  tags: ["authentication", "implementation", "backend"]
)

# Frontend agent recalls and implements based on decision
frontend_agent: memory_recall(key: "auth-implementation")
→ Now frontend knows exact auth API contract
```

## Real-World Workflow Example

### Scenario: Build Search Feature

**Step 1: Create Memory Context**
```
memory_save(
  key: "search-requirements",
  content: "Need full-text search on products. Must search title, description, tags. Filter by category, price range, rating. Return results sorted by relevance.",
  tags: ["search", "requirements", "products"]
)
```

**Step 2: Backend Agent Designs Implementation**
```
agent_invoke(
  agent: "backend-dev",
  task: "Design search endpoint based on requirements in memory",
  context: {
    recallKeys: ["search-requirements", "api-design-standard", "naming-conventions"]
  }
)

# Backend agent:
# 1. Recalls search-requirements → understands what's needed
# 2. Recalls api-design-standard → follows response format
# 3. Recalls naming-conventions → uses correct naming
# 4. Designs: POST /api/products/search with params
# 5. Saves design to memory

memory_save(
  key: "search-endpoint-design",
  content: "POST /api/products/search { query, category?, minPrice?, maxPrice?, minRating? }. Returns paginated results with _score for relevance ranking.",
  tags: ["search", "api-design", "backend"]
)
```

**Step 3: Frontend Agent Implements UI**
```
agent_invoke(
  agent: "frontend-dev",
  task: "Implement search UI component",
  context: {
    recallKeys: ["search-endpoint-design", "project-tech-stack"]
  }
)

# Frontend agent:
# 1. Recalls search-endpoint-design → understands API contract
# 2. Recalls project-tech-stack → uses Next.js/React/TailwindCSS
# 3. Creates SearchComponent with proper API integration
# 4. Saves component implementation path to memory

memory_save(
  key: "search-ui-component",
  content: "Component at components/SearchProducts.tsx. Uses useSearch hook. Handles loading, error, results pagination.",
  tags: ["search", "ui", "frontend"]
)
```

**Step 4: Verify and Document**
```
agent_invoke(
  agent: "doc-writer",
  task: "Create end-to-end search feature documentation",
  context: {
    recallKeys: ["search-requirements", "search-endpoint-design", "search-ui-component"]
  }
)

# Documentation agent:
# 1. Recalls all three memory entries
# 2. Creates comprehensive documentation
# 3. Saves to memory

memory_save(
  key: "search-feature-docs",
  content: "[Complete feature documentation with requirements, API spec, UI component details]",
  tags: ["documentation", "search", "feature"]
)
```

## Integration Patterns

### Pattern 1: Context-Aware Task Execution
```
Agent Task Flow:
1. Agent recalls context memory
2. Agent understands constraints/standards
3. Agent executes task aligned with context
4. Agent returns result
```

### Pattern 2: Result Documentation
```
Agent Task Flow:
1. Agent executes task
2. Agent saves result to memory
3. Result tagged for future discovery
4. Other agents can build on this result
```

### Pattern 3: Multi-Agent Coordination
```
Agent Task Flow:
1. Agent A recalls shared context
2. Agent A completes first phase
3. Agent A saves handoff to memory
4. Agent B recalls handoff
5. Agent B continues work
6. Both agents updated same memory key
```

## Best Practices

1. **Establish Memory Foundation** - Set up all context before creating agents
2. **Use Consistent Tagging** - Tags should match across related entries
3. **Store Decisions in Memory** - Every significant decision gets saved
4. **Share Standards** - Save coding standards, conventions, requirements in memory
5. **Document Handoffs** - When agents hand off work, save state to memory
6. **Version Context** - Track when standards/requirements change

## Checking Results

After agent completes task:

```
# Verify agent output
agent_response(id: "task-123") → Get full response

# Confirm saved to memory
memory_search(query: "search feature") → Find all related entries

# Review by other agents
agent_invoke(
  agent: "code-reviewer",
  task: "Review search implementation against standards in memory"
)
```

## Next Steps

- Explore [TDD Workflow](/guides/tutorials/tdd-workflow) for quality assurance
- See [Tool Index](/guides/reference/tool-index) for detailed API references
- Combine all systems: Memory + Agents + TDD + Planning
