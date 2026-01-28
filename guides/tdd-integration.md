---
slug: tdd-integration
title: Test-Driven Development Workflow
category: tutorial
difficulty: intermediate
estimatedTime: 30
tags: [tdd, testing, workflow, red-green-refactor]
relatedTools: [tdd_start, tdd_write_test, tdd_run_tests, tdd_implement, tdd_refactor, tdd_status, tdd_complete]
prerequisites: [getting-started]
version: 1.0.0
excerpt: Follow test-driven development with structured Red-Green-Refactor cycles, test tracking, and implementation guidance.
---

# Test-Driven Development Workflow

The TDD system provides structured test-driven development with Red-Green-Refactor cycle tracking, test management, and implementation guidance.

## Overview

The TDD workflow supports:
- **Red-Green-Refactor cycles**: Structured TDD phases
- **Test tracking**: Monitor test status and coverage
- **Implementation guidance**: Suggestions for making tests pass
- **Refactoring support**: Safe code improvements with test coverage
- **Progress monitoring**: Track TDD sessions and outcomes

## Step 1: Start a TDD Session

Begin a new TDD session for a feature:

```typescript
// Use the tdd_start tool
{
  "feature": "user-registration",
  "description": "Implement user registration with email validation"
}
```

Expected output:
```json
{
  "success": true,
  "sessionId": "uuid-here",
  "phase": "red",
  "feature": "user-registration",
  "message": "TDD session started. Write your first failing test."
}
```

The session starts in the RED phase: write a failing test.

Hints:
- Use descriptive feature names
- Include clear descriptions
- One feature per session

## Step 2: Write a Failing Test (RED Phase)

Write a test that fails because the feature isn't implemented yet:

```typescript
// Use the tdd_write_test tool
{
  "sessionId": "uuid-from-start",
  "testPath": "tests/user-registration.test.ts",
  "testContent": `
import { describe, it, expect } from 'vitest';
import { registerUser } from '../src/auth/register';

