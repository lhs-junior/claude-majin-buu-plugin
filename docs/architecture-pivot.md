# Architecture Pivot: Gateway → Feature Integration

## Problem Statement

**Current Implementation** (Gateway Pattern):
- Connects to external MCP servers as separate processes
- Acts as a proxy/router between Claude and external tools
- User query → Gateway → External MCP Server → Result

**User's Actual Need** (Feature Integration Pattern):
- All features built-in to one supercharged plugin
- No external server dependencies for core features
- User query → Gateway → Internal Feature Module → Result

## New Architecture

### Directory Structure

```
src/
├── core/
│   ├── gateway.ts           # Modified: Integrate internal features
│   ├── mcp-client.ts        # Optional: Keep for external servers
│   ├── session-manager.ts   # Keep as is
│   └── tool-loader.ts       # Modified: Include internal tools
├── search/
│   ├── bm25-indexer.ts      # Keep as is
│   └── query-processor.ts   # Keep as is
├── features/                # NEW: Internal feature modules
│   ├── memory/
│   │   ├── memory-manager.ts    # Memory storage/retrieval
│   │   ├── memory-store.ts      # SQLite persistence
│   │   └── memory-tools.ts      # MCP tool definitions
│   ├── agents/
│   │   ├── agent-orchestrator.ts # Agent lifecycle management
│   │   ├── agent-registry.ts     # Active agents tracking
│   │   └── agent-tools.ts        # MCP tool definitions
│   └── planning/
│       ├── plan-manager.ts       # Plan/task tracking
│       ├── plan-store.ts         # SQLite persistence
│       └── plan-tools.ts         # MCP tool definitions
├── discovery/              # Keep as is
└── storage/
    └── metadata-store.ts   # Modified: Add feature-specific tables
```

### Feature Modules

Each feature module provides:
1. **Tool Definitions**: MCP-compatible tool schemas
2. **Business Logic**: Core functionality implementation
3. **Persistence**: SQLite tables for data storage
4. **Integration**: Register with Gateway and BM25 indexer

## Feature 1: Memory Management

### Inspired by claude-mem

**Core Capabilities**:
- Save information with semantic search
- Recall information via BM25 query
- Tag and categorize memories
- Auto-expire old memories (optional)

**Tools**:
```typescript
interface MemoryTools {
  memory_save: {
    input: {
      key: string;
      value: string;
      metadata?: {
        tags?: string[];
        category?: string;
        expiresAt?: number;
      };
    };
    output: { success: boolean; id: string };
  };

  memory_recall: {
    input: {
      query: string;
      limit?: number;
      category?: string;
    };
    output: {
      results: Array<{
        id: string;
        key: string;
        value: string;
        relevance: number;
        metadata: object;
      }>;
    };
  };

  memory_list: {
    input: {
      filter?: {
        category?: string;
        tags?: string[];
        since?: number;
      };
    };
    output: {
      memories: Array<{
        id: string;
        key: string;
        createdAt: number;
        metadata: object;
      }>;
    };
  };

  memory_forget: {
    input: { id: string };
    output: { success: boolean };
  };
}
```

**Storage Schema**:
```sql
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT,
  tags TEXT,  -- JSON array
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  access_count INTEGER DEFAULT 0,
  last_accessed INTEGER
);

CREATE INDEX idx_memories_category ON memories(category);
CREATE INDEX idx_memories_created ON memories(created_at);
```

## Feature 2: Multi-Agent Orchestration

### Inspired by oh-my-claudecode

**Core Capabilities**:
- Spawn specialized agents for subtasks
- Track agent status and results
- Parallel agent execution
- Agent result aggregation

**Agent Types**:
- `researcher`: Web search and analysis
- `coder`: Code generation and editing
- `tester`: Test execution and validation
- `reviewer`: Code review and quality checks

**Tools**:
```typescript
interface AgentTools {
  agent_spawn: {
    input: {
      type: 'researcher' | 'coder' | 'tester' | 'reviewer';
      task: string;
      timeout?: number; // milliseconds
    };
    output: {
      agentId: string;
      status: 'spawned';
    };
  };

  agent_status: {
    input: { agentId: string };
    output: {
      agentId: string;
      status: 'running' | 'completed' | 'failed' | 'timeout';
      progress?: string;
      startedAt: number;
    };
  };

  agent_result: {
    input: { agentId: string };
    output: {
      agentId: string;
      result: any;
      completedAt: number;
      duration: number;
    };
  };

  agent_terminate: {
    input: { agentId: string };
    output: { success: boolean };
  };

  agent_list: {
    input: { status?: string };
    output: {
      agents: Array<{
        agentId: string;
        type: string;
        status: string;
        startedAt: number;
      }>;
    };
  };
}
```

**Storage Schema**:
```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  task TEXT NOT NULL,
  status TEXT NOT NULL,
  result TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  timeout INTEGER
);

CREATE INDEX idx_agents_status ON agents(status);
```

## Feature 3: Planning & Task Management

### Inspired by planning-with-files

**Core Capabilities**:
- Create structured plans with tasks
- Track task status (pending/in_progress/completed)
- Task dependencies
- Progress tracking

