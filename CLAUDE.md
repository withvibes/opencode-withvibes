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
- **skills/** - Bundled skills (Anthropic Skills Specification v1.0)
  - **zep-memory/** - Memory system documentation and best practices
    - `SKILL.md` - Primary documentation for agents on using memory
    - `reference/architecture.md` - Multi-level memory design (v2.0+ planning)
    - `reference/api-reference.md` - Zep Cloud API documentation
  - **skill-creator/** - Guide for creating new skills (from Anthropic)
    - `SKILL.md` - Skill creation process and best practices
    - `scripts/init_skill.py` - Initialize new skill from template
    - `scripts/package_skill.py` - Validate and package skills
    - `scripts/quick_validate.py` - Quick skill validation
  - **template-skill/** - Minimal skill template (from Anthropic)
- **scripts/** - Helper scripts for skill development (uv-compatible with inline dependencies)
  - `init_skill.py` - Create new skills from template (run with `./init_skill.py` or `uv run`)
  - `package_skill.py` - Package and validate skills (run with `./package_skill.py` or `uv run`)
  - `quick_validate.py` - Quick validation tool (run with `./quick_validate.py` or `uv run`)
  - All scripts use PEP 723 inline script metadata for uv compatibility
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

The plugin bundles 16 skills following the [Anthropic Skills Specification v1.0](https://github.com/anthropics/skills):

### Bundled Skills

#### With Vibes Skills
**`skills_zep_memory`** - Persistent memory system using Zep knowledge graphs
- When to use `recall` vs `remember` tools
- Memory-first interaction patterns
- Best practices for semantic search
- According to `AGENTS.md`, agents should load this at the start of every conversation

#### Development & Tooling Skills
**`skills_skill_creator`** - Skill creation guide (from Anthropic)
- How to create effective skills with progressive disclosure pattern
- Scripts: `init_skill.py`, `package_skill.py`, `quick_validate.py`

**`skills_template_skill`** - Minimal skill template (from Anthropic)
- Basic SKILL.md structure with YAML frontmatter

**`skills_mcp_builder`** - Guide for creating MCP servers (from Anthropic)
- Building Model Context Protocol servers in Python (FastMCP) or TypeScript (MCP SDK)

**`skills_webapp_testing`** - Web application testing with Playwright (from Anthropic)
- Verifying frontend functionality and debugging UI behavior

#### Document Skills (from Anthropic)
**`skills_document_skills_xlsx`** - Spreadsheet creation, editing, and analysis
- Formulas, formatting, data analysis, visualization

**`skills_document_skills_docx`** - Word document creation and editing
- Tracked changes, comments, formatting preservation

**`skills_document_skills_pptx`** - Presentation creation and editing
- Layouts, speaker notes, comments

**`skills_document_skills_pdf`** - PDF manipulation toolkit
- Extracting text/tables, merging/splitting, handling forms

#### Design & Creative Skills (from Anthropic)
**`skills_canvas_design`** - Visual art creation using design philosophy
- Creating posters, designs, static pieces

**`skills_algorithmic_art`** - Algorithmic art using p5.js
- Generative art, flow fields, particle systems

**`skills_slack_gif_creator`** - Animated GIF creation for Slack
- Size optimization, composable animation primitives

**`skills_theme_factory`** - Theme styling toolkit
- 10 pre-set themes with colors/fonts for artifacts

**`skills_artifacts_builder`** - Complex HTML artifacts with React/Tailwind
- Multi-component artifacts with state management and shadcn/ui

#### Communication & Branding Skills (from Anthropic)
**`skills_internal_comms`** - Internal communications templates
- Status reports, leadership updates, incident reports

**`skills_brand_guidelines`** - Anthropic's official brand colors and typography
- Apply brand look-and-feel to artifacts

### Skill Discovery

The plugin automatically discovers and registers all SKILL.md files in the `skills/` directory. Each skill becomes a tool with the naming pattern `skills_{skill_name}`.

Skills use the "message insertion pattern" (noReply) to deliver content, ensuring skill instructions persist throughout long conversations even when OpenCode purges tool responses.

## Publishing Notes

The `package.json` includes a `files` array specifying what gets published:
- `src/` - Source TypeScript files
- `skills/` - All 16 bundled skills:
  - With Vibes: `zep-memory`
  - Development: `skill-creator`, `template-skill`, `mcp-builder`, `webapp-testing`
  - Documents: `document-skills/{xlsx,docx,pptx,pdf}`
  - Design: `canvas-design`, `algorithmic-art`, `slack-gif-creator`, `theme-factory`, `artifacts-builder`
  - Communication: `internal-comms`, `brand-guidelines`
- `scripts/` - Skill development helper scripts (init_skill.py, package_skill.py, quick_validate.py)
- `dist/` - Compiled JavaScript
- `AGENTS.md`, `README.md`, `LICENSE`

**Note:** All Anthropic skills are Apache 2.0 licensed (see LICENSE.txt in each skill directory)

## Repository

- Git: https://github.com/withvibes/opencode-withvibes.git
- License: MIT
- Author: spikel1283