describe('User Registration', () => {
  it('should register user with valid email', async () => {
    const result = await registerUser({
      email: 'user@example.com',
      password: 'SecurePass123!'
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('user@example.com');
  });
});
  `
}
```

This writes the test file and records it in the TDD session.

Check: Run tests to verify they fail (expected in RED phase)

## Step 3: Run Tests (Stay RED)

Run tests to confirm they fail:

```typescript
// Use the tdd_run_tests tool
{
  "sessionId": "uuid-here"
}
```

Expected output:
```json
{
  "success": true,
  "phase": "red",
  "testResults": {
    "total": 1,
    "passed": 0,
    "failed": 1,
    "status": "failing"
  },
  "message": "Tests failing as expected. Proceed to implement the feature."
}
```

The test fails because `registerUser` doesn't exist yet. This is correct for RED phase.

Hints:
- Tests should fail for the right reason
- Check error messages are meaningful
- Verify test logic is correct

## Step 4: Implement Feature (GREEN Phase)

Write minimal code to make the test pass:

```typescript
// Use the tdd_implement tool
{
  "sessionId": "uuid-here",
  "implementationPath": "src/auth/register.ts",
  "implementationContent": `
export interface RegisterInput {
  email: string;
  password: string;
}

export interface RegisterResult {
  success: boolean;
  user?: {
    email: string;
    id: string;
  };
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  // Minimal implementation to make test pass
  return {
    success: true,
    user: {
      email: input.email,
      id: 'temp-id'
    }
  };
}
  `
}
```

This transitions the session to GREEN phase.

Check: Run tests again to verify they pass

## Step 5: Verify Tests Pass (GREEN Phase)

Run tests to confirm they pass:

```typescript
{
  "sessionId": "uuid-here"
}
```

Expected output:
```json
{
  "success": true,
  "phase": "green",
  "testResults": {
    "total": 1,
    "passed": 1,
    "failed": 0,
    "status": "passing"
  },
  "message": "All tests passing! Consider refactoring if needed."
}
```

Now you can refactor with confidence.

## Step 6: Refactor (REFACTOR Phase)

Improve the code while keeping tests green:

```typescript
// Use the tdd_refactor tool
{
  "sessionId": "uuid-here",
  "refactoringDescription": "Add email validation and proper ID generation",
  "refactoredCode": `
import { randomUUID } from 'crypto';

export interface RegisterInput {
  email: string;
  password: string;
}

export interface RegisterResult {
  success: boolean;
  user?: {
    email: string;
    id: string;
  };
  error?: string;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  // Validate email
  if (!isValidEmail(input.email)) {
    return {
      success: false,
      error: 'Invalid email format'
    };
  }

  // Generate proper UUID
  const userId = randomUUID();

  return {
    success: true,
    user: {
      email: input.email,
      id: userId
    }
  };
}
  `
}
```

Check: Run tests after refactoring to ensure they still pass

## Step 7: Add More Tests (Back to RED)

Add tests for edge cases:

```typescript
{
  "sessionId": "uuid-here",
  "testPath": "tests/user-registration.test.ts",
  "testContent": `
import { describe, it, expect } from 'vitest';
import { registerUser } from '../src/auth/register';

describe('User Registration', () => {
  it('should register user with valid email', async () => {
    const result = await registerUser({
      email: 'user@example.com',
      password: 'SecurePass123!'
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('user@example.com');
  });

  it('should reject invalid email format', async () => {
    const result = await registerUser({
      email: 'invalid-email',
      password: 'SecurePass123!'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email format');
  });

  it('should generate unique user IDs', async () => {
    const result1 = await registerUser({
      email: 'user1@example.com',
      password: 'Pass123!'
    });

    const result2 = await registerUser({
      email: 'user2@example.com',
      password: 'Pass123!'
    });

    expect(result1.user.id).not.toBe(result2.user.id);
  });
});
  `
}
```

Cycle back to RED → GREEN → REFACTOR for each new test.

## Step 8: Monitor Progress

Check TDD session status:

```typescript
// Use the tdd_status tool
{
  "sessionId": "uuid-here"
}
```

Expected output:
```json
{
  "success": true,
  "session": {
    "sessionId": "uuid-here",
    "feature": "user-registration",
    "phase": "green",
    "cycles": 3,
    "tests": {
      "total": 3,
      "passing": 3,
      "failing": 0
    },
    "duration": "25 minutes"
  }
}
```

Track cycles completed and test coverage.

## Step 9: Complete the Session

Mark the TDD session as complete:

```typescript
// Use the tdd_complete tool
{
  "sessionId": "uuid-here",
  "notes": "Implemented user registration with email validation and UUID generation"
}
```

This archives the session and records statistics for learning.

## The Red-Green-Refactor Cycle

### RED Phase: Write Failing Test

**Goal**: Define expected behavior

```typescript
// Test describes what SHOULD happen
it('should validate email format', () => {
  expect(isValidEmail('test@example.com')).toBe(true);
  expect(isValidEmail('invalid')).toBe(false);
});
```

**Characteristics**:
- Test fails (function doesn't exist or returns wrong value)
- Failure message is clear and helpful
- Test is focused on one behavior

### GREEN Phase: Make It Pass

**Goal**: Write minimal code to pass the test

```typescript
// Simplest implementation that works
function isValidEmail(email: string): boolean {
  return email.includes('@') && email.includes('.');
}
```

**Characteristics**:
- Test passes
- Code is simple (not necessarily perfect)
- No extra features added

### REFACTOR Phase: Improve Code

**Goal**: Enhance quality while keeping tests green

```typescript
// Better implementation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}
```

**Characteristics**:
- Tests still pass
- Code is cleaner, more efficient, or more maintainable
- No behavior changes

## Best Practices

### Writing Tests

1. **Start with the simplest test**: Build complexity gradually
   ```typescript
   // Start here
   it('should return true for valid input', () => {
     expect(validate('valid')).toBe(true);
   });

   // Then add edge cases
   it('should return false for empty input', () => {
     expect(validate('')).toBe(false);
   });
   ```

2. **One assertion per test**: Tests are clearer and failures are specific
   ```typescript
   // Good: Clear failure point
   it('should set status to active', () => {
     expect(user.status).toBe('active');
   });

   it('should set created timestamp', () => {
     expect(user.createdAt).toBeDefined();
   });

   // Avoid: Multiple assertions
   it('should create user correctly', () => {
     expect(user.status).toBe('active');
     expect(user.createdAt).toBeDefined();
     expect(user.id).toBeDefined();
   });
   ```

3. **Test behavior, not implementation**: Focus on what, not how
   ```typescript
   // Good: Tests behavior
   it('should hash password before saving', async () => {
     await saveUser({ password: 'plain' });
     const saved = await getUser();
     expect(saved.password).not.toBe('plain');
   });

   // Avoid: Tests implementation
   it('should call bcrypt.hash', () => {
     expect(bcrypt.hash).toHaveBeenCalled();
   });
   ```

### Implementation

1. **Write minimum code**: Don't over-engineer
2. **Keep it simple**: Complexity comes through refactoring
3. **Focus on the test**: Only make the current test pass

### Refactoring

1. **Keep tests green**: Run tests after each change
2. **Make small changes**: Easy to revert if something breaks
3. **Common refactorings**:
   - Extract functions
   - Rename variables
   - Remove duplication
   - Improve error handling
   - Add types/interfaces

### TDD Workflow

1. **RED**: Write failing test first, always
2. **GREEN**: Write simplest code to pass
3. **REFACTOR**: Improve code quality
4. **REPEAT**: Add next test, start cycle again

## Integration with Other Features

### TDD + Planning

Structure TDD with plans:

```typescript
// Create plan for TDD feature
planning_create({
  "name": "tdd-auth-system",
  "goals": ["write tests", "implement", "refactor"]
})

// Start TDD session
tdd_start({
  "feature": "authentication",
  "planName": "tdd-auth-system"
})
```

### TDD + Agents

Use agents for test generation:

```typescript
// Delegate test writing
agent_delegate({
  "agentType": "tester",
  "task": "Generate comprehensive tests for user authentication"
})

// Use generated tests in TDD
tdd_write_test({
  "testContent": "... agent-generated tests ..."
})
```

### TDD + Memory

Save TDD insights:

```typescript
memory_save({
  "key": "tdd_lesson_edge_cases",
  "value": "Always test null, undefined, empty string, and boundary values",
  "metadata": {
    "category": "technical",
    "tags": ["tdd", "testing", "lessons"]
  }
})
```

## Common TDD Patterns

### Feature Development

```typescript
// 1. Start session
tdd_start({ "feature": "user-profile-update" })

// 2. Write tests for main path
tdd_write_test({ "testContent": "... happy path test ..." })

// 3. Implement feature
tdd_implement({ "implementationContent": "..." })

// 4. Add edge case tests
tdd_write_test({ "testContent": "... edge case tests ..." })

// 5. Handle edge cases
tdd_implement({ "implementationContent": "... updated code ..." })

// 6. Refactor
tdd_refactor({ "refactoredCode": "... cleaner code ..." })
```

### Bug Fixing with TDD

```typescript
// 1. Write test that reproduces bug
tdd_write_test({
  "testContent": "it('should not crash on null input', () => { ... })"
})

// 2. Verify test fails (reproduces bug)
tdd_run_tests()

// 3. Fix the bug
tdd_implement({ "implementationContent": "... bug fix ..." })

// 4. Verify test passes
tdd_run_tests()
```

### Refactoring with Test Coverage

```typescript
// 1. Write tests for current behavior
tdd_write_test({ "testContent": "... tests for existing code ..." })

// 2. Verify tests pass
tdd_run_tests()

// 3. Refactor code
tdd_refactor({ "refactoredCode": "... improved code ..." })

// 4. Verify tests still pass
tdd_run_tests()
```

## Measuring Success

### Coverage Metrics

- **Line coverage**: Aim for 80%+ on critical paths
- **Branch coverage**: Test all conditionals
- **Edge cases**: Null, empty, boundary values

### Quality Metrics

- **Test clarity**: Tests are easy to read and understand
- **Test speed**: Tests run quickly (< 1s for unit tests)
- **Test isolation**: Tests don't depend on each other
- **Failure messages**: Clear indication of what broke

### Process Metrics

- **Cycle time**: How long RED → GREEN → REFACTOR takes
- **Refactoring frequency**: How often you improve code
- **Test-first ratio**: Percentage of code written test-first

## Next Steps

- Explore **Agent Orchestration** for test generation
- Learn **Planning Workflow** for organizing TDD sessions
- Check **Memory System** for saving TDD insights

Use `guide_search` to find more tutorials and documentation.
