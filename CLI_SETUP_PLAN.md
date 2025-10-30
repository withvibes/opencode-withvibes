# CLI Setup Tool - Implementation Plan

## Overview

Create an **automated** CLI tool (`opencode-withvibes setup`) for Daytona sandbox environments that handles:
- Environment variable validation (ZEP_API_KEY, ZEP_USER_ID)
- Zep Cloud connection testing
- Automated agent configuration (5 pre-configured agents)
- Safe merging/backup of existing configs
- External prompt files (in `prompts/` directory)
- Zero user interaction (reads from environment)

## Architecture

### Package Structure

```
opencode-withvibes/
├── bin/
│   └── setup.js              # Main CLI entry point
├── src/
│   ├── cli/
│   │   ├── setup-zep.ts      # Zep Cloud configuration
│   │   ├── setup-agents.ts   # Agent configuration
│   │   ├── verify.ts         # Connection verification
│   │   └── utils.ts          # Shared utilities
│   └── index.ts              # Plugin code
├── opencode.json.example     # Template with inline prompts
└── package.json
```

### Package.json Configuration

```json
{
  "bin": {
    "opencode-withvibes": "./bin/setup.js"
  },
  "dependencies": {
    "prompts": "^2.4.2",        // Interactive CLI prompts
    "chalk": "^5.3.0",          // Terminal colors
    "ora": "^8.0.1"             // Spinners for async operations
  }
}
```

### Usage in Daytona Sandbox

```bash
# Step 1: Install the plugin
bun install opencode-withvibes

# Step 2: Run automated setup (env vars already set by external process)
npx opencode-withvibes setup

# Optional: Force overwrite existing agent configs
npx opencode-withvibes setup --overwrite

# Done! Start using OpenCode
opencode run "Build a TanStack website"
```

### Environment Variables (Set by External Process)

**Required:**
```bash
ZEP_API_KEY=zep_xxx        # Zep Cloud API key
ZEP_USER_ID=dev-user       # User ID for memory isolation
```

**Optional:**
```bash
ZEP_THREAD_ID=custom-id    # Auto-generated per project if not set
ZEP_DEBUG=true             # Enable debug logging
```

---

## Step 1: Environment Validation (Automated)

### CLI Output

```
🎯 OpenCode Withvibes Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Environment variables detected
   ZEP_API_KEY: zep_••••••••••••••••
   ZEP_USER_ID: dev-user
   ZEP_DEBUG: true

✅ Zep Cloud connection verified
   User: dev-user
   API: https://api.getzep.com

[Continuing to agent configuration...]
```

### Implementation Details

**Environment Validation:**
```typescript
function validateEnvironment(): EnvVars {
  const ZEP_API_KEY = process.env.ZEP_API_KEY
  const ZEP_USER_ID = process.env.ZEP_USER_ID
  const ZEP_THREAD_ID = process.env.ZEP_THREAD_ID
  const ZEP_DEBUG = process.env.ZEP_DEBUG

  if (!ZEP_API_KEY) {
    console.error('❌ Missing required environment variable: ZEP_API_KEY')
    console.error('\nSet it before running setup:')
    console.error('  export ZEP_API_KEY=your-api-key')
    process.exit(1)
  }

  if (!ZEP_USER_ID) {
    console.error('❌ Missing required environment variable: ZEP_USER_ID')
    console.error('\nSet it before running setup:')
    console.error('  export ZEP_USER_ID=your-user-id')
    process.exit(1)
  }

  // Validate API key format
  if (!ZEP_API_KEY.startsWith('zep_')) {
    console.error('❌ Invalid ZEP_API_KEY format (should start with "zep_")')
    process.exit(1)
  }

  return { ZEP_API_KEY, ZEP_USER_ID, ZEP_THREAD_ID, ZEP_DEBUG }
}
```

**Zep Connection Test:**
```typescript
async function testZepConnection(apiKey: string, userId: string) {
  const zep = new ZepClient({ apiKey })
  try {
    // Try to get or create user
    await zep.user.add({ userId, firstName: userId })
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err.message,
      suggestion: 'Check your API key at https://app.getzep.com'
    }
  }
}
```

**Error Handling:**
- Missing env vars → Show error, exit code 1
- Invalid API key format → Show error, exit code 1
- Connection failure → Show error with debugging hints, exit code 1

---

## Step 2: Agent Configuration (Automated)

### The 5 Pre-Configured Agents

**Primary Agents** (switch with Tab key):
1. **fullstack** - TanStack development with testing and memory
2. **designer** - UI/UX with visual design and theming
3. **docs** - Documentation and spreadsheet specialist

