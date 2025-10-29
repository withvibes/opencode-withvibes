# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL: Review Before Committing

**ALWAYS run code review before committing changes.**

Before any `git commit`:
1. Use the `codex-reviewer` agent to review all changes
2. Address any P0/P1 issues found
3. Document any P2/P3 issues that are accepted
4. Only then commit and push

Example workflow:
```bash
# Make changes...
# THEN:
# → Run: codex-reviewer agent
# → Fix any issues
# → Commit
```

**Never skip the review step.** This catches bugs, security issues, and correctness problems before they hit the repo.

## Project Overview

This is an OpenCode plugin that provides persistent memory and context management via Zep Cloud knowledge graphs. The plugin enables automatic conversation storage with AI-powered fact extraction, semantic search, and temporal tracking.

## Development Commands

### Build
```bash
bun run build
# or
npm run build
```
Compiles TypeScript to JavaScript in the `dist/` directory.

### Test
```bash
bun run test
# Note: Currently outputs "No tests yet" - tests need to be implemented
```

### Local Plugin Development
To test the plugin in another OpenCode project:
```bash
# In the consuming project's opencode.json:
{
  "plugin": ["../opencode-withvibes"]
}

# Set required environment variables:
export ZEP_API_KEY="your-zep-cloud-api-key"
export ZEP_USER_ID="test-user"
export ZEP_DEBUG="true"  # For detailed logging
```

## Architecture

### Plugin Structure
- **src/index.ts** - Main plugin entry point, exports `WithvibesPlugin`
- **skills/zep-memory/** - Bundled skill with memory system documentation
  - `SKILL.md` - Primary documentation for agents on using memory
  - `reference/architecture.md` - Multi-level memory design (v2.0+ planning)
  - `reference/api-reference.md` - Zep Cloud API documentation
- **AGENTS.md** - Instructions auto-loaded for OpenCode agents

### Plugin Initialization Flow
1. Plugin reads `ZEP_API_KEY`, `ZEP_USER_ID`, `ZEP_THREAD_ID`, `ZEP_DEBUG` from environment
2. Initializes Zep Cloud client (v3 API via `@getzep/zep-cloud`)
3. Creates/verifies user and thread existence
4. Returns hooks and tools to OpenCode runtime

### Key Components

#### Hook: `chat.message`
- Automatically captures every user and assistant message
- Handles message length limitations:
  - Messages <2500 chars → `thread.addMessages` API
  - Messages >2500 chars → `graph.add` API (limited to 5000 chars)
- Extracts text content from message parts for storage

#### Tools

**`remember` tool**
- Purpose: Explicit fact storage when user requests it
- Usage: `remember({ fact: "User prefers TypeScript" })`
- Implementation: Prefixes fact with `[MEMORY]` tag and stores via `thread.addMessages`

**`recall` tool**
- Purpose: Semantic search of user's knowledge graph
- Usage: `recall({ query: "programming language preference" })`
- Implementation: Uses Zep's `graph.search` API with edge scope
- Returns: List of facts with formatted output

### Memory Architecture (Current: v1.0)

**User-Level Memory Only**
- Each user (`ZEP_USER_ID`) has isolated knowledge graph
- Thread-based conversation storage
- No cross-user data leakage
- Automatic fact extraction and entity recognition
- Temporal validity tracking (facts have start/end dates)

**Planned (v2.0+)**: Multi-level hierarchy
- Organization → Team → Project → User
- Scope-specific recall
- See `skills/zep-memory/reference/architecture.md` for full design

## Development Best Practices

### Environment Variables
Always set these when developing or testing:
- `ZEP_API_KEY` (required) - Get from https://app.getzep.com
- `ZEP_USER_ID` (required for memory isolation)
- `ZEP_THREAD_ID` (optional, auto-generated if omitted)
- `ZEP_DEBUG=true` (helpful for development)

### TypeScript Configuration
- Target: ES2022
- Module: ESNext (using `"type": "module"` in package.json)
- Module resolution: bundler (Bun-style)
- Output: `dist/` directory with source maps and declarations

### Zep Cloud API Version
This plugin uses Zep Cloud SDK v3.8.0 (`@getzep/zep-cloud`), which has different APIs than older versions:
- `zep.thread.addMessages()` instead of `zep.memory.add()`
- `zep.graph.search()` instead of `zep.memory.search()`
- `zep.user.add()` and `zep.thread.create()` for initialization

### Message Length Handling
The plugin automatically handles Zep's 2500-character limit:
```typescript
if (textContent.length > 2500) {
  // Use graph.add for long messages
  await zep.graph.add({ userId, type: "text", data: textContent.substring(0, 5000) });
} else {
  // Use thread.addMessages for normal messages
  await zep.thread.addMessages(threadId, { messages: [...] });
}
```

## Skills System

The bundled `zep-memory` skill provides comprehensive documentation for OpenCode agents on:
- When to use `recall` vs `remember` tools
- Memory-first interaction patterns
- Best practices for semantic search
- Common usage patterns

According to `AGENTS.md`, agents should load this skill at the start of every conversation using the `skills_zep_memory` tool.

## Publishing Notes

The `package.json` includes a `files` array specifying what gets published:
- `src/` - Source TypeScript files
- `skills/` - Bundled skill documentation
- `dist/` - Compiled JavaScript
- `AGENTS.md`, `README.md`, `LICENSE`

## Repository

- Git: https://github.com/withvibes/opencode-withvibes.git
- License: MIT
- Author: spikel1283
