# Superpowers - Quality Evaluation

## Project Information

- **Repository**: [obra/superpowers](https://github.com/obra/superpowers)
- **Description**: An agentic skills framework & software development methodology
- **Stars**: 38,302 ⭐ (MASSIVE!)
- **Forks**: 2,915
- **License**: MIT
- **Created**: 2025-10-09
- **Last Updated**: 2026-01-28
- **Primary Language**: Shell (70.2%), JavaScript (19.1%), TypeScript (4.0%)

## Core Features

1. **Brainstorming Skill**: Interactive design refinement through Socratic questioning
2. **Planning Capability**: Breaks work into 2-5 minute tasks with file paths
3. **TDD Enforcement**: RED-GREEN-REFACTOR cycle, **deletes code written before tests**
4. **Subagent-driven Development**: Dispatches fresh agents per task
5. **Git Worktree Integration**: Isolated workspaces for parallel development
6. **Code Review Workflows**: Automated spec compliance

## Quality Score Calculation

### 1. Functional Improvement (0-30 points): **+28 points**

**Original**: Concept-level TDD suggestions (manual enforcement)

**Our Implementation**: Automated TDD workflow enforcement
- ✅ Auto-detect test runner (Jest/Vitest/Mocha)
- ✅ Enforce test-first discipline
- ✅ Integration with Planning (TODO + TDD tasks)
- ✅ Test coverage tracking
- ⚠️ **Simplified** (no code deletion, no git worktrees) → More user-friendly

**Improvements**:
- Concept → Automated enforcement (+15)
- Standalone → Integrated with Memory + Agent + Planning (+10)
- Full framework → Focused TDD tools (+3)

**Score**: 28/30 (excellent functional improvement)

---

### 2. Synergy Score (0-30 points): **+25 points**

**Integration Opportunities**:

#### With Planning (TODO Management)
- ✅ **TDD Task Type**: `planning_create(type: 'test', content: 'Write test for auth')`
- ✅ **Dependency**: TDD tasks as children of feature TODOs
- ✅ **Status Tracking**: RED (failing) → GREEN (passing) → REFACTOR (optimized)
- ✅ **Automatic Creation**: Agents can create TDD tasks

Example workflow:
```
1. Agent creates TODO: "Implement authentication"
2. Agent creates child TODO (type=test): "Write test for JWT validation"
3. Run tdd_red → Test fails (RED)
4. Run tdd_green → Implement code → Test passes (GREEN)
5. Run tdd_refactor → Optimize code → Tests still pass
6. Mark TODO as completed
```

#### With Agents
- ✅ **Test Agent**: Specialized agent for writing tests
- ✅ **Auto-TDD**: Agents can automatically follow TDD cycle
- ⚠️ **Conflict**: Superpowers has its own subagent system

#### With Memory
- ✅ **Test Coverage Memory**: Save coverage reports
- ✅ **Test History**: Track which tests pass/fail over time
- ✅ **Best Practices**: Save TDD patterns

**Synergy Strength**:
- Strong integration with Planning (+12)
- Good integration with Agents (+8)
- Good integration with Memory (+5)

**Score**: 25/30 (strong synergy)

---

### 3. Conflict Risk (-20 to 0 points): **-8 points**

**Identified Conflicts**:

#### Conflict 1: Planning Overlap
- **superpowers**: Has `/superpowers:write-plan` for breaking work into tasks
- **awesome-plugin**: Has `planning_create` for TODO management
- **Severity**: Medium (functional overlap)
- **Impact**: -5 points

**Resolution Options**:
1. **Merge**: Extend our `planning_create` with `type: 'tdd'` parameter
2. **Namespace**: Use `tdd_plan` vs `planning_create` (separate systems)
3. **Deprecate**: Don't absorb superpowers' planning, only TDD enforcement

**Recommended**: Option 1 (Merge) - Extend existing Planning

#### Conflict 2: Tool Naming
- **superpowers**: Uses `/superpowers:*` command pattern
- **awesome-plugin**: Uses `tool_name` MCP pattern
- **Severity**: Low (naming convention only)
- **Impact**: -2 points

**Resolution**:
- Rename to `tdd_red`, `tdd_green`, `tdd_refactor`, `tdd_verify`

#### Conflict 3: Architecture
- **superpowers**: Full framework with git worktrees, subagents, skills
- **awesome-plugin**: Simple tool-based architecture
- **Severity**: Low (we only absorb TDD concept, not full framework)
- **Impact**: -1 point

**Resolution**:
- Extract only TDD enforcement concept
- Simplify implementation (no git worktrees, no code deletion)
- Use existing agent system instead of subagents

**Total Conflict Risk**: -8 points

---

### 4. Maintainability (0-20 points): **+15 points**

**Dependencies**:
- Superpowers: Shell scripts, git, test runners (external)
- Our implementation: Node.js, detect test runner (Jest/Vitest/Mocha)
- **Dependency Score**: +10 (moderate dependencies)

**Code Complexity**:
- Superpowers: Full framework (complex)
- Our implementation: 4 simple tools
- **Complexity Score**: +5 (simple)

**Score**: 15/20 (good maintainability)

---

### 5. License Compatibility (0-20 points): **+20 points**

- **License**: MIT ✅
- **Commercial Use**: Allowed ✅
- **Attribution**: Required (we do this) ✅
- **Modification**: Allowed ✅

**Score**: 20/20 (perfect compatibility)

---

## Total Quality Score

```
Functional Improvement:  +28
Synergy Score:           +25
Conflict Risk:           -8
Maintainability:         +15
License:                 +20
─────────────────────────────
TOTAL:                   80/100
```

**Grade**: B
**Recommendation**: ✅ **APPROVE** (Absorption approved, with conflict resolution)

---

## Absorption Strategy

### What to Absorb

✅ **TDD Enforcement Concept**:
- RED-GREEN-REFACTOR workflow
- Test-first discipline
- Coverage tracking
- Integration with Planning

❌ **NOT Absorbing**:
- Full framework architecture
- Git worktree system
- Brainstorming skill
- Subagent system (we have our own)
- Code deletion feature (too aggressive)

### Implementation Plan

**4 Tools**:

1. **`tdd_red(description, testPath)`**
   - Create failing test
   - Auto-detect test runner
   - Run test and verify it fails
   - Create Planning TODO (type='test', status='red')

2. **`tdd_green(testPath, implementationPath)`**
   - Implement code to pass test
   - Run test and verify it passes
   - Update Planning TODO status to 'green'

3. **`tdd_refactor(filePath)`**
   - Refactor code
   - Re-run all tests
   - Verify tests still pass
   - Update Planning TODO status to 'refactored'

4. **`tdd_verify()`**
   - Run full test suite
   - Check coverage (target: 80%+)
   - Generate coverage report
   - Save to Memory

### Conflict Resolution

**Planning Integration** (Merge approach):

```typescript
// Extend planning_create with TDD support
planning_create({
  content: "Write test for authentication",
  type: "tdd",  // NEW: tdd type
  status: "red", // NEW: red/green/refactored
  testPath: "tests/auth.test.ts",
  parentId: "auth-feature-todo"
})
```

**Visualization**:
```
📋 TODO Dependency Tree

├─ ⏳ Implement authentication [feature]
│ ├─ 🔴 Write test for JWT validation [tdd, red]
│ ├─ 🟢 Write test for password hashing [tdd, green]
│ └─ ✅ Write test for token expiry [tdd, completed]
└─ ⏳ Deploy to production [deployment]

📊 TDD Summary:
  Red (failing): 1
  Green (passing): 1
  Completed: 1
  Coverage: 85%
```

### Synergy Examples

**Example 1: Agent + TDD + Planning**
```
User: "Implement user authentication"

1. Agent spawns with type='coder'
2. Agent creates Planning TODO: "Implement authentication"
3. Agent creates TDD TODO: "Write test for auth" (child)
4. Agent runs tdd_red → Creates failing test
5. Agent runs tdd_green → Implements code, test passes
6. Agent marks both TODOs as completed
7. Results saved to Memory
```

**Example 2: Coverage Tracking**
```
User: "Verify test coverage"

1. Run tdd_verify()
2. Get coverage report (e.g., 75%)
3. Save to Memory: "Test coverage: 75% (needs improvement)"
4. Create Planning TODOs for untested code
```

---

## User Decision Required

### Question 1: Planning Integration

How should we integrate TDD with Planning?

**Option A (Recommended)**: Merge - Extend `planning_create` with `type: 'tdd'`
- ✅ Unified TODO system
- ✅ Clean dependency tree
- ✅ Single source of truth

**Option B**: Namespace - Separate `tdd_task` and `planning_task`
- ✅ Clear separation
- ❌ Two separate systems
- ❌ Harder to visualize dependencies

**Option C**: Deprecate - Only TDD tools, no Planning integration
- ❌ No synergy
- ❌ Loses key value

**Vote**: `awesome-plugin vote tdd-integration-merge` or `tdd-integration-namespace`

### Question 2: Code Deletion Feature

Superpowers **deletes code written before tests**. Should we include this?

**Option A**: No deletion (Recommended)
- ✅ Less aggressive
- ✅ User-friendly
- ✅ Warns instead of deletes

**Option B**: Optional deletion
- Add `--strict` flag to enable deletion
- Default: warn only

**Vote**: `awesome-plugin vote tdd-no-deletion` or `tdd-optional-deletion`

---

## Next Steps

1. ✅ Quality evaluation complete (80/100)
2. ⏳ User decisions on conflicts
3. ⏳ Implement TDDManager (4 tools)
4. ⏳ Integrate with Planning (merge approach)
5. ⏳ Create test suite
6. ⏳ Update documentation
7. ⏳ Release v0.3.0

---

**Recommendation**: Proceed with absorption after user confirms conflict resolution approach.

**Risk Level**: Medium (due to Planning overlap, but manageable with merge approach)

**Expected Value**: High (TDD enforcement is valuable, strong synergy with Planning)
