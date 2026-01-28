# Migration Guide: MCP Server → Claude Code Plugin

This guide helps existing awesome-plugin users migrate from MCP Server mode to the new Claude Code Plugin mode.

## Why Migrate?

**Token Efficiency:**
- MCP Server: ~6,100 tokens loaded every request
- Claude Code Plugin: ~400-900 tokens per skill (on-demand)
- **Savings: 87-95%**

## Migration Steps

### 1. Update to v2.0.0

```bash
npm install -g awesome-plugin@latest
```

### 2. Install Skill Files

```bash
npx awesome-plugin install-skills
```

This copies 7 skill files to `~/.claude/skills/`:
- awesome-memory.md
- awesome-agents.md
- awesome-planning.md
- awesome-tdd.md
- awesome-guide.md
- awesome-science.md
- awesome-specialists.md

### 3. Development Mode (Optional)

For plugin development:
```bash
npx awesome-plugin install-skills --link
```

### 4. Verify Installation

```bash
ls ~/.claude/skills/awesome-*.md
```

## Using the Plugin

Skills are automatically available in Claude Code when relevant keywords are detected:

- "remember this" → awesome-memory skill
- "spawn an agent" → awesome-agents skill
- "create a todo" → awesome-planning skill
- etc.

## CLI Usage

All operations still work via CLI:

```bash
npx awesome-plugin memory save "key" "value"
npx awesome-plugin agent spawn coder "task"
npx awesome-plugin planning create "todo"
```

## Database Compatibility

Your existing database at `~/.awesome-plugin/data.db` works without changes!

## Breaking Changes

**None!** The migration is backward compatible.

## Troubleshooting

### Skills not appearing in Claude
- Verify files exist: `ls ~/.claude/skills/awesome-*.md`
- Reinstall: `npx awesome-plugin install-skills --force`

### CLI not found
- Install globally: `npm install -g awesome-plugin`
- Or use npx: `npx awesome-plugin <command>`

## Rollback

To use MCP Server mode:
1. Remove from `~/.claude/settings.json` MCP section
2. Add to `claude_desktop_config.json` MCP servers section

## Support

- Issues: https://github.com/yourusername/awesome-plugin/issues
- Docs: https://github.com/yourusername/awesome-plugin/blob/main/README.md
