---
slug: agent-orchestration
title: Agent Orchestration System
category: tutorial
difficulty: intermediate
estimatedTime: 25
tags: [agents, orchestration, delegation, specialization]
relatedTools: [agent_delegate, agent_status, agent_list]
prerequisites: [getting-started, memory-system]
version: 1.0.0
excerpt: Master the 10 specialized agents for delegating complex tasks with domain expertise and cross-feature integration.
---

# Agent Orchestration System

The Agent Orchestration System provides 10 specialized agents, each with domain expertise for handling specific types of tasks. Agents can access memory, planning, and TDD features for enhanced capabilities.

## Overview

Awesome Plugin includes these specialized agents:

1. **Architect**: System design, architecture, patterns
2. **Debugger**: Bug analysis, root cause investigation
3. **Refactorer**: Code cleanup, optimization, structure improvement
4. **Tester**: Test writing, coverage analysis, QA
5. **Docs Writer**: Documentation, comments, README files
6. **Performance**: Optimization, profiling, benchmarking
7. **Security**: Vulnerability scanning, secure coding practices
8. **Integration**: API integration, third-party services
9. **Frontend**: UI/UX, React, Vue, styling
10. **Backend**: Server logic, databases, APIs

## Step 1: Delegate Your First Task

Let's delegate a task to the Architect agent:

```typescript
// Use the agent_delegate tool
{
  "agentType": "architect",
  "task": "Design a database schema for user authentication with JWT tokens",
  "priority": "high"
}
```

Expected output:
```json
{
  "success": true,
  "sessionId": "uuid-here",
  "agent": "architect",
  "status": "completed",
  "result": {
    "analysis": "...",
    "recommendations": "...",
    "implementation": "..."
  }
}
```

The agent will analyze requirements and provide architectural guidance.

Hints:
- Be specific in your task description
- Include relevant context
- Set priority based on urgency (low, medium, high)

## Step 2: Check Agent Status

Monitor an agent's progress on a task:

```typescript
// Use the agent_status tool
{
  "sessionId": "uuid-from-previous-delegation"
}
```

This shows the current status, progress, and any intermediate results.

Check: Use this to track long-running tasks

## Step 3: Use the Debugger Agent

When you encounter a bug, delegate to the Debugger:

```typescript
{
  "agentType": "debugger",
  "task": "Investigate why authentication tokens expire too quickly",
  "priority": "high",
  "context": {
    "errorMessage": "JWT expired",
    "affectedFiles": ["src/auth/token.ts"]
  }
}
```

The Debugger agent will:
- Analyze the error
- Identify root causes
- Suggest fixes
- Provide debugging steps

## Step 4: Refactor Code with the Refactorer

Improve code quality and structure:

```typescript
{
  "agentType": "refactorer",
  "task": "Refactor the user authentication module for better testability",
  "priority": "medium",
  "context": {
    "files": ["src/auth/"],
    "goals": ["improve test coverage", "reduce coupling"]
  }
}
```

The Refactorer will suggest structural improvements and provide refactored code.

Hints:
- Specify refactoring goals
- Include current pain points
- Mention constraints (e.g., maintain backward compatibility)

## Step 5: Write Tests with the Tester

Generate comprehensive tests:

```typescript
{
  "agentType": "tester",
  "task": "Create unit tests for the authentication middleware",
  "priority": "high",
  "context": {
    "testFramework": "vitest",
    "coverageGoal": "80%"
  }
}
```

The Tester agent will:
- Design test cases
- Write test code
- Suggest edge cases
- Recommend coverage improvements

Check: Run the generated tests to ensure they pass

## Step 6: Optimize Performance

Use the Performance agent to identify bottlenecks:

```typescript
{
  "agentType": "performance",
  "task": "Optimize database query performance in user lookup",
  "priority": "medium",
  "context": {
    "currentResponseTime": "500ms",
    "targetResponseTime": "100ms"
  }
}
```

Expected analysis:
- Profiling results
- Bottleneck identification
- Optimization strategies
- Benchmarking recommendations

## Agent Specializations

### Architect
**Best for**: System design, patterns, architecture decisions

```typescript
{
  "agentType": "architect",
  "task": "Design a microservices architecture for scaling the application"
}
```

### Debugger
**Best for**: Bug investigation, error analysis, root cause finding

```typescript
{
  "agentType": "debugger",
  "task": "Find why memory usage increases over time"
}
```

### Refactorer
**Best for**: Code cleanup, structural improvements, pattern application

```typescript
{
  "agentType": "refactorer",
  "task": "Apply dependency injection pattern to improve testability"
}
```

### Tester
**Best for**: Test generation, coverage analysis, QA

```typescript
{
  "agentType": "tester",
  "task": "Design integration tests for the API endpoints"
}
```

### Docs Writer
**Best for**: Documentation, API docs, README files

