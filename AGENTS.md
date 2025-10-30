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

---

# Configuring Specialized Agents

This plugin provides 16 skills across different domains. You can create specialized agents that focus on specific tasks by configuring OpenCode agents with appropriate skill access.

## How to Set Up Agents

**Note:** OpenCode plugins cannot auto-register agents. Users must manually configure agents in their `opencode.json` file.

### Quick Start

1. Copy `opencode.json.example` to your project:
   ```bash
   cp node_modules/opencode-withvibes/opencode.json.example ./opencode.json
   ```

2. The example includes 6 pre-configured agents:
   - `default` - Basic agent with memory and skill creation tools
   - `document-specialist` - Excel, Word, PowerPoint, PDF expert
   - `creative-designer` - Visual art, animations, generative designs
   - `code-builder` - MCP servers, web testing, React artifacts
   - `communicator` - Internal communications and branding
   - `memory-only` - Minimal agent focusing on memory operations
   - `full-access` - All 16 skills enabled

3. Use an agent:
   ```bash
   opencode run --agent document-specialist "Create a spreadsheet..."
   opencode run --agent creative-designer "Make an animated GIF..."
   opencode run --agent code-builder "Build an MCP server..."
   ```

## Agent Configuration Structure

Each agent in `opencode.json` has:

```json
{
  "agents": {
    "agent-name": {
      "model": "anthropic/claude-sonnet-4-5",
      "description": "What this agent does",
      "systemPrompt": "{file:./prompts/agent-name.txt}",
      "tool": [
        "skills_document_skills_xlsx",
        "skills_zep_memory",
        "remember",
        "recall"
      ],
      "permission": {
        "bash": "allow",
        "read": "allow",
        "write": "ask"
      }
    }
  }
}
```

### System Prompts

Agent prompts are stored in the `prompts/` directory using OpenCode's `{file:}` syntax:
- `prompts/document-specialist.txt`
- `prompts/creative-designer.txt`
- `prompts/code-builder.txt`
- `prompts/communicator.txt`
- `prompts/memory-only.txt`
- `prompts/full-access.txt`

This keeps prompts modular and easy to customize.

## Available Skills by Domain

### Document Skills
- `skills_document_skills_xlsx` - Excel spreadsheets
- `skills_document_skills_docx` - Word documents
- `skills_document_skills_pptx` - PowerPoint presentations
- `skills_document_skills_pdf` - PDF manipulation

### Design & Creative
- `skills_canvas_design` - Visual art creation
- `skills_algorithmic_art` - Generative art with p5.js
- `skills_slack_gif_creator` - Animated GIFs
- `skills_theme_factory` - Professional themes
- `skills_artifacts_builder` - Complex React artifacts

### Development
- `skills_mcp_builder` - MCP server development
- `skills_webapp_testing` - Web app testing with Playwright
- `skills_skill_creator` - Creating new skills
- `skills_template_skill` - Skill template

### Communication
- `skills_internal_comms` - Internal communications
- `skills_brand_guidelines` - Brand styling

### Memory
- `skills_zep_memory` - Memory system documentation
- `remember` - Store facts explicitly
- `recall` - Retrieve past information

## Creating Custom Agents

To create your own agent:

1. Choose which skills the agent needs
2. Select an appropriate model:
   - `anthropic/claude-sonnet-4-5` - Complex tasks
   - `anthropic/claude-haiku-4-5` - Simple, fast tasks
3. Create a custom prompt file in `prompts/`
4. Add agent configuration to `opencode.json`

Example custom agent for a data analyst:

```json
{
  "data-analyst": {
    "model": "anthropic/claude-sonnet-4-5",
    "description": "Data analysis specialist",
    "systemPrompt": "{file:./prompts/data-analyst.txt}",
    "tool": [
      "skills_document_skills_xlsx",
      "skills_canvas_design",
      "skills_zep_memory",
      "remember",
      "recall"
    ],
    "permission": {
      "bash": "allow",
      "read": "allow",
      "write": "allow"
    }
  }
}
```

## Best Practices

1. **Always include memory tools** - Add `skills_zep_memory`, `remember`, and `recall` to preserve context
2. **Match model to complexity** - Use Sonnet 4.5 for complex work, Haiku 4.5 for simple tasks
3. **Set appropriate permissions** - Restrict bash/write access for read-only agents
4. **Use descriptive names** - Agent names should clearly indicate their purpose
5. **Customize prompts** - Edit the prompt files to match your specific needs

## Troubleshooting

**Agent not found:**
- Ensure `opencode.json` is in your project root or `~/.config/opencode/`
- Check that agent name matches exactly (case-sensitive)

**Skills not working:**
- Verify `opencode-withvibes` is in your `plugin` array
- Check that skill names are spelled correctly in the `tool` array
- Run `opencode run --agent agent-name "test"` to verify agent loads

**Prompts not loading:**
- Ensure prompt files exist in `prompts/` directory
- Check `{file:}` paths are relative to `opencode.json` location
- Verify file permissions allow reading
