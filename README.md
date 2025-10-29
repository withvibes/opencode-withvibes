# opencode-withvibes

OpenCode plugin providing persistent memory and context management via Zep Cloud knowledge graphs. Give your AI agents long-term memory across conversations and projects.

## 🎯 What Does This Plugin Do?

This plugin automatically remembers everything from your OpenCode conversations:
- **Persistent Memory** - Your preferences, coding style, project decisions persist across sessions
- **Semantic Search** - Ask "What CSS framework do I use?" and get answers from past conversations
- **Zero Configuration** - Just set your API key and it works automatically
- **Smart Storage** - Handles messages of any size with automatic chunking

### Real-World Example

\`\`\`bash
# Day 1: You mention your preferences
$ opencode run "I prefer React hooks over class components"
# → Stored automatically in your knowledge graph

# Day 7: In a completely new session
$ opencode run "Create a new component for me"
# → Agent recalls your preference and uses hooks without asking
\`\`\`

## 🚀 Quick Start

### 1. Get a Zep Cloud API Key

1. Sign up at [Zep Cloud](https://app.getzep.com) (free tier available)
2. Create a project
3. Copy your API key

### 2. Install the Plugin

**For local development:**
\`\`\`bash
# In your OpenCode project directory
cd /path/to/your/project

# Create opencode.json if it doesn't exist
cat > opencode.json <<EOF
{
  "plugin": ["opencode-withvibes"]
}
EOF
\`\`\`

**From npm (after publishing):**
\`\`\`bash
bun add opencode-withvibes
# or
npm install opencode-withvibes
\`\`\`

### 3. Configure Environment Variables

\`\`\`bash
# Required: Your Zep Cloud API key
export ZEP_API_KEY="your-zep-cloud-api-key"

# Optional: Customize behavior
export ZEP_USER_ID="your-unique-id"        # Default: "default-user"
export ZEP_THREAD_ID="custom-thread-id"    # Default: auto-generated per project
export ZEP_DEBUG="true"                     # Default: false (shows detailed logs)
export ZEP_ASYNC_STORAGE="true"                # Default: true (non-blocking, faster)
                                               # Set to "false" for blocking (guaranteed persistence)
\`\`\`

**💡 Tip:** Add these to your \`~/.zshrc\` or \`~/.bashrc\` for permanent setup.

### 4. Use OpenCode Normally

That's it! The plugin works automatically in the background:

\`\`\`bash
# Everything is remembered automatically
opencode run "I always use Tailwind CSS for styling"
opencode run "For this project, never commit directly to main"
opencode run "I prefer functional programming style"

# Later, in any session...
opencode run "Help me style this component"
# → Agent will use Tailwind CSS without asking

opencode run "Should I commit to main?"
# → Agent will remind you of the project policy
\`\`\`

## 🧠 How It Works

### Architecture Overview

\`\`\`
┌─────────────────────────────────────────────────────┐
│  Your OpenCode Conversation                         │
│  User: "I prefer TypeScript"                        │
│  Agent: "Got it, I'll use TypeScript"               │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ chat.message hook
                   ▼
┌─────────────────────────────────────────────────────┐
│  opencode-withvibes Plugin                          │
│  ┌────────────────────────────────────────────┐    │
│  │  Message Queue (p-queue)                   │    │
│  │  → Serializes storage to prevent races     │    │
│  └────────────────────────────────────────────┘    │
│                   │                                  │
│                   │ Smart routing                    │
│                   ▼                                  │
│  ┌────────────────┬────────────────────────────┐   │
│  │ Short Message  │  Long Message (>2500 chars)│   │
│  │ (<2500 chars)  │                            │   │
│  └────────────────┴────────────────────────────┘   │
│         │                      │                    │
│         │                      │ Chunk into 4500-   │
│         │                      │ byte segments      │
│         ▼                      ▼                    │
│  thread.addMessages     graph.add (per chunk)      │
└──────────────────┬──────────────┬──────────────────┘
                   │              │
                   ▼              ▼
         ┌─────────────────────────────────┐
         │  Zep Cloud Knowledge Graph      │
         │  • AI-powered fact extraction   │
         │  • Semantic indexing            │
         │  • Temporal tracking            │
         │  • Entity relationships         │
         └─────────────────────────────────┘
\`\`\`

### Message Flow

1. **Capture** - Every message (user and assistant) triggers the \`chat.message\` hook
2. **Queue** - Message is added to a serial queue (prevents race conditions)
3. **Process** - Text content is extracted and validated
4. **Route** - Messages are routed based on length:
   - ≤2500 chars → Direct storage via \`thread.addMessages\`
   - >2500 chars → Chunked into 4500-byte segments via \`graph.add\`
5. **Store** - Each chunk is uploaded to Zep Cloud sequentially
6. **Analyze** - Zep's AI extracts facts, entities, and relationships
7. **Index** - Information becomes searchable via semantic queries

## ⚡ Performance & Blocking Behavior

### Does This Block My Conversation?

**By default, no! (as of v0.0.2)** The plugin uses async storage mode for better performance.

**Two modes available:**

#### Async Mode (Default) - Non-Blocking ⚡
- **Faster:** Returns control immediately after queueing storage
- **Trade-off:** If OpenCode crashes mid-storage, that message may be lost
- **Best for:** Normal development work
- **Set with:** \`export ZEP_ASYNC_STORAGE="true"\` (or omit, it's the default)

#### Blocking Mode - Guaranteed Persistence 🔒
- **Reliable:** Waits until storage completes before continuing
- **Trade-off:** ~100-300ms delay after each message
- **Best for:** Critical conversations you can't afford to lose
- **Set with:** \`export ZEP_ASYNC_STORAGE="false"\`

**Why we have both modes:**
- ✅ **Async (default)** - Fast, responsive, good enough for 99% of use cases
- ✅ **Blocking (opt-in)** - Guaranteed persistence for critical work

**Note:** The \`recall\` tool always blocks (it must wait for search results), but storage is async by default.

### Performance Characteristics

| Operation | Time | Blocks? |
|-----------|------|---------|
| Short message (<2500 chars) | ~100-300ms | No (async mode) / Yes (blocking mode) |
| Long message (10,000 chars) | ~500-800ms | No (async mode) / Yes (blocking mode) |
| Very long message (50,000 chars) | ~2-3 seconds | No (async mode) / Yes (blocking mode) |
| Tool: \`remember\` | ~100-300ms | Yes (always blocks) |
| Tool: \`recall\` | ~200-500ms | Yes (always blocks) |

### When Storage Happens

\`\`\`bash
# Storage happens AFTER each message
$ opencode run "Write a function"
# → You type this
# → Agent responds
# → Agent's response is stored (blocks briefly)
# → Prompt returns to you

# NOT during your typing or thinking time
\`\`\`

### Optimization Tips

**If you're experiencing slowness:**

1. **Use debug mode to identify bottlenecks:**
   \`\`\`bash
   export ZEP_DEBUG=true
   opencode run "test message"
   # Watch for: "Stored chunk X/Y" and "Queue status: ..."
   \`\`\`

2. **Check your network latency to Zep Cloud:**
   \`\`\`bash
   curl -w "\nTime: %{time_total}s\n" https://api.getzep.com
   \`\`\`

3. **Reduce message sizes** - Very long responses take longer to store

4. **The queue prevents parallel storage** - This is by design to avoid race conditions

## 🛠️ Available Tools

The plugin provides two tools that agents can use explicitly:

### \`remember\` - Store Critical Facts

Use when you want to **explicitly** store something important.

\`\`\`bash
opencode run "Remember that this project uses the Convex backend"
\`\`\`

**Agent will call:**
\`\`\`typescript
remember({
  fact: "This project uses the Convex backend"
})
\`\`\`

**Validation:**
- Maximum 2500 characters
- Trims whitespace
- Returns error if empty or too long

### \`recall\` - Search Your Memory

Use when you want to **retrieve** specific information.

\`\`\`bash
opencode run "What backend does this project use?"
\`\`\`

**Agent will call:**
\`\`\`typescript
recall({
  query: "backend technology"
})
// Returns: Found 1 relevant memories:
// - This project uses the Convex backend (2025-10-29 - present)
\`\`\`

**Validation:**
- Maximum 500 characters
- Semantic search (finds meaning, not just keywords)
- Returns up to 5 most relevant facts

**💡 Pro Tip:** You don't need to use these explicitly! The plugin stores everything automatically. Use \`remember\` only for critical facts you want to ensure are captured.

## 🔐 Privacy & Isolation

### User-Level Isolation

Each \`ZEP_USER_ID\` gets a completely isolated knowledge graph:

\`\`\`bash
# User 1
export ZEP_USER_ID="alice"
opencode run "I prefer Python"

# User 2
export ZEP_USER_ID="bob"
opencode run "I prefer JavaScript"

# Alice and Bob CANNOT see each other's preferences
\`\`\`

### Project-Level Memory (Automatic)

The plugin generates a unique thread ID per project directory:

\`\`\`bash
# Project A
cd /Users/you/project-a
opencode run "This project uses React"

# Project B
cd /Users/you/project-b
opencode run "This project uses Vue"

# Memories are kept separate automatically!
\`\`\`

**Thread ID Format:** \`thread-{userId}-{directoryHash}\`
- Uses MD5 hash of directory path
- Same directory = same thread
- Moving project = new thread (see Troubleshooting)

## 📊 Memory Scope (v0.0.1)

**Current version provides:**
- ✅ User-level memory (isolated per user)
- ✅ Project-level memory (automatic per directory)
- ✅ Cross-session persistence
- ✅ Temporal fact tracking (when facts became true/false)

**Future versions will add:**
- ⏳ Team-level memory (shared across team members)
- ⏳ Organization-level memory (company-wide policies)
- ⏳ Explicit scope control (\`remember-project\`, \`remember-team\`)

See \`skills/zep-memory/reference/architecture.md\` for the full roadmap.

## 🐛 Troubleshooting

### Memory Not Being Recalled

**Symptoms:** Agent doesn't remember previous conversations

**Check:**
\`\`\`bash
# 1. Verify API key is set
echo $ZEP_API_KEY
# Should print your key

# 2. Enable debug mode
export ZEP_DEBUG=true
opencode run "test"
# Look for: "[Withvibes] Message stored successfully"

# 3. Check user ID is consistent
echo $ZEP_USER_ID
# Should be the same across sessions

# 4. View your data in Zep dashboard
open https://app.getzep.com
# Check if facts are being stored
\`\`\`

**Common causes:**
- Different \`ZEP_USER_ID\` across sessions
- API key expired or invalid
- Network connectivity issues

### Lost Memory After Moving Project

**Symptoms:** Plugin "forgets" everything after moving project directory

**Cause:** Thread ID is based on directory path hash

**Solution:**
\`\`\`bash
# Option 1: Set a permanent thread ID for this project
export ZEP_THREAD_ID="my-project-thread"

# Option 2: Use git remote URL for stable ID (future feature)
\`\`\`

### Slow Performance

**Symptoms:** Noticeable delay after each message

**Check:**
\`\`\`bash
# 1. Enable debug to see timing
export ZEP_DEBUG=true

# 2. Check network latency
ping api.getzep.com

# 3. Look for chunking
# If you see "Stored chunk X/Y", messages are being split
# Consider reducing response length
\`\`\`

**Optimization:**
- Use shorter, more focused prompts
- Check internet connection speed
- Verify Zep Cloud service status

### "Error: Fact is too long"

**Cause:** \`remember\` tool has a 2500 character limit

**Solution:**
\`\`\`bash
# Split into multiple facts
opencode run "Remember: Part 1 of project requirements..."
opencode run "Remember: Part 2 of project requirements..."

# Or just let automatic storage handle it (no limit)
opencode run "Here are all the project requirements..."
# → Stored automatically via chunking
\`\`\`

### "Message content exceeds 2500 characters" error

This should be handled automatically. If you see this error:
1. Update to latest version of the plugin
2. The plugin now automatically chunks messages >2500 chars

### Gitleaks or Linting Errors

**Symptoms:** Pre-commit hook fails

**Solution:**
\`\`\`bash
# Install gitleaks
brew install gitleaks

# Run linting manually
bun run lint:fix

# Check for secrets
gitleaks detect --source . --verbose
\`\`\`

## 🔧 Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| \`ZEP_API_KEY\` | ✅ Yes | - | Your Zep Cloud API key |
| \`ZEP_USER_ID\` | No | \`"default-user"\` | Unique user identifier |
| \`ZEP_THREAD_ID\` | No | Auto-generated | Override thread ID |
| \`ZEP_DEBUG\` | No | \`false\` | Enable verbose logging |
| \`ZEP_ASYNC_STORAGE\` | No | \`true\` | Async storage mode (non-blocking). Set to \`false\` for blocking mode (guaranteed persistence) |

### Thread ID Generation

**Default behavior:**
\`\`\`
thread-{userId}-{md5(directory).substring(0,8)}
\`\`\`

**Examples:**
\`\`\`bash
# User: alice, Directory: /Users/alice/my-app
# Thread ID: thread-alice-a1b2c3d4

# User: bob, Directory: /Users/bob/my-app
# Thread ID: thread-bob-e5f6g7h8

# Same user, same directory → same thread (persistent memory)
# Different users, same directory → different threads (isolated)
\`\`\`

**Override:**
\`\`\`bash
export ZEP_THREAD_ID="permanent-thread-id"
# All projects will share this thread
\`\`\`

## 📚 Advanced Usage

### Debugging with Debug Mode

\`\`\`bash
export ZEP_DEBUG=true
opencode run "test message"
\`\`\`

**Output:**
\`\`\`
[Withvibes] Plugin loading...
[Withvibes] Initialized for user: alice, thread: thread-alice-a1b2c3d4
[Withvibes] Storing message from role: user
[Withvibes] Message stored successfully via thread.addMessages
[Withvibes] Storing message from role: assistant
[Withvibes] Message length: 5000 chars, chunking for storage
[Withvibes] Stored chunk 1/2
[Withvibes] Stored chunk 2/2
[Withvibes] Long message stored successfully (2 chunks)
[Withvibes] Queue status: 0 pending, 0 waiting
\`\`\`

### Using the Zep Memory Skill

The plugin bundles a comprehensive skill with best practices:

\`\`\`bash
# Load the skill for detailed guidance
opencode run "Use the zep-memory skill"

# The agent gets access to:
# - Best practices for memory usage
# - When to use recall vs reading files
# - Complete Zep API reference
# - Multi-level architecture documentation
\`\`\`

### Viewing Your Knowledge Graph

Visit [Zep Cloud Dashboard](https://app.getzep.com) to:
- Browse stored facts
- View entity relationships
- See temporal validity dates
- Manage users and threads
- Export your data

## 🏗️ Development

### Prerequisites

- Bun v1.0+ or Node.js 18+
- TypeScript 5+
- Zep Cloud account

### Local Development Setup

\`\`\`bash
# Clone the repository
git clone https://github.com/withvibes/opencode-withvibes.git
cd opencode-withvibes

# Install dependencies
bun install

# Build
bun run build

# Run linting
bun run lint

# Fix linting issues
bun run lint:fix
\`\`\`

### Testing in a Project

\`\`\`bash
# In a test project directory
cd /path/to/test/project

# Create opencode.json pointing to local plugin
cat > opencode.json <<EOF
{
  "plugin": ["../opencode-withvibes"]
}
EOF

# Set environment variables
export ZEP_API_KEY="your-test-key"
export ZEP_USER_ID="test-user"
export ZEP_DEBUG="true"

# Test it
opencode run "Hello, test the memory plugin"
\`\`\`

### Pre-commit Hooks

This project uses Husky + lint-staged + gitleaks:

\`\`\`bash
# Automatically runs on git commit:
# 1. Gitleaks - scans for secrets
# 2. Biome - lints and formats code

# Run manually:
bun run lint:fix
gitleaks detect --source . --verbose
\`\`\`

## 📦 Plugin Structure

\`\`\`
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
├── .husky/                   # Git hooks
│   └── pre-commit           # Gitleaks + linting
├── AGENTS.md                 # Agent instructions
├── CLAUDE.md                 # Claude Code documentation
├── biome.json                # Linting configuration
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
\`\`\`

## 📄 API Reference

### Plugin Export

\`\`\`typescript
import { WithvibesPlugin } from "opencode-withvibes";

// The plugin is automatically loaded by OpenCode via opencode.json
\`\`\`

### Hooks

- **\`chat.message\`** - Automatically stores all conversation messages
  - Queued for serial execution (prevents race conditions)
  - Automatically handles message chunking
  - Logs progress in debug mode

### Tools Provided

#### \`remember(fact: string)\`

Store an explicit fact in memory.

\`\`\`typescript
remember({
  fact: "User prefers functional programming style"
})
\`\`\`

**Returns:** Success message or error string

#### \`recall(query: string)\`

Search memory for relevant facts.

\`\`\`typescript
recall({
  query: "programming style preferences"
})
\`\`\`

**Returns:** List of relevant facts with validity dates

## 🤝 Contributing

Contributions welcome! This is currently a private plugin for With vibes projects, but may be open-sourced in the future.

**Before submitting a PR:**
1. Run \`bun run lint:fix\`
2. Ensure \`bun run build\` succeeds
3. Test with a real OpenCode project
4. Update CLAUDE.md if architecture changes

## 📄 License

MIT

## 🔗 Resources

- [Zep Cloud Dashboard](https://app.getzep.com)
- [Zep Documentation](https://help.getzep.com)
- [OpenCode Plugin Docs](https://opencode.ai/docs/plugins)
- [GitHub Repository](https://github.com/withvibes/opencode-withvibes)

## 💬 Support

For issues or questions about this plugin, contact the With Vibes team.

---

**Made with ❤️ for persistent AI memory**
