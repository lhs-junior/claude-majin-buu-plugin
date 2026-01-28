---
slug: planning-workflow
title: Planning and TODO Tracking
category: tutorial
difficulty: intermediate
estimatedTime: 20
tags: [planning, todo, workflow, project-management]
relatedTools: [planning_create, planning_add_task, planning_list, planning_update, planning_delete]
prerequisites: [getting-started]
version: 1.0.0
excerpt: Structure your development process with file-based planning and TODO tracking for better project organization.
---

# Planning and TODO Tracking

The Planning system provides structured project management with file-based plans, TODO tracking, and progress monitoring. Plans are stored as markdown files in `.omc/plans/` for easy version control.

## Overview

The planning system offers:
- **File-based plans**: Plans stored as markdown in `.omc/plans/`
- **TODO tracking**: Structured tasks with status and priorities
- **Progress monitoring**: Track completion and time estimates
- **Version control friendly**: Markdown files work with git
- **Plan templates**: Pre-defined structures for common workflows

## Step 1: Create Your First Plan

Let's create a plan for a new feature:

```typescript
// Use the planning_create tool
{
  "name": "feature-authentication",
  "description": "Implement user authentication with JWT",
  "goals": [
    "Design auth architecture",
    "Implement JWT token generation",
    "Add login/logout endpoints",
    "Write comprehensive tests"
  ]
}
```

Expected output:
```json
{
  "success": true,
  "plan": {
    "id": "uuid-here",
    "name": "feature-authentication",
    "description": "Implement user authentication with JWT",
    "status": "active",
    "filePath": ".omc/plans/feature-authentication.md",
    "createdAt": 1234567890
  }
}
```

This creates a markdown file at `.omc/plans/feature-authentication.md`.

Hints:
- Use kebab-case for plan names
- Include clear, specific goals
- Keep descriptions concise

## Step 2: Add Tasks to Your Plan

Break down goals into actionable tasks:

```typescript
// Use the planning_add_task tool
{
  "planName": "feature-authentication",
  "task": "Design database schema for user table",
  "priority": "high",
  "estimatedTime": 60
}
```

Add more tasks:

```typescript
{
  "planName": "feature-authentication",
  "task": "Implement JWT token generation utility",
  "priority": "high",
  "estimatedTime": 120
}

{
  "planName": "feature-authentication",
  "task": "Create login endpoint with validation",
  "priority": "high",
  "estimatedTime": 90
}

{
  "planName": "feature-authentication",
  "task": "Write unit tests for auth module",
  "priority": "medium",
  "estimatedTime": 120
}
```

Check: Open `.omc/plans/feature-authentication.md` to see the structured plan

## Step 3: Update Task Status

Mark tasks as you work on them:

```typescript
// Use the planning_update tool
{
  "planName": "feature-authentication",
  "taskId": "uuid-of-task",
  "updates": {
    "status": "in-progress"
  }
}
```

Status options:
- `pending`: Not started (default)
- `in-progress`: Currently working on
- `completed`: Finished
- `blocked`: Can't proceed due to dependency

## Step 4: Track Progress

View plan progress and statistics:

```typescript
// Use the planning_status tool
{
  "planName": "feature-authentication"
}
```

Expected output:
```json
{
  "success": true,
  "plan": {
    "name": "feature-authentication",
    "status": "active",
    "tasks": {
      "total": 4,
      "completed": 1,
      "inProgress": 1,
      "pending": 2,
      "blocked": 0
    },
    "progress": {
      "percentage": 25,
      "estimatedTimeRemaining": 330
    }
  }
}
```

Check: Compare actual time spent vs estimates to improve future planning

## Step 5: List All Plans

See all your active plans:

```typescript
// Use the planning_list tool
{
  "filter": {
    "status": "active"
  }
}
```

Filter options:
- `status`: Filter by plan status (active, completed, archived)
- `tag`: Filter by tags
- `since`: Show plans created after timestamp

Hints:
- Use `status: "active"` to focus on current work
- Use `status: "completed"` to review past projects

## Step 6: Complete and Archive Plans

Mark a plan as complete:

```typescript
// Use the planning_update tool
{
  "planName": "feature-authentication",
  "updates": {
    "status": "completed"
  }
}
```

Archive old plans:

```typescript
{
  "planName": "feature-authentication",
  "updates": {
    "status": "archived"
  }
}
```

The plan file remains in `.omc/plans/` for reference.

## Plan Structure

Plans are stored as markdown files with frontmatter:

```markdown
---
id: uuid-here
name: feature-authentication
status: active
created: 2024-01-28T12:00:00Z
updated: 2024-01-28T14:30:00Z
---

# Feature: Authentication

## Description
Implement user authentication with JWT

## Goals
- Design auth architecture
- Implement JWT token generation
- Add login/logout endpoints
- Write comprehensive tests

## Tasks

### Task 1: Design database schema
- Status: completed
- Priority: high
- Estimated: 60 min
- Completed: 2024-01-28T13:00:00Z

### Task 2: Implement JWT utility
- Status: in-progress
- Priority: high
- Estimated: 120 min

### Task 3: Create login endpoint
- Status: pending
- Priority: high
- Estimated: 90 min

### Task 4: Write unit tests
- Status: pending
- Priority: medium
- Estimated: 120 min

## Progress
- Total: 4 tasks
- Completed: 1 (25%)
- In Progress: 1
- Remaining time: ~330 minutes
```

