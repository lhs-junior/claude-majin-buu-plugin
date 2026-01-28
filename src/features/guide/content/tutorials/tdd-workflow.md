---
id: tdd-workflow
title: Test-Driven Development Workflow
category: tutorials
difficulty: intermediate
estimatedTime: 30
tags:
  - tdd
  - testing
  - red-green-refactor
  - quality
  - workflow
relatedTools:
  - tdd_red
  - tdd_green
  - tdd_refactor
  - tdd_verify
  - agent_invoke
  - plan_update_progress
prerequisites:
  - getting-started-index
version: "0.4.0"
---

# Test-Driven Development Workflow

Master the RED-GREEN-REFACTOR cycle with awesome-plugin's integrated TDD tools. This tutorial teaches practical TDD implementation with structured phases and verification.

## The RED-GREEN-REFACTOR Cycle

Test-Driven Development follows three phases:

```
┌────────────────────────────────────────────────────────────┐
│                   RED PHASE                                │
│  Write failing tests that express requirements             │
│  - Define what the code should do                          │
│  - Tests fail because code doesn't exist yet               │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│                   GREEN PHASE                              │
│  Write minimal code to pass tests                          │
│  - Implement just enough to make tests pass                │
│  - Focus on correctness, not elegance                      │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│                   REFACTOR PHASE                           │
│  Improve code without changing behavior                    │
│  - Enhance readability and maintainability                 │
│  - Optimize performance                                    │
│  - Tests remain passing throughout                         │
└────────────────────────────────────────────────────────────┘
                         ↓
                    REPEAT CYCLE
```

## Core TDD Tools

### tdd_red - Define Requirements
Write failing tests that specify expected behavior.

```
tdd_red(
  component: "UserAuth",
  testName: "should authenticate valid credentials",
  testFile: "user-auth.test.ts",
  requirements: [
    "Accept email and password",
    "Return JWT token on success",
    "Hash password before storage"
  ]
)
```

Output: Test file with failing test cases expressing requirements.

### tdd_green - Implement Solution
Write minimal code to pass the red tests.

```
tdd_green(
  component: "UserAuth",
  testFile: "user-auth.test.ts",
  implementation: "user-auth.ts",
  goal: "All tests passing"
)
```

Output: Implementation that makes tests pass.

### tdd_refactor - Improve Quality
Enhance code while maintaining test coverage.

```
tdd_refactor(
  component: "UserAuth",
  testFile: "user-auth.test.ts",
  focusAreas: [
    "Reduce cyclomatic complexity",
    "Extract helper functions",
    "Improve variable naming"
  ]
)
```

Output: Refactored code with all tests still passing.

### tdd_verify - Validate Quality
Verify implementation meets quality standards.

```
tdd_verify(
  component: "UserAuth",
  testFile: "user-auth.test.ts",
  checks: [
    "all_tests_passing",
    "code_coverage > 85%",
    "no_linting_errors",
    "performance_acceptable"
  ]
)
```

Output: Quality report with pass/fail status.

## Tutorial: Build a Payment Processor

### Step 1: RED Phase - Write Requirements as Tests

```
tdd_red(
  component: "PaymentProcessor",
  testName: "process_valid_payment",
  testFile: "payment-processor.test.ts",
  requirements: [
    "Accept amount, currency, payment method",
    "Validate amount > 0",
    "Validate currency is supported (USD, EUR, GBP)",
    "Process through payment gateway",
    "Return transaction ID on success",
    "Return error on payment decline",
    "Log transaction for audit"
  ]
)
```

**Generated Test File:**
```typescript
describe("PaymentProcessor", () => {
  it("should process valid USD payment", () => {
    const processor = new PaymentProcessor();
    const result = processor.process({
      amount: 99.99,
      currency: "USD",
      method: "credit_card"
    });
    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();
  });

  it("should reject invalid amount", () => {
    const processor = new PaymentProcessor();
    const result = processor.process({
      amount: -10,
      currency: "USD",
      method: "credit_card"
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("invalid");
  });

  it("should reject unsupported currency", () => {
    const processor = new PaymentProcessor();
    const result = processor.process({
      amount: 50,
      currency: "XYZ",
      method: "credit_card"
    });
    expect(result.success).toBe(false);
  });
});
```

**Test Status:** All tests fail (RED) because PaymentProcessor doesn't exist yet.

### Step 2: GREEN Phase - Implement Solution

```
tdd_green(
  component: "PaymentProcessor",
  testFile: "payment-processor.test.ts",
  implementation: "payment-processor.ts",
  goal: "All tests passing"
)
```

**Generated Implementation:**
```typescript
export class PaymentProcessor {
  private supportedCurrencies = ["USD", "EUR", "GBP"];

  process(payment: {
    amount: number;
    currency: string;
    method: string;
  }) {
    // Validation
    if (payment.amount <= 0) {
      return {
        success: false,
        error: "Invalid amount - must be positive"
      };
    }

    if (!this.supportedCurrencies.includes(payment.currency)) {
      return {
        success: false,
        error: `Currency ${payment.currency} not supported`
      };
    }

    // Process payment
    const transactionId = this.generateTransactionId();
    this.logTransaction({
      amount: payment.amount,
      currency: payment.currency,
      transactionId,
      timestamp: new Date()
    });

    return {
      success: true,
      transactionId
    };
  }

  private generateTransactionId(): string {
    return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private logTransaction(details: any): void {
    console.log("Transaction logged:", details);
  }
}
```

