---
name: zep-memory
description: Persistent memory system using Zep knowledge graphs to remember and recall facts from conversations. Use when you need to store user preferences or retrieve previously discussed information across sessions.
license: MIT
allowed-tools:
  - bash
metadata:
  version: "1.0"
  zep-sdk-version: "3.8.0"
  author: "spikel1283"
---

# Zep Memory System

## Overview

The Zep memory system provides persistent, intelligent memory for conversations using Zep Cloud's knowledge graphs. Every message in your conversations is automatically stored and analyzed by AI to extract facts, entities, and relationships. This creates a growing knowledge graph that can be searched semantically to recall information from past interactions.

**Key Benefits:**
- Automatic conversation storage - no manual tracking needed
- AI-powered fact extraction from natural conversations
- Semantic search - find information by meaning, not just keywords
- Temporal tracking - facts have validity dates (when they became true/false)
- User-scoped isolation - each user's memories are private

## Current Capabilities (v1.0)

### Automatic Features
- **All messages stored** - Every user and assistant message is saved to Zep
- **Fact extraction** - AI automatically identifies important facts from conversations
- **Entity recognition** - People, places, preferences, and concepts are identified
- **Relationship mapping** - Connections between entities are tracked
- **Temporal validity** - Facts include when they became valid and when they were invalidated

### Available Tools

You have access to two custom tools for memory operations:

#### 1. `recall` - Search Your Memory

**Purpose:** Search the user's personal knowledge graph for relevant facts

**When to use:**
- User asks about their preferences ("What do I prefer?")
- You need information mentioned in past conversations
- Before asking user for information they may have already provided
- To verify or check facts before making assumptions

**Arguments:**
- `query` (string): Semantic search query describing what to find

**Returns:** List of relevant facts with their validity dates

**Example usage:**
```
User: "What programming language do I prefer?"
→ Use recall tool with query: "preferred programming language"
→ Returns: "User prefers TypeScript over JavaScript (2025-10-29 - present)"
```

**Best practices:**
- Search before asking - check if the user already told you something
- Use descriptive queries - "programming preferences" not just "language"
- The search is semantic - it understands meaning, not just keywords

#### 2. `remember` - Explicitly Store a Fact

**Purpose:** Store an important fact in memory

**When to use:**
- User explicitly says "remember this" or "don't forget"
- User states a clear preference that should be persisted
- Important context that will be relevant in future sessions
- Facts that warrant explicit confirmation

**Arguments:**
- `fact` (string): The fact to remember, clearly stated

**Returns:** Confirmation that the fact was stored

**Example usage:**
```
User: "Remember that I always use Tailwind CSS for styling"
→ Use remember tool with fact: "User always uses Tailwind CSS for styling"
→ Returns: "Remembered: User always uses Tailwind CSS for styling"
```

**Best practices:**
- Be specific and clear in the fact statement
- Include context if needed ("for styling" not just "uses Tailwind")
- Don't over-use - automatic storage handles most cases
- Use for explicit user requests or critical preferences

## How It Works

### Automatic Storage

1. **Message Capture**: Every message (user and assistant) is sent to Zep
2. **AI Analysis**: Zep's AI analyzes the conversation to extract:
   - Facts (statements about the world, preferences, etc.)
   - Entities (people, projects, tools, concepts)
   - Relationships (connections between entities)
3. **Graph Building**: Information is stored in a temporal knowledge graph
4. **Temporal Tracking**: Facts include validity dates - when they became true

### Semantic Search

When you use the `recall` tool:

1. **Query Understanding**: Your search query is converted to embeddings
2. **Semantic Matching**: Zep finds facts that are semantically similar
3. **Ranking**: Results are ranked by relevance
4. **Context Assembly**: Facts are formatted with their validity dates
5. **Return**: You receive the top relevant facts

The search understands meaning - "programming preferences" will find "User prefers TypeScript" even though the words don't exactly match.

### Memory Scope (Current Version)

**Version 1.0 provides:**
- **User-level memory** - Each user has their own isolated knowledge graph
- **Thread-based conversations** - Each OpenCode session has a thread
- **Cross-session persistence** - Facts persist across different sessions

**Future versions will add:**
- **Project-level memory** - Shared knowledge for a codebase
- **Team-level memory** - Conventions and practices shared across team
- **Organization-level memory** - Company-wide policies and standards

See `reference/architecture.md` for the full multi-level memory design.

## Common Patterns

### Pattern 1: Check Memory Before Asking

**Bad approach:**
```
Assistant: "What CSS framework would you like me to use?"
```

**Good approach:**
```
1. Use recall tool with query: "CSS framework preference"
2. If found: Use the remembered preference
3. If not found: Ask the user and note their answer for future
```

### Pattern 2: Recognize and Store Preferences

**Example conversation:**
```
User: "I prefer using React hooks over class components"
Assistant: [Automatic storage captures this]

Later session:
User: "Help me build a component"
Assistant: [Uses recall to check preferences]
→ Finds: "User prefers React hooks over class components"
→ Builds with hooks without asking
```