## Best Practices

### Creating Effective Plans

1. **Name clearly**: Use descriptive, kebab-case names
   - Good: `feature-user-auth`, `bugfix-memory-leak`, `refactor-api-layer`
   - Bad: `plan1`, `todo`, `stuff`

2. **Set realistic goals**: 3-7 high-level goals per plan
   - Too few: Plan is too narrow
   - Too many: Plan is unfocused

3. **Break into tasks**: Each goal becomes 2-5 tasks
   - Tasks should be completable in 1-4 hours
   - Very large tasks should be broken down further

### Task Management

1. **Prioritize effectively**:
   - `high`: Critical path, blockers, urgent work
   - `medium`: Important but not urgent
   - `low`: Nice to have, future improvements

2. **Estimate time**: Use actual time, not ideal time
   - Include testing and documentation
   - Add buffer for unexpected issues
   - Track actual vs estimated for learning

3. **Update status regularly**: Keep plans current
   - Update when starting a task
   - Mark completed immediately
   - Note blockers as they occur

### Workflow Integration

1. **Start day with planning**: Review active plans
2. **Pick task based on priority**: Focus on high-priority items
3. **Update as you work**: Keep status current
4. **End day with review**: Update progress and plan next day
5. **Archive completed plans**: Keep workspace clean

## Integration with Other Features

### Planning + Memory

Save planning insights to memory:

```typescript
memory_save({
  "key": "planning_lesson_time_estimates",
  "value": "Auth tasks take 50% longer than estimated due to testing",
  "metadata": {
    "category": "context",
    "tags": ["planning", "lessons-learned"]
  }
})
```

### Planning + Agents

Delegate plan-related tasks:

```typescript
// Create plan
planning_create({
  "name": "refactor-api-layer",
  "goals": ["improve error handling", "add validation", "enhance logging"]
})

// Delegate architecture work
agent_delegate({
  "agentType": "architect",
  "task": "Design improved error handling for refactor-api-layer plan"
})

// Delegate implementation
agent_delegate({
  "agentType": "refactorer",
  "task": "Implement error handling from refactor-api-layer plan"
})
```

### Planning + TDD

Structure TDD workflow with plans:

```typescript
// Create TDD plan
planning_create({
  "name": "tdd-user-service",
  "goals": ["write tests", "implement features", "refactor"]
})

// Add TDD tasks
planning_add_task({
  "planName": "tdd-user-service",
  "task": "Write tests for user creation",
  "priority": "high"
})

planning_add_task({
  "planName": "tdd-user-service",
  "task": "Implement user creation to pass tests",
  "priority": "high"
})

// Start TDD workflow
tdd_start({ "feature": "user service" })
```

## Common Planning Patterns

### Feature Development

```typescript
planning_create({
  "name": "feature-notifications",
  "goals": [
    "Design notification system",
    "Implement real-time delivery",
    "Add email notifications",
    "Create notification preferences UI"
  ]
})
```

### Bug Fixing

```typescript
planning_create({
  "name": "bugfix-session-timeout",
  "goals": [
    "Reproduce and document bug",
    "Identify root cause",
    "Implement fix",
    "Add regression tests"
  ]
})
```

### Refactoring

```typescript
planning_create({
  "name": "refactor-database-layer",
  "goals": [
    "Audit current implementation",
    "Design improved architecture",
    "Implement repository pattern",
    "Migrate existing code",
    "Update tests"
  ]
})
```

### Sprint Planning

```typescript
planning_create({
  "name": "sprint-2024-w05",
  "goals": [
    "Complete authentication feature",
    "Fix critical bugs",
    "Update documentation",
    "Performance improvements"
  ]
})
```

## Plan Templates

### Standard Feature Plan

```
Goals:
- Design & architecture
- Core implementation
- Error handling & validation
- Testing (unit + integration)
- Documentation

Tasks:
- High priority: Core functionality
- Medium priority: Edge cases, error handling
- Low priority: Optimizations, polish
```

### Bug Fix Plan

```
Goals:
- Reproduce bug reliably
- Identify root cause
- Implement fix
- Add regression tests

Tasks:
- Priority based on bug severity
- Include verification steps
```

### Refactoring Plan

```
Goals:
- Audit current code
- Design improvements
- Implement changes incrementally
- Maintain test coverage
- Update documentation

Tasks:
- Break into small, safe changes
- Test after each change
```

## Next Steps

- Explore **Agent Orchestration** for task delegation
- Learn **TDD Integration** for test-driven planning
- Check **Memory System** for saving planning insights

Use `guide_search` to find more tutorials and documentation.