**Subagents** (invoke with @mention):
4. **tester** - Testing, linting, type checking, code quality
5. **memory-expert** - Advanced memory operations and context retrieval

### Safe opencode.json Handling

**When opencode.json EXISTS** (without --overwrite):

```
📋 Agent Configuration

✅ Found existing opencode.json
   Creating backup: opencode.json.backup.2025-10-29-14-30-45

⏭️  Agent "fullstack" already exists, skipping...
⏭️  Agent "designer" already exists, skipping...
✅ Adding agent "docs" (new)
✅ Adding agent "tester" (new)
✅ Adding agent "memory-expert" (new)

ℹ️  Use --overwrite flag to replace existing agent configs
```

**When opencode.json EXISTS** (with --overwrite):

```
📋 Agent Configuration

⚠️  Overwrite mode enabled

✅ Backed up existing config
   → opencode.json.backup.2025-10-29-14-30-45

🔄 Overwriting agent configs
   - fullstack (replaced)
   - designer (replaced)
   - docs (replaced)
   - tester (replaced)
   - memory-expert (replaced)
```

**When opencode.json DOES NOT EXIST:**

```
📋 Agent Configuration

✅ Created opencode.json
   Plugin: opencode-withvibes
   Agents: 5 configured (3 primary, 2 subagents)
```

### Implementation Details

**Merge Logic with --overwrite Support:**

```typescript
interface SetupOptions {
  overwrite: boolean  // --overwrite flag
}

function mergeConfig(existing: Config, template: Config, options: SetupOptions) {
  // 1. Always add plugin if missing
  if (!existing.plugin) {
    existing.plugin = []
  }
  if (!existing.plugin.includes('opencode-withvibes')) {
    existing.plugin.push('opencode-withvibes')
  }

  // 2. Handle agents based on overwrite flag
  if (!existing.agent) {
    existing.agent = {}
  }

  for (const [agentName, agentConfig] of Object.entries(template.agent)) {
    if (existing.agent[agentName]) {
      if (options.overwrite) {
        // Replace existing agent
        console.log(`🔄 Overwriting agent "${agentName}"`)
        existing.agent[agentName] = agentConfig
      } else {
        // Skip existing agent
        console.log(`⏭️  Agent "${agentName}" exists, skipping`)
      }
    } else {
      // Add new agent
      console.log(`✅ Adding agent "${agentName}"`)
      existing.agent[agentName] = agentConfig
    }
  }

  // 3. Add permission config if missing (never overwrite)
  if (!existing.permission) {
    existing.permission = {
      bash: 'allow',
      edit: 'allow',
      webfetch: 'allow'
    }
  }

  return existing
}
```

**Safety Measures:**

1. **Always Backup Before Changes**
   ```typescript
   const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
   const backupPath = `opencode.json.backup.${timestamp}`
   fs.copyFileSync('opencode.json', backupPath)
   console.log(`✅ Backed up existing config → ${backupPath}`)
   ```

2. **Atomic Writes**
   ```typescript
   // Write to temp file first
   fs.writeFileSync('opencode.json.tmp', content)
   // Then rename (atomic operation)
   fs.renameSync('opencode.json.tmp', 'opencode.json')
   ```

3. **JSON Validation**
   ```typescript
   try {
     const parsed = JSON.parse(content)
     // Validate required fields
     if (!parsed.$schema) {
       parsed.$schema = 'https://opencode.ai/config.json'
     }
   } catch (err) {
     console.error('❌ Invalid JSON generated, aborting')
     process.exit(1)
   }
   ```

4. **Rollback on Error**
   ```typescript
   try {
     fs.writeFileSync('opencode.json', newContent)
   } catch (err) {
     if (backupExists) {
       fs.copyFileSync(backupPath, 'opencode.json')
       console.error('❌ Write failed, restored from backup')
     }
     process.exit(1)
   }
   ```

### Configured Agents (All 5 Automatically Added)

The CLI configures these 5 agents with external prompts:

**1. fullstack** (Primary)
- **Skills:** artifacts-builder, webapp-testing, mcp-builder, theme-factory, skill-creator, zep-memory
- **Prompt:** `{file:./prompts/fullstack.md}`
- **Purpose:** TanStack development, React, TypeScript, testing

**2. designer** (Primary)
- **Skills:** canvas-design, artifacts-builder, theme-factory, slack-gif-creator, zep-memory
- **Prompt:** `{file:./prompts/designer.md}`
- **Purpose:** UI/UX design, visual art, Tailwind CSS

**3. docs** (Primary)
- **Skills:** document-skills (xlsx/docx/pptx/pdf), zep-memory
- **Prompt:** `{file:./prompts/docs.md}`
- **Purpose:** Documentation, spreadsheets, technical writing