### Pattern 3: Fact Updates and Invalidation

**Example:**
```
Day 1: "I'm working with Python 3.9"
→ Stored: User works with Python 3.9 (2025-10-29 - present)

Day 30: "I upgraded to Python 3.12"
→ Stored: User works with Python 3.12 (2025-11-28 - present)
→ Updated: User works with Python 3.9 (2025-10-29 - 2025-11-28) [invalidated]
```

Zep automatically handles fact invalidation when new information contradicts old facts.

### Pattern 4: Explicit vs Implicit Storage

**Implicit (automatic):**
```
User: "I always write tests before implementation"
Assistant: "Great practice! I'll keep that in mind."
→ Zep automatically extracts and stores this preference
```

**Explicit (using remember tool):**
```
User: "Remember that for this project, we never commit directly to main"
Assistant: [Uses remember tool]
→ Explicitly stores with confirmation
→ Returns: "Remembered: For this project, never commit directly to main"
```

Use explicit storage (`remember` tool) when the user specifically asks or when the fact is critically important.

## Future Architecture (Planned)

### Multi-Level Memory Hierarchy

Version 2.0+ will support memory at multiple organizational levels:

```
┌─────────────────────────────────────────┐
│  ORG GRAPH (org-{orgId})                │
│  "All PRs need 2 approvals"             │
│  ↓ Shared across entire company         │
├─────────────────────────────────────────┤
│  TEAM GRAPH (team-{teamId})             │
│  "We use conventional commits"          │
│  ↓ Shared across team                   │
├─────────────────────────────────────────┤
│  PROJECT GRAPH (project-{projectId})    │
│  "Uses TanStack + Convex + WorkOS"      │
│  ↓ Shared across project contributors   │
├─────────────────────────────────────────┤
│  USER GRAPH (user-{userId})             │
│  "I prefer TypeScript over JavaScript"  │
│  ↓ Personal to this user only           │
└─────────────────────────────────────────┘
```

### Planned Tools (v2.0+)

- `recall(scope: "user" | "project" | "team" | "org" | "all")` - Search specific memory levels
- `remember-project(fact)` - Store project-level facts
- `remember-team(fact)` - Store team-level facts
- `remember-org(fact)` - Store org-level facts
- `forget(query, scope)` - Remove/invalidate facts
- `list-memories(scope, limit)` - List all facts at a level

For detailed architecture and implementation design, see:
- **reference/architecture.md** - Complete multi-level memory architecture
- **reference/api-reference.md** - Full Zep Cloud API documentation

## Configuration

### Environment Variables

The Zep plugin requires these environment variables:

- `ZEP_API_KEY` - Your Zep Cloud API key (required)
- `ZEP_USER_ID` - Unique identifier for the user (required)
- `ZEP_THREAD_ID` - Thread ID for this session (optional, auto-generated if not provided)
- `ZEP_DEBUG` - Set to "true" for detailed logging (optional)

### Debug Mode

Enable debug logging to see what's happening:

```bash
export ZEP_DEBUG=true
```

Debug mode shows:
- Plugin initialization
- User and thread creation
- Message storage operations
- Context retrieval operations

## Troubleshooting

### Memory not being recalled

**Check:**
1. Is `ZEP_DEBUG=true`? Look for "Message stored successfully" logs
2. Did the conversation happen in a different thread?
3. Is the search query specific enough?

**Try:**
- Use more descriptive search queries
- Check Zep dashboard at https://app.getzep.com to see stored facts
- Ensure you're using the same `ZEP_USER_ID` across sessions

### Facts seem outdated

**Solution:**
- Facts are temporal - check the validity dates in the results
- Provide new information to invalidate old facts
- Use `ZEP_DEBUG=true` to see when facts were stored/updated

### Tool not being invoked

**Check:**
- Is the question actually about past information? (recall)
- Did the user explicitly ask to remember something? (remember)
- The LLM decides when to use tools - it may not always choose to

## Best Practices

### Do:
- ✅ Search memory before asking users for information they may have provided
- ✅ Let automatic storage handle most facts - only use `remember` for explicit requests
- ✅ Use descriptive search queries that capture meaning
- ✅ Verify facts are still valid by checking the validity dates

### Don't:
- ❌ Over-use the `remember` tool - automatic storage is usually sufficient
- ❌ Store trivial information that won't be useful later
- ❌ Assume facts are eternal - they can be invalidated
- ❌ Search with overly generic queries like "user info"

## Resources

- **Zep Cloud Dashboard**: https://app.getzep.com
- **Architecture Documentation**: reference/architecture.md
- **API Reference**: reference/api-reference.md
- **Zep Official Docs**: https://help.getzep.com

## Version History

- **v1.0** (Current) - User-level memory with automatic storage and recall
- **v2.0** (Planned) - Multi-level memory hierarchy (user/project/team/org)
- **v3.0** (Future) - Automatic context injection, enhanced search filters

---

**Questions or issues?** Check the reference documentation or enable debug mode for detailed logging.
