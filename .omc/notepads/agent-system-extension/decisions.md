# Agent System Extension - Architectural Decisions

## Date
2026-01-28

## Decision 1: JSON Storage for Specialist Configuration

### Context
Need to store specialist-specific configuration that varies by agent type.

### Options Considered
1. **Separate table per specialist type** (specialist_configs table with type-specific columns)
2. **JSON column** (single TEXT column with JSON data)
3. **Key-value pairs** (separate configs table with agent_id, key, value)

### Decision
Use JSON column (`specialist_config TEXT`)

### Rationale
- **Flexibility**: Each specialist type can have different config structure
- **Simplicity**: No schema changes needed for new config fields
- **Performance**: Adequate for our use case (config is small, read/write pattern)
- **Type Safety**: TypeScript provides compile-time safety at application layer

### Trade-offs
- **Pros**: Flexible schema, easy to extend, no migrations for config changes
- **Cons**: Not queryable with SQL, requires JSON parsing, no database-level validation

### Alternatives Rejected
- Separate tables: Too rigid, requires migrations for new fields
- Key-value: More complex queries, harder to maintain type safety

---

## Decision 2: Idempotent Schema Migration

### Context
Need to add new columns to existing agents table without breaking existing databases.

### Options Considered
1. **Migration script** (separate versioned migrations)
2. **Idempotent ALTER** (check and add if missing)
3. **Recreate table** (drop and create with new schema)

### Decision
Use idempotent ALTER TABLE with existence checks

### Rationale
- **Simplicity**: Runs automatically on initialization
- **Safety**: Checks prevent errors on repeated runs
- **No Version Tracking**: No need for migration version management
- **Backward Compatible**: Existing databases upgrade transparently

### Implementation
```sql
SELECT COUNT(*) FROM pragma_table_info('agents') WHERE name='specialist_config'
-- If count = 0, then ALTER TABLE ADD COLUMN
```

### Trade-offs
- **Pros**: Simple, automatic, safe to run multiple times
- **Cons**: Runs on every startup (but fast with existence check)

### Alternatives Rejected
- Migration script: Overkill for this stage of the project
- Recreate table: Would lose existing data

---

## Decision 3: Parent Task ID as String

### Context
Need to represent task hierarchies for multi-agent orchestration.

### Options Considered
1. **Foreign key to agents table** (REFERENCES agents(id))
2. **Plain TEXT column** (no constraint)
3. **Separate hierarchy table** (agent_hierarchy with parent/child)

### Decision
Use plain TEXT column with nullable constraint

### Rationale
- **Flexibility**: Can reference TODOs or other task types (not just agents)
- **Simplicity**: No complex join queries needed
- **Cross-feature**: Enables integration with Planning Manager's TODOs
- **Nullable**: Allows agents without parent tasks

### Trade-offs
- **Pros**: Flexible, simple, cross-feature compatible
- **Cons**: No referential integrity, orphaned references possible

### Future Enhancement
Consider adding validation logic in application layer if integrity becomes an issue.

---

## Decision 4: Memory Keys as JSON Array

### Context
Need to associate agents with multiple memory entries for context retrieval.

### Options Considered
1. **JSON array in TEXT column**
2. **Separate agent_memories junction table**
3. **Comma-separated string**

### Decision
Use JSON array in TEXT column

### Rationale
- **Structured Data**: JSON preserves array structure
- **Easy Parsing**: Native JSON parsing in JavaScript
- **Type Safety**: Can validate with TypeScript
- **Adequate Scale**: Memory keys are small, array parsing is fast

### Trade-offs
- **Pros**: Simple, type-safe, easy to serialize/deserialize
- **Cons**: Not queryable, no foreign key constraints

### Alternatives Rejected
- Junction table: Overkill for current needs, adds complexity
- Comma-separated: Fragile parsing, no type safety

---

## Decision 5: Extend Union Type vs Inheritance

### Context
Need to add 10 new specialist agent types to the system.

### Options Considered
1. **Extend union type** (add to AgentType union)
2. **Inheritance hierarchy** (BaseAgent, SpecialistAgent classes)
3. **Tag system** (agent_type + agent_tags columns)

### Decision
Extend the union type

### Rationale
- **Type Safety**: Exhaustive checking at compile time
- **Simplicity**: No complex class hierarchies
- **Compatibility**: Consistent with existing pattern
- **DX**: IDE autocomplete and type checking work well

### Trade-offs
- **Pros**: Type-safe, simple, consistent, good DX
- **Cons**: All types in one place (can grow large)

### Alternatives Rejected
- Inheritance: Adds complexity, not needed for current requirements
- Tag system: Less type-safe, more runtime validation needed

---

## Decision 6: Backward Compatibility Strategy

### Context
Existing code and databases must continue to work without modification.

### Approach
1. **Optional fields** in interfaces (all new fields use `?`)
2. **Null defaults** for database columns
3. **Options parameter** for create method (not required)
4. **Graceful handling** of missing fields

### Rationale
- **Zero Breaking Changes**: Existing code runs without modification
- **Progressive Enhancement**: New features are opt-in
- **Safety**: No risk of breaking production systems

### Validation
- ✅ Created tests that verify base agents still work
- ✅ Verified existing tests pass
- ✅ Build succeeds without errors

---

## Unresolved Issues

### Issue 1: Duplicate AgentType Definitions
**Location**:
- `src/features/agents/agent-store.ts` (14 types)
- `src/features/agents/agent-prompts/index.ts` (15 types)

**Impact**: Two sources of truth, risk of drift

**Recommendation**:
- Create shared `src/features/agents/types.ts`
- Export single canonical `AgentType` union
- Import in both files

**Priority**: Medium (not breaking, but creates maintenance burden)

---

## Future Considerations

### 1. Agent Registry Pattern
As agent types grow, consider implementing a registry pattern:
- Register agent handlers dynamically
- Plugin architecture for custom specialists
- Runtime type discovery

### 2. Configuration Validation
Add runtime validation for specialist configs:
- JSON schema validation
- Type-specific config interfaces
- Validation on create/update

### 3. Hierarchy Queries
If task hierarchies become complex, consider:
- Recursive CTEs for deep hierarchies
- Cached hierarchy paths
- Graph database for complex relationships

### 4. Memory Integration
Enhance memory key integration:
- Auto-fetch related memories on agent spawn
- Memory invalidation on agent completion
- Context assembly from memory keys