**4. tester** (Subagent)
- **Skills:** webapp-testing, zep-memory
- **Prompt:** `{file:./prompts/tester.md}`
- **Purpose:** Testing, linting (eslint/prettier), type checking (tsc)

**5. memory-expert** (Subagent)
- **Skills:** zep-memory only
- **Prompt:** `{file:./prompts/memory-expert.md}`
- **Purpose:** Complex memory queries, context retrieval

### Generated opencode.json:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-withvibes"],

  "agent": {
    "fullstack": {
      "description": "Full TanStack development with testing and memory",
      "mode": "primary",
      "model": "anthropic/claude-sonnet-4-20250514",
      "prompt": "{file:./prompts/fullstack.md}",
      "tools": {
        "skills_zep_memory": true,
        "skills_artifacts_builder": true,
        "skills_webapp_testing": true,
        "skills_mcp_builder": true,
        "skills_theme_factory": true,
        "skills_skill_creator": true,
        "remember": true,
        "recall": true,
        "write": true,
        "edit": true,
        "bash": true,
        "read": true,
        "grep": true,
        "glob": true,
        "webfetch": true
      }
    },

    "designer": {
      "description": "UI/UX specialist with visual design and theming",
      "mode": "primary",
      "model": "anthropic/claude-sonnet-4-20250514",
      "prompt": "{file:./prompts/designer.md}",
      "tools": {
        "skills_zep_memory": true,
        "skills_canvas_design": true,
        "skills_artifacts_builder": true,
        "skills_theme_factory": true,
        "skills_slack_gif_creator": true,
        "remember": true,
        "recall": true,
        "write": true,
        "edit": true,
        "bash": true,
        "read": true,
        "webfetch": true
      }
    },

    "docs": {
      "description": "Documentation and spreadsheet specialist",
      "mode": "primary",
      "model": "anthropic/claude-sonnet-4-20250514",
      "prompt": "{file:./prompts/docs.md}",
      "tools": {
        "skills_zep_memory": true,
        "skills_document_skills_xlsx": true,
        "skills_document_skills_docx": true,
        "skills_document_skills_pptx": true,
        "skills_document_skills_pdf": true,
        "remember": true,
        "recall": true,
        "write": true,
        "edit": true,
        "bash": true,
        "read": true,
        "webfetch": true
      }
    },

    "tester": {
      "description": "Testing, linting, type checking, and code quality",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-20250514",
      "prompt": "{file:./prompts/tester.md}",
      "tools": {
        "skills_zep_memory": true,
        "skills_webapp_testing": true,
        "remember": true,
        "recall": true,
        "write": true,
        "edit": true,
        "bash": true,
        "read": true,
        "grep": true,
        "glob": true
      }
    },

    "memory-expert": {
      "description": "Advanced memory operations and context retrieval",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-20250514",
      "prompt": "{file:./prompts/memory-expert.md}",
      "tools": {
        "skills_zep_memory": true,
        "remember": true,
        "recall": true,
        "read": true
      }
    }
  },

  "permission": {
    "bash": "allow",
    "edit": "allow",
    "webfetch": "allow"
  }
}
```

---

## Step 3: Final Output (Success)

### Complete Setup Output

```
🎯 OpenCode Withvibes Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Environment variables detected
   ZEP_API_KEY: zep_••••••••••••••••
   ZEP_USER_ID: dev-user
   ZEP_DEBUG: true

✅ Zep Cloud connection verified
   User: dev-user
   API: https://api.getzep.com

✅ Created opencode.json
   Plugin: opencode-withvibes
   Agents: 5 configured (3 primary, 2 subagents)

✅ Created prompts/ directory
   - prompts/fullstack.md
   - prompts/designer.md
   - prompts/docs.md
   - prompts/tester.md
   - prompts/memory-expert.md

✨ Setup complete! Start coding:
   opencode run "Build a TanStack website"
   opencode run "@tester check everything"
   opencode run "@memory-expert What preferences have I stated?"

📚 Documentation:
  https://github.com/withvibes/opencode-withvibes#readme
```

### Implementation Details

**Create Prompts Directory:**
```typescript
function createPromptsDirectory() {
  const promptsDir = path.join(process.cwd(), 'prompts')

  if (!fs.existsSync(promptsDir)) {
    fs.mkdirSync(promptsDir, { recursive: true })
  }

  // Copy prompt files from plugin
  const promptFiles = [
    'fullstack.md',
    'designer.md',
    'docs.md',
    'tester.md',
    'memory-expert.md'
  ]

  for (const file of promptFiles) {
    const source = path.join(__dirname, '..', 'prompts', file)
    const dest = path.join(promptsDir, file)
    fs.copyFileSync(source, dest)
    console.log(`✅ Created prompts/${file}`)
  }
}
```

---

## Command Line Options

```bash
# Automated setup (reads from environment variables)
npx opencode-withvibes setup

