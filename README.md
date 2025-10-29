# opencode-withvibes

OpenCode plugin providing persistent memory and context management for Withvibes projects via Zep Cloud knowledge graphs.

## Features

- 🧠 **Persistent Memory** - Automatic conversation storage with AI-powered fact extraction
- 🔍 **Semantic Search** - Find information by meaning, not just keywords
- 🔒 **User Isolation** - Each user's memories are private and secure
- ⏱️ **Temporal Tracking** - Facts include validity dates (when they became true/false)
- 🛠️ **Custom Tools** - `remember` and `recall` tools for explicit memory operations
- 📚 **Bundled Skill** - Includes `zep-memory` skill with comprehensive documentation

## Installation

### Local Development

```bash
# In your OpenCode project
cd /path/to/your/project

# Add to opencode.json
{
  "plugin": [
    "../opencode-withvibes"  # Relative path to this plugin
  ]
}
```

### From npm (after publishing)

```bash
bun add opencode-withvibes
```

```json
{
  "plugin": [
    "opencode-withvibes"
  ]
}
```

## Configuration

### Environment Variables

```bash
# Required
export ZEP_API_KEY="your-zep-cloud-api-key"

# Optional
export ZEP_USER_ID="unique-user-id"        # Default: "default-user"
export ZEP_THREAD_ID="session-thread-id"  # Default: auto-generated
export ZEP_DEBUG="true"                    # Default: false (enable detailed logging)
```

### Get Your Zep API Key

1. Sign up at [Zep Cloud](https://app.getzep.com)
2. Create a project
3. Copy your API key from the dashboard

## Usage

### Automatic Memory

Every conversation is automatically stored and analyzed:

```bash
# Just use OpenCode normally
opencode run "I prefer TypeScript over JavaScript"

# Later...
opencode run "What programming language do I prefer?"
# → Agent will recall: "You prefer TypeScript over JavaScript"
```

### Explicit Memory Tools

#### `remember` - Store Important Facts

```bash
opencode run "Remember that for this project, we always use Tailwind CSS"
```

The agent will use the `remember` tool to explicitly store this preference.

#### `recall` - Search Memory

```bash
opencode run "What CSS framework should I use?"
```

The agent will use the `recall` tool to search your memory before responding.

### Using the Zep Memory Skill

The plugin bundles a comprehensive skill with best practices and architecture documentation:

```bash
# Load the skill for detailed guidance
opencode run "Use the zep-memory skill"

# The agent now has access to:
# - Best practices for memory usage
# - When to use recall vs reading files
# - Multi-level architecture documentation
# - Complete Zep API reference
```

## Plugin Structure

```
opencode-withvibes/
├── src/
│   └── index.ts              # Main plugin code
├── skills/
│   └── zep-memory/           # Bundled memory skill
│       ├── SKILL.md          # Main skill documentation
│       ├── reference/
│       │   ├── architecture.md  # Multi-level memory design
│       │   └── api-reference.md # Zep Cloud API docs
│       └── LICENSE.txt
├── AGENTS.md                 # Agent instructions for auto-loading
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

## Features in Detail

### Automatic Storage

- Every message (user and assistant) is captured
- AI extracts facts, entities, and relationships
- Information is stored in a temporal knowledge graph
- Facts include when they became valid/invalid

### Semantic Search

The `recall` tool uses semantic search:

```typescript
// Example: These queries will find the same information
recall({ query: "programming language preference" })
recall({ query: "which language do I like" })
recall({ query: "TypeScript or JavaScript" })
```

### Message Length Handling

- Messages <2500 chars → Stored via `thread.addMessages`
- Messages >2500 chars → Automatically uses `graph.add` API
- No errors, seamless handling

### Memory Scope (v1.0)

Current version provides user-level memory only:
- Each user has their own isolated knowledge graph
- No cross-user data leakage
- Memories persist across OpenCode sessions

Future versions will support:
- Project-level memory (shared across team)
- Team-level memory (team conventions)
- Organization-level memory (company policies)

See `skills/zep-memory/reference/architecture.md` for the full design.

## Development

### Prerequisites

- Bun or Node.js 18+
- TypeScript 5+
- Zep Cloud account

### Setup

```bash
git clone <your-repo-url>
cd opencode-withvibes
bun install
```

### Testing Locally

```bash
# Set environment variables
export ZEP_API_KEY="your-api-key"
export ZEP_USER_ID="test-user"
export ZEP_DEBUG="true"

# Use in a test project
cd /path/to/test/project
echo '{"plugin": ["../opencode-withvibes"]}' > opencode.json

# Test it
opencode run "Hello, test the memory plugin"
```

### Building

```bash
bun run build
```

## API Reference

### Plugin Export

```typescript
import { WithvibesPlugin } from "opencode-withvibes";

// The plugin is automatically loaded by OpenCode via opencode.json
```

### Tools Provided

#### `remember`

Store an explicit fact in memory.

```typescript
remember({
  fact: "User prefers functional programming style"
})
```

#### `recall`

Search memory for relevant facts.

```typescript
recall({
  query: "programming style preferences"
})
// Returns: Found 1 relevant memories:
// - User prefers functional programming style (2025-10-29 - present)
```

### Hooks

- **`chat.message`** - Automatically stores all conversation messages

## Troubleshooting

### Memory not being recalled

**Check:**
1. Is `ZEP_API_KEY` set?
2. Enable debug mode: `export ZEP_DEBUG=true`
3. Verify user ID is consistent across sessions
4. Check Zep dashboard at https://app.getzep.com

### "Message content exceeds 2500 characters" error

This should be handled automatically. If you see this error:
1. Update to latest version of the plugin
2. The plugin now uses `graph.add` for long messages

### Facts seem outdated

Facts are temporal - check the validity dates in results. Provide new information to invalidate old facts.

## Contributing

Contributions welcome! This is currently a private plugin for Withvibes projects, but may be open-sourced in the future.

## License

MIT © spikel1283

## Resources

- [Zep Cloud Dashboard](https://app.getzep.com)
- [Zep Documentation](https://help.getzep.com)
- [OpenCode Plugin Docs](https://opencode.ai/docs/plugins)

## Support

For issues or questions about this plugin, contact the Withvibes team.
