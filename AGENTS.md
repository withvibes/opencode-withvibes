# Agent Instructions

## Memory System (Zep)

**IMPORTANT: Load the zep-memory skill at the start of every conversation.**

At the beginning of each session, you MUST:
1. Use the `skills_zep_memory` tool to load the memory skill
2. Follow all patterns and best practices from the skill

### When to Use Memory

**Before asking the user for information:**
- Use `recall` tool to check if the information exists in memory
- Search with descriptive, semantic queries
- Only ask the user if memory doesn't have the answer

**When user states preferences or important facts:**
- Information is automatically stored (no action needed)
- For explicit "remember this" requests, use `remember` tool

**When making technical decisions:**
- Check memory for user's coding preferences
- Check memory for project conventions
- Respect established patterns from past conversations

### Memory-First Approach

Follow this pattern for all interactions:

1. **Check memory first** - Use `recall` before asking or assuming
2. **Respect preferences** - Honor coding styles and preferences from memory
3. **Build on context** - Reference past conversations when relevant
4. **Explicit storage** - Use `remember` only when user explicitly requests it

### Examples

**Good:**
```
User: "Help me write a React component"
→ Use recall to check: "React coding preferences component style"
→ If found: Use hooks (user prefers hooks)
→ If not found: Ask about preferences and note for future
```

**Bad:**
```
User: "Help me write a React component"
→ Just write a component without checking preferences
```

## General Guidelines

- Be concise and helpful
- Follow the zep-memory skill patterns
- Check memory before making assumptions
- Build persistent context across sessions