# Force overwrite existing agent configs
npx opencode-withvibes setup --overwrite
npx opencode-withvibes setup -f

# Show help
npx opencode-withvibes --help
npx opencode-withvibes -h

# Show version
npx opencode-withvibes --version
npx opencode-withvibes -v
```

**Environment Variables (Required):**
- `ZEP_API_KEY` - Your Zep Cloud API key
- `ZEP_USER_ID` - User ID for memory isolation

**Environment Variables (Optional):**
- `ZEP_THREAD_ID` - Custom thread ID (auto-generated if not set)
- `ZEP_DEBUG` - Enable debug logging (`true`/`false`)

---

## Error Handling

### Invalid API Key
```
❌ Failed to connect to Zep Cloud
   Error: Invalid API key

💡 Tips:
   - Get your API key at https://app.getzep.com
   - Make sure you copied the entire key
   - Keys start with 'zep_'

Try again? (y/n) ›
```

### Permission Denied
```
❌ Cannot write to opencode.json
   Error: EACCES: permission denied

💡 Try:
   sudo chown $USER opencode.json

   Or run setup in a directory where you have write access
```

### Invalid Existing Config
```
❌ Existing opencode.json is invalid JSON
   Error: Unexpected token } in JSON at position 145

💡 Options:
   1. Fix the JSON manually and try again
   2. Backup and replace with new config
   3. Skip agent configuration

What would you like to do? ›
```

---

## Implementation Checklist

### Phase 1: CLI Entry Point
- [ ] Create `bin/setup.js` entry point
- [ ] Add dependencies: `chalk`, `ora`, `@getzep/zep-cloud`
- [ ] Implement argument parsing (--overwrite, --help, --version)
- [ ] Add basic error handling and exit codes

### Phase 2: Environment Validation
- [ ] Implement `validateEnvironment()` function
- [ ] Check for required env vars (ZEP_API_KEY, ZEP_USER_ID)
- [ ] Validate API key format (starts with `zep_`)
- [ ] Implement Zep connection test
- [ ] Add clear error messages for missing/invalid vars

### Phase 3: Agent Configuration
- [ ] Create 5 agent configuration templates
- [ ] Implement `mergeConfig()` with --overwrite support
- [ ] Implement backup functionality (timestamp-based)
- [ ] Implement atomic writes (temp file → rename)
- [ ] Add JSON validation
- [ ] Handle plugin array merging

### Phase 4: Prompts Directory
- [ ] Bundle 5 prompt files in package (`prompts/*.md`)
- [ ] Implement `createPromptsDirectory()` function
- [ ] Copy prompt files from plugin to project
- [ ] Handle existing prompts (skip or overwrite based on flag)

### Phase 5: Output & Polish
- [ ] Implement success output with summary
- [ ] Add spinner animations for async operations
- [ ] Use chalk for colored output
- [ ] Add help text (--help flag)
- [ ] Add version output (--version flag)
- [ ] Test in Daytona sandbox environment
- [ ] Update README with automated setup instructions

---

## Dependencies

```json
{
  "dependencies": {
    "@getzep/zep-cloud": "^3.8.0",    // Zep client (already included)
    "chalk": "^5.3.0",                 // Terminal colors (ESM)
    "ora": "^8.0.1"                    // Loading spinners (ESM)
  }
}
```

**Note:** Use ESM-compatible versions of `chalk` and `ora` since the project uses `"type": "module"`.

---

## Summary

**What the CLI does:**
1. ✅ Validates environment variables (ZEP_API_KEY, ZEP_USER_ID)
2. ✅ Tests Zep Cloud connection
3. ✅ Creates/merges opencode.json with 5 pre-configured agents
4. ✅ Creates prompts/ directory with external prompt files
5. ✅ Supports --overwrite flag to replace existing agents
6. ✅ Zero user interaction (fully automated for Daytona)

**Agent Configuration:**
- **3 Primary Agents:** fullstack, designer, docs (Tab to switch)
- **2 Subagents:** tester, memory-expert (@mention to invoke)
- **All agents** use memory (Zep Cloud) and external prompts
- **All tools** set to `"allow"` (no permission prompts)
- **Optimized for:** TanStack development with Bun in Daytona sandboxes

**Python Scripts:**
- All use inline `uv` scripting (`#!/usr/bin/env -S uv run --script`)
- PEP 723 inline dependencies
- Examples: `init_skill.py`, `package_skill.py`, `quick_validate.py`