```typescript
{
  "agentType": "docs-writer",
  "task": "Write comprehensive API documentation for the auth module"
}
```

### Performance
**Best for**: Optimization, profiling, benchmarking

```typescript
{
  "agentType": "performance",
  "task": "Profile and optimize the data processing pipeline"
}
```

### Security
**Best for**: Vulnerability scanning, secure coding, threat analysis

```typescript
{
  "agentType": "security",
  "task": "Audit the authentication system for security vulnerabilities"
}
```

### Integration
**Best for**: API integration, third-party services, webhooks

```typescript
{
  "agentType": "integration",
  "task": "Integrate with Stripe payment API for subscriptions"
}
```

### Frontend
**Best for**: UI/UX, React/Vue components, styling

```typescript
{
  "agentType": "frontend",
  "task": "Create a responsive dashboard component with dark mode"
}
```

### Backend
**Best for**: Server logic, databases, API design

```typescript
{
  "agentType": "backend",
  "task": "Design RESTful API endpoints for user management"
}
```

## Cross-Feature Integration

### Agents + Memory

Agents automatically access memory for context:

```typescript
// First, save relevant context
memory_save({
  "key": "coding_standards",
  "value": "Follow functional programming, use TypeScript strict mode",
  "metadata": { "category": "technical", "tags": ["standards"] }
})

// Agent will recall this when delegated
agent_delegate({
  "agentType": "refactorer",
  "task": "Refactor user service to follow coding standards"
})
```

### Agents + Planning

Agents can work within plans:

```typescript
// Create a plan
planning_create({
  "name": "feature-auth",
  "goals": ["implement JWT", "add tests"]
})

// Delegate tasks related to the plan
agent_delegate({
  "agentType": "architect",
  "task": "Design auth architecture for plan: feature-auth"
})
```

### Agents + TDD

Combine agents with TDD workflow:

```typescript
// Start TDD for a feature
tdd_start({ "feature": "user registration" })

// Delegate test writing to Tester
agent_delegate({
  "agentType": "tester",
  "task": "Write tests for user registration validation"
})

// Delegate implementation to Backend
agent_delegate({
  "agentType": "backend",
  "task": "Implement user registration endpoint"
})
```

## Best Practices

### Task Descriptions

1. **Be specific**: Clear requirements lead to better results
   - Good: "Design a caching layer for API responses with Redis"
   - Bad: "Make it faster"

2. **Include context**: Help agents understand the situation
   - Current state
   - Constraints
   - Goals

3. **Set clear priorities**: Helps agents focus on what matters
   - `high`: Urgent, blocking work
   - `medium`: Important but not urgent
   - `low`: Nice to have, future work

### Choosing the Right Agent

- **Design questions** → Architect
- **Bugs and errors** → Debugger
- **Code quality** → Refactorer
- **Testing needs** → Tester
- **Documentation gaps** → Docs Writer
- **Slow performance** → Performance
- **Security concerns** → Security
- **External APIs** → Integration
- **UI/UX work** → Frontend
- **Server logic** → Backend

### Agent Workflow

1. **Delegate clearly**: Provide complete task description
2. **Monitor progress**: Check status for long tasks
3. **Review results**: Validate agent output
4. **Iterate if needed**: Refine and re-delegate
5. **Document outcomes**: Save insights to memory

## Common Patterns

### Code Review Workflow

```typescript
// 1. Security review
agent_delegate({
  "agentType": "security",
  "task": "Review authentication code for vulnerabilities"
})

// 2. Performance check
agent_delegate({
  "agentType": "performance",
  "task": "Analyze authentication performance"
})

// 3. Test coverage
agent_delegate({
  "agentType": "tester",
  "task": "Check test coverage for auth module"
})
```

### Feature Development

```typescript
// 1. Architecture
agent_delegate({
  "agentType": "architect",
  "task": "Design feature: real-time notifications"
})

// 2. Implementation
agent_delegate({
  "agentType": "backend",
  "task": "Implement WebSocket notification system"
})

// 3. Testing
agent_delegate({
  "agentType": "tester",
  "task": "Write tests for notification system"
})

// 4. Documentation
agent_delegate({
  "agentType": "docs-writer",
  "task": "Document notification API"
})
```

### Debugging Workflow

```typescript
// 1. Investigation
agent_delegate({
  "agentType": "debugger",
  "task": "Find root cause of memory leak"
})

// 2. Fix
agent_delegate({
  "agentType": "refactorer",
  "task": "Refactor code to fix memory leak"
})

// 3. Verification
agent_delegate({
  "agentType": "performance",
  "task": "Verify memory leak is fixed through profiling"
})
```

## Next Steps

- Learn about **Planning Workflow** for structured task management
- Explore **TDD Integration** for test-driven development
- Check **Memory System** for context retention

Use `guide_search` to find more tutorials and documentation.
