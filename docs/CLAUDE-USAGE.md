# Claude Desktop Usage Guide - Awesome Plugin

**Version**: 0.2.0 (First Absorption Complete!)

This guide shows you how to install and use awesome-plugin with Claude Desktop via the Model Context Protocol (MCP).

---

## 📦 Installation

### Prerequisites

- **Node.js 18+** installed
- **Claude Desktop** application
- **Git** (for cloning the repository)

### Step 1: Clone and Build

```bash
# Clone the repository
git clone https://github.com/yourusername/awesome-pulgin.git
cd awesome-pulgin

# Install dependencies
npm install

# Build the project
npm run build
```

### Step 2: Configure Claude Desktop

Claude Desktop uses MCP servers defined in its configuration file.

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add awesome-plugin to the `mcpServers` section:

```json
{
  "mcpServers": {
    "awesome-plugin": {
      "command": "node",
      "args": [
        "/absolute/path/to/awesome-pulgin/dist/index.mjs"
      ]
    }
  }
}
```

**Replace** `/absolute/path/to/awesome-pulgin` with your actual installation path.

### Step 3: Restart Claude Desktop

Restart Claude Desktop to load the new MCP server.

### Step 4: Verify Installation

In Claude Desktop, ask Claude:

```
Do you have access to awesome-plugin tools?
```

Claude should confirm access to 12 tools: 4 memory tools, 5 agent tools, and 3 planning tools.

---

## 🧰 Available Tools (12 Total)

### Memory Management (4 tools)