**Tools**:
```typescript
interface PlanningTools {
  plan_create: {
    input: {
      title: string;
      description: string;
      tasks?: Array<{
        title: string;
        description?: string;
      }>;
    };
    output: {
      planId: string;
      taskIds: string[];
    };
  };

  plan_add_task: {
    input: {
      planId: string;
      title: string;
      description?: string;
      dependsOn?: string[]; // task IDs
    };
    output: {
      taskId: string;
    };
  };

  plan_update_task: {
    input: {
      taskId: string;
      status: 'pending' | 'in_progress' | 'completed' | 'blocked';
      notes?: string;
    };
    output: { success: boolean };
  };

  plan_get: {
    input: { planId: string };
    output: {
      plan: {
        id: string;
        title: string;
        description: string;
        createdAt: number;
        tasks: Array<{
          id: string;
          title: string;
          status: string;
          completedAt?: number;
        }>;
        progress: {
          total: number;
          completed: number;
          percentage: number;
        };
      };
    };
  };

  plan_list: {
    input: { status?: string };
    output: {
      plans: Array<{
        id: string;
        title: string;
        createdAt: number;
        taskCount: number;
        completedTasks: number;
      }>;
    };
  };
}
```

**Storage Schema**:
```sql
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  depends_on TEXT, -- JSON array of task IDs
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  completed_at INTEGER,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_plan ON tasks(plan_id);
CREATE INDEX idx_tasks_status ON tasks(status);
```

## Integration Strategy

### Phase 1: Memory Management (Week 1)
1. Create `src/features/memory/` directory
2. Implement MemoryManager with CRUD operations
3. Add SQLite schema for memories table
4. Define MCP tools and register with Gateway
5. Integrate with BM25 indexer for semantic search
6. Test with examples

### Phase 2: Multi-Agent (Week 2)
1. Create `src/features/agents/` directory
2. Implement AgentOrchestrator for lifecycle management
3. Define agent types and their capabilities
4. Add SQLite schema for agents table
5. Implement async agent execution
6. Test parallel agent spawning

### Phase 3: Planning (Week 3)
1. Create `src/features/planning/` directory
2. Implement PlanManager with task dependencies
3. Add SQLite schemas for plans and tasks
4. Implement progress tracking
5. Test complex multi-task plans

### Phase 4: Integration & Polish (Week 4)
1. Update Gateway to prioritize internal tools
2. Add all internal tools to BM25 index
3. Update CLI with feature-specific commands
4. Comprehensive testing
5. Documentation updates

## Gateway Modifications

```typescript
// Modified gateway.ts
export class AwesomePluginGateway {
  private memoryManager: MemoryManager;
  private agentOrchestrator: AgentOrchestrator;
  private planManager: PlanManager;

  constructor(options: GatewayOptions) {
    // Initialize internal features
    this.memoryManager = new MemoryManager(options.dbPath);
    this.agentOrchestrator = new AgentOrchestrator();
    this.planManager = new PlanManager(options.dbPath);

    // Register internal tools
    this.registerInternalTools();

    // Optional: Keep external MCP server support
    if (options.enableExternalServers) {
      this.initializeExternalServers();
    }
  }

  private registerInternalTools() {
    const memoryTools = this.memoryManager.getToolDefinitions();
    const agentTools = this.agentOrchestrator.getToolDefinitions();
    const planTools = this.planManager.getToolDefinitions();

    // Register with tool loader
    this.toolLoader.registerTools([
      ...memoryTools,
      ...agentTools,
      ...planTools,
    ]);

    // Index in BM25 for search
    this.bm25Indexer.addDocuments([
      ...memoryTools,
      ...agentTools,
      ...planTools,
    ]);
  }

  async handleToolCall(name: string, args: unknown): Promise<any> {
    // Route to internal features first
    if (name.startsWith('memory_')) {
      return this.memoryManager.handleToolCall(name, args);
    }
    if (name.startsWith('agent_')) {
      return this.agentOrchestrator.handleToolCall(name, args);
    }
    if (name.startsWith('plan_')) {
      return this.planManager.handleToolCall(name, args);
    }

    // Fall back to external MCP servers
    return this.routeToExternalServer(name, args);
  }
}
```

## Benefits of New Architecture

1. **No External Dependencies**: All core features built-in
2. **Faster Execution**: No subprocess spawning overhead
3. **Better Integration**: Shared SQLite database, unified session
4. **Easier Testing**: Direct function calls, no IPC
5. **Token Efficiency**: BM25 search works across all tools (internal + external)
6. **Extensibility**: Easy to add new feature modules

## Backwards Compatibility

- Keep MCPClient for external server support (optional)
- Gateway can work in 3 modes:
  1. **Internal Only**: Only use built-in features
  2. **Hybrid**: Internal features + external servers
  3. **Gateway Only**: Traditional proxy mode (current behavior)

## Migration Path

1. Implement internal features alongside existing gateway
2. Add feature flags to enable/disable internal features
3. Test both modes in parallel
4. Gradually deprecate external-only usage
5. Make internal features the default

---

**This pivot transforms awesome-plugin from a "MCP server collection manager" into a "supercharged all-in-one AI plugin" as originally intended.**