**Test Status:** All tests pass (GREEN).

### Step 3: REFACTOR Phase - Improve Code Quality

```
tdd_refactor(
  component: "PaymentProcessor",
  testFile: "payment-processor.test.ts",
  focusAreas: [
    "Extract validation logic",
    "Separate concerns (validation, processing, logging)",
    "Improve error handling",
    "Add type safety"
  ]
)
```

**Refactored Implementation:**
```typescript
interface PaymentRequest {
  amount: number;
  currency: Currency;
  method: string;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

type Currency = "USD" | "EUR" | "GBP";

export class PaymentProcessor {
  private readonly validator = new PaymentValidator();
  private readonly gateway = new PaymentGateway();
  private readonly logger = new TransactionLogger();

  process(payment: PaymentRequest): PaymentResult {
    const validation = this.validator.validate(payment);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const transactionId = this.generateTransactionId();
    this.logger.log({ ...payment, transactionId });

    return {
      success: true,
      transactionId
    };
  }

  private generateTransactionId(): string {
    return `TXN-${Date.now()}-${this.randomToken()}`;
  }

  private randomToken(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

class PaymentValidator {
  private supportedCurrencies: Currency[] = ["USD", "EUR", "GBP"];

  validate(payment: PaymentRequest): { valid: boolean; error?: string } {
    if (payment.amount <= 0) {
      return { valid: false, error: "Amount must be positive" };
    }

    if (!this.supportedCurrencies.includes(payment.currency)) {
      return { valid: false, error: `Currency ${payment.currency} not supported` };
    }

    return { valid: true };
  }
}
```

**Test Status:** All tests still pass after refactoring.

### Step 4: VERIFY Phase - Quality Assurance

```
tdd_verify(
  component: "PaymentProcessor",
  testFile: "payment-processor.test.ts",
  checks: [
    "all_tests_passing",
    "code_coverage > 90%",
    "no_linting_errors",
    "type_safety_strict",
    "no_deprecated_apis"
  ]
)
```

**Verification Report:**
```
✓ All tests passing (4/4)
✓ Code coverage: 94%
✓ No linting errors
✓ Type safety: strict mode
✓ No deprecated APIs
✓ Ready for production

Next: Deploy to staging and run integration tests
```

## Workflow Integration

### Integrate with Planning
Track TDD progress in your project plan:

```
# In plan_update_progress
plan_update_progress(
  milestoneId: "payment-feature",
  taskId: "payment-processor",
  status: "in_progress",
  notes: "Completed TDD cycle: RED->GREEN->REFACTOR->VERIFY. All tests passing, 94% coverage."
)
```

### Integrate with Memory
Save TDD decisions and patterns:

```
memory_save(
  key: "tdd-payment-processor",
  content: "PaymentProcessor built with TDD. Separated validation, processing, logging concerns. Tests cover happy path and error cases.",
  tags: ["tdd", "payment", "patterns"]
)
```

### Integrate with Agents
Have agents review TDD implementation:

```
agent_invoke(
  agent: "code-reviewer",
  task: "Review PaymentProcessor TDD implementation",
  context: {
    files: ["payment-processor.test.ts", "payment-processor.ts"],
    recallKeys: ["tdd-payment-processor"]
  }
)
```

## TDD Best Practices

1. **Write Failing Tests First** - Red phase MUST come before implementation
2. **Minimal GREEN Implementation** - Don't over-engineer in green phase
3. **Refactor with Confidence** - Tests protect against breaking changes
4. **Focus on One Thing** - Each RED-GREEN-REFACTOR cycle tackles one feature
5. **Keep Tests Simple** - Tests should be easier to understand than code
6. **Test Behavior, Not Implementation** - Tests express what, not how
7. **Verify Quality** - Use tdd_verify to ensure standards

## Common Workflow

```
For each feature:

1. tdd_red(requirements)
   → Write failing tests

2. tdd_green(implementation)
   → Write minimal code passing tests

3. tdd_refactor(quality)
   → Improve without breaking tests

4. tdd_verify(checks)
   → Validate quality standards

5. plan_update_progress()
   → Track in project plan

6. memory_save()
   → Document pattern/decision

7. Next feature: Repeat
```

## Example: Complete Feature Cycle

```
# Feature: User password reset
tdd_red(component: "PasswordReset", testName: "reset_flow")
  → Tests: valid token, expired token, invalid email, token used twice

tdd_green(component: "PasswordReset", ...)
  → Implementation: generate token, validate, update password

tdd_refactor(component: "PasswordReset", ...)
  → Improved: extracted TokenManager, better error messages

tdd_verify(component: "PasswordReset", ...)
  → ✓ 100% coverage, all passing, production ready

plan_update_progress(taskId: "password-reset", status: "complete")
memory_save(key: "password-reset-tdd", content: "...")
```

## Next Steps

- Combine TDD with [Memory + Agent Integration](/guides/tutorials/memory-agent-integration)
- See [Tool Index](/guides/reference/tool-index) for detailed API reference
- Build your first feature using RED-GREEN-REFACTOR cycle