**Absorbed from**: [supermemoryai/claude-mem](https://github.com/supermemoryai/claude-mem)

1. **`memory_save`** - Save information with tags
   ```
   Save this to memory: "Project deadline is March 15, 2025" with tags: project, deadline
   ```

2. **`memory_recall`** - Search memories with BM25 semantic search
   ```
   Recall memories about "project deadline"
   ```

3. **`memory_list`** - Browse all memories
   ```
   List all my memories
   ```

4. **`memory_forget`** - Delete a specific memory
   ```
   Forget memory with ID abc123
   ```

**Performance**: <1ms search, permanent SQLite storage

---

### Agent Orchestration (5 tools)

**Absorbed from**: [Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)

1. **`agent_spawn`** - Launch specialized agents
   ```
   Spawn a researcher agent to analyze the React documentation
   ```

   **Agent Types**:
   - `researcher`: Information gathering and analysis
   - `coder`: Code writing and implementation
   - `tester`: Test creation and validation
   - `reviewer`: Code review and quality checks

2. **`agent_status`** - Monitor running agents
   ```
   Show status of all agents
   ```

3. **`agent_result`** - Get completed agent results
   ```
   Get result from agent abc123
   ```

4. **`agent_terminate`** - Cancel running agents
   ```
   Terminate agent abc123
   ```

5. **`agent_list`** - List all agents
   ```
   List all agents with status completed
   ```

**Execution**: Parallel async execution, 2-4s average duration

---

### Planning & TODO Tracking (3 tools) 🆕

**Absorbed from**: [OthmanAdi/planning-with-files](https://github.com/OthmanAdi/planning-with-files)

1. **`planning_create`** - Create TODOs with dependencies
   ```
   Create a TODO: "Implement authentication system" with tags: backend, priority-high
   ```

   **With parent dependency**:
   ```
   Create a TODO: "Add JWT token generation" as a child of task abc123
   ```

2. **`planning_update`** - Update TODO status and content
   ```
   Update TODO abc123 to status completed
   ```

   **Statuses**: `pending`, `in_progress`, `completed`

3. **`planning_tree`** - Visualize dependency tree
   ```
   Show the TODO dependency tree
   ```

   **Example Output**:
   ```
   📋 TODO Dependency Tree

   ├─ 🔄 Implement authentication system [priority-high, backend]
   │ ├─ ✅ Add JWT token generation [backend, auth]
   │ └─ ⏳ Implement login endpoint [backend, api]
   └─ ⏳ Write tests for authentication [testing, priority-high]

   📊 Summary:
     Total: 4
     Pending: 2
     In Progress: 1
     Completed: 1
   ```

**Features**:
- Parent-child dependencies (automatic cycle detection)
- Status icons: 🔄 in_progress, ⏳ pending, ✅ completed
- BM25 semantic search integration
- SQLite persistence with foreign keys

---

## 🎯 Usage Examples

### Example 1: Memory + Agent Workflow

**Scenario**: Research a topic and save findings

```
You: Spawn a researcher agent to analyze the latest trends in AI safety

Claude: [Uses agent_spawn with type='researcher']
→ Agent abc123 spawned

You: What's the status?

Claude: [Uses agent_status]
→ Agent abc123 is in_progress (50% complete)

[After completion]

You: Get the result

Claude: [Uses agent_result]
→ Here are the key findings: [detailed analysis]

You: Save these findings to memory with tags: AI, safety, research

Claude: [Uses memory_save]
→ Saved to memory with ID xyz789
```

---

### Example 2: Planning + Agent Integration

**Scenario**: Plan and execute a project

```
You: Create a TODO for "Implement user authentication"

Claude: [Uses planning_create]
→ Created TODO abc123

You: Spawn a coder agent to implement the authentication system

Claude: [Uses agent_spawn with type='coder']
→ Agent xyz456 spawned

[Agent automatically creates subtasks]

Claude: [Uses planning_create for each subtask]
→ Created TODO child1: "Add JWT token generation"
→ Created TODO child2: "Implement login endpoint"
→ Created TODO child3: "Add password hashing"

You: Show the TODO tree

Claude: [Uses planning_tree]
→ [Beautiful ASCII tree visualization]
```

---

### Example 3: Memory + Planning Workflow

**Scenario**: Track project requirements

```
You: Save to memory: "Client wants authentication by March 15"

Claude: [Uses memory_save]
→ Saved with ID mem123

You: Create a TODO for implementing authentication with tag: client-request

Claude: [Uses planning_create]
→ Created TODO todo123

You: Search memories about client requirements

Claude: [Uses memory_recall with query "client requirements"]
→ Found 3 memories:
   1. Client wants authentication by March 15
   2. Client prefers JWT tokens
   3. Client requires 2FA support

You: Create TODOs for each requirement

Claude: [Uses planning_create for each]
→ Created 3 TODOs with dependencies
```

---

### Example 4: Full Synergy (Memory + Agent + Planning)

**Scenario**: Research, plan, and execute a feature

```
You: I need to implement a notification system. First, research best practices.

Claude: [Uses agent_spawn type='researcher']
→ Spawned researcher agent abc123

[After research completion]

Claude: [Uses agent_result]
→ Found 3 best practices:
   1. Use WebSockets for real-time updates
   2. Implement email fallback
   3. Add notification preferences

You: Save these to memory and create a plan

Claude: [Uses memory_save for each finding]
       [Uses planning_create for main task]
       [Uses planning_create for 3 subtasks]
→ Saved 3 memories
→ Created TODO tree with 4 items

You: Show the plan

Claude: [Uses planning_tree]
→ 📋 TODO Dependency Tree
  ├─ ⏳ Implement notification system
  │ ├─ ⏳ Setup WebSocket server
  │ ├─ ⏳ Add email fallback
  │ └─ ⏳ Create notification preferences UI

You: Start implementing the WebSocket server

Claude: [Uses agent_spawn type='coder' with specific task]
       [Uses planning_update to mark as in_progress]
→ Spawned coder agent xyz789
→ Updated TODO status to in_progress
```

---

## ⚙️ Configuration Options

### Database Location

By default, awesome-plugin uses an in-memory SQLite database (data lost on restart).

To use persistent storage, set the `dbPath` option:

**Custom MCP Server Script** (`server.js`):

```javascript
import { AwesomePluginGateway } from './dist/index.mjs';

const gateway = new AwesomePluginGateway({
  dbPath: '/path/to/persistent/awesome-plugin.db'
});

gateway.start();
```

Then update your Claude Desktop config:

```json
{
  "mcpServers": {
    "awesome-plugin": {
      "command": "node",
      "args": ["/path/to/server.js"]
    }
  }
}
```

### Memory Cleanup

Memories older than 90 days are automatically cleaned up every hour.

To customize:

```javascript
const gateway = new AwesomePluginGateway({
  dbPath: '/path/to/db',
  memoryTTL: 60 * 24 * 60 * 60 * 1000 // 60 days in milliseconds
});
```

---

## 🔍 Search Performance

Awesome Plugin uses BM25 (Okapi BM25) for semantic search:

- **50 tools**: 0.16-0.45ms
- **100 tools**: 0.30-0.38ms
- **200 tools**: 0.57-0.77ms

**110-130x faster** than the 50ms target!

---

## 📊 CLI Commands

Awesome Plugin also provides CLI commands (outside of Claude Desktop):

```bash
# List installed plugins
npx awesome-plugin list

# Show absorption history
npx awesome-plugin absorbed

# Vote for next absorption
npx awesome-plugin vote superpowers

# Show voting status
npx awesome-plugin vote
```

---

## 🧬 Absorption History

Awesome Plugin is **"The Absorption Engine"** - we continuously absorb the best Claude Code projects!

### Already Absorbed (3/8 projects)

1. **claude-mem** (v0.1.0) - Memory management
   - Quality Score: 95/100 (Grade: A)
   - 4 tools absorbed

2. **oh-my-claudecode** (v0.1.0) - Agent orchestration
   - Quality Score: 95/100 (Grade: A)
   - 5 tools absorbed

3. **planning-with-files** (v0.2.0) - TODO tracking 🆕
   - Quality Score: 86/100 (Grade: B+)
   - 3 tools absorbed

**Total Tools**: 12

### Next Absorption

- **v0.3.0 (March 2025)**: [superpowers](https://github.com/obra/superpowers)
  - TDD workflow enforcement
  - Expected: +4 tools

---

## 🐛 Troubleshooting

### Claude says "I don't have access to awesome-plugin"

1. Check that the path in `claude_desktop_config.json` is absolute and correct
2. Verify the build succeeded: `npm run build`
3. Restart Claude Desktop completely
4. Check Claude Desktop logs (Help → View Logs)

### Tools are not working

1. Check that the database file is writable (if using persistent storage)
2. Verify Node.js version: `node --version` (should be 18+)
3. Check for errors in Claude Desktop logs

### "Database connection is not open" error

This was a bug in v0.1.0, fixed in v0.1.1. Make sure you're using v0.2.0 or later.

---

## 💡 Best Practices

### 1. Use Tags Liberally

```
Save to memory: "API endpoint is https://api.example.com" with tags: api, backend, production
```

Tags make it easier to recall memories later:

```
Recall memories about backend
```

### 2. Create Hierarchical TODOs

Break down large tasks into smaller, manageable subtasks:

```
Create TODO: "Implement authentication"
Create TODO: "Add JWT tokens" as child of task abc123
Create TODO: "Add login endpoint" as child of task abc123
Create TODO: "Add password hashing" as child of task abc123
```

### 3. Let Agents Create TODOs

Agents can automatically create follow-up tasks:

```
Spawn a coder agent to implement authentication, and create TODOs for each step
```

The agent will:
1. Implement the feature
2. Create TODOs for testing
3. Create TODOs for documentation
4. Create TODOs for deployment

### 4. Combine Memory + Planning

Save project requirements to memory, then create TODOs:

```
1. Save all client requirements to memory
2. Create a TODO tree based on those requirements
3. As you complete TODOs, save results back to memory
```

This creates a complete project knowledge base!

---

## 🎨 Advanced Usage

### Custom Agent Types

While awesome-plugin provides 4 agent types (researcher, coder, tester, reviewer), you can describe custom behavior:

```
Spawn a researcher agent to analyze database performance optimization techniques, focusing on PostgreSQL
```

The agent will specialize its research based on your instructions.

### Filtering TODOs

```
Show the TODO tree, filtering by status in_progress
```

```
List all TODOs with tag backend
```

### Memory Categories

Use consistent tag prefixes for categories:

```
Save to memory: "..." with tags: project-alpha, backend
Save to memory: "..." with tags: project-alpha, frontend
Save to memory: "..." with tags: project-beta, api
```

Then recall by category:

```
Recall memories about project-alpha
```

---

## 📚 Related Documentation

- [README.md](../README.md) - Project overview and features
- [PRD.md](../PRD.md) - Product Requirements Document with absorption strategy
- [CHANGELOG.md](../CHANGELOG.md) - Version history and improvements
- [Architecture Pivot](../docs/architecture-pivot.md) - Why we chose built-in features over MCP Gateway

---

## 🤝 Contributing

Awesome Plugin is open source! We welcome:

- **Bug reports** - Open an issue on GitHub
- **Feature suggestions** - Especially new projects to absorb!
- **Voting** - Use `npx awesome-plugin vote <project>` to influence the roadmap
- **Pull requests** - Improvements always welcome

**Want to suggest a project for absorption?**

Open an issue with:
- Project name and GitHub URL
- Why it would be valuable to absorb
- Estimated quality score (see [PRD.md](../PRD.md) for criteria)

---

## 📞 Support

- **GitHub Issues**: https://github.com/yourusername/awesome-pulgin/issues
- **Documentation**: https://github.com/yourusername/awesome-pulgin/tree/main/docs

---

## ✨ What's Next?

**v0.3.0 (March 2025)** - superpowers absorption

- `tdd_red`: Write failing test first
- `tdd_green`: Implement code to pass test
- `tdd_refactor`: Refactor while keeping tests green
- `tdd_verify`: Run full test suite

**Total Tools**: 16 (12 current + 4 TDD)

**Vote now**: `npx awesome-plugin vote superpowers`

---

**Happy absorbing!** 🧬

*Built with ❤️ by the awesome-plugin community*

*Powered by Claude Sonnet 4.5*
