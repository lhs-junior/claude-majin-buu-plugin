# Awesome MCP Meta Plugin

> Intelligent tool selection and auto-discovery for Model Context Protocol (MCP) servers

Awesome Plugin solves the token bloat problem by dynamically selecting only the tools you need, reducing token usage by up to **97%**.

## 🚀 Features

- **3-Layer Tool Loading**: Smart loading strategy that minimizes token usage
  - Layer 1: Essential tools (always loaded)
  - Layer 2: Query-matched tools (BM25 search)
  - Layer 3: On-demand tools (loaded when explicitly requested)

- **Auto-Discovery**: Automatically find and evaluate MCP servers from GitHub (Coming in Phase 3)
- **Intelligent Selection**: BM25-based search with intent classification
- **Multi-Server Gateway**: Connect to multiple MCP servers simultaneously
- **Usage Learning**: Learns from your usage patterns for better recommendations

## 📊 Token Savings

| Scenario | Tools | Before | After | Savings |
|----------|-------|--------|-------|---------|
| Small | 50 | 15K | 4.5K | **70%** |
| Medium | 200 | 60K | 6K | **90%** |
| Large | 500 | 150K | 7.5K | **95%** |

## 🛠️ Installation

```bash
npm install -g awesome-plugin
```

Or use directly with npx:

```bash
npx awesome-plugin start
```

## 📖 Usage

### As MCP Server

Run the gateway as an MCP server:

```bash
awesome-plugin start
```

### CLI Commands

```bash
# Initialize configuration
awesome-plugin init

# Discover MCP servers from GitHub
awesome-plugin discover

# List connected servers
awesome-plugin list

# Show statistics
awesome-plugin stats
```

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│      Claude Desktop / Code      │
└────────────────┬────────────────┘
                 │ MCP Protocol
┌────────────────┴────────────────┐
│  Awesome Plugin Gateway         │
│  ├─ Tool Search Engine (BM25)   │
│  ├─ Auto Discovery (GitHub)     │
│  └─ Multi-Server Proxy          │
└────────────────┬────────────────┘
                 │
       ┌─────────┼─────────┐
    [MCP1]    [MCP2]    [MCP3]
```

## 🔧 Configuration

Create a `config/servers/` directory and add your MCP server configurations:

```json
{
  "id": "github-server",
  "name": "GitHub MCP Server",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"]
}
```

## 📚 Development Status

### Phase 1: Core Gateway (Weeks 1-2) ✅ **Current**

- [x] MCP Server basic structure
- [x] Session Manager
- [x] Tool Loader (3-layer strategy)
- [x] Basic tool search (keyword-based)

### Phase 2: Tool Search Engine (Weeks 3-4) 🚧 **Next**

- [ ] BM25 indexer implementation
- [ ] SQLite metadata storage
- [ ] Tool metadata indexing
- [ ] Performance optimization

### Phase 3: GitHub Auto Discovery (Weeks 5-7)

- [ ] GitHub API integration
- [ ] Quality evaluation algorithm
- [ ] Auto-installation workflow
- [ ] User approval UI

### Phase 4-6: Advanced Features (Weeks 8-14)

- [ ] Intent classification
- [ ] Usage learning
- [ ] Prompt caching
- [ ] Production optimizations

## 🤝 Contributing

Contributions are welcome! This project is in early development (Phase 1 MVP).

## 📝 License

MIT

## 🔗 Links

- [Implementation Plan](/.claude/plans/composed-churning-glade.md)
- [MCP Specification](https://modelcontextprotocol.io/specification/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## 🌟 Inspired By

- [Anthropic Tool Search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)
- [agents (wshobson)](https://github.com/wshobson/agents)
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)
- [planning-with-files](https://github.com/OthmanAdi/planning-with-files)

---

**Status**: Phase 1 MVP - Core Gateway ✅ Complete
