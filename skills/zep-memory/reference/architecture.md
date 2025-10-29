# Zep Multi-Level Memory Architecture

**Status:** Planned for v2.0+
**Current Version:** v1.0 (User-level only)

## Overview

This document describes the complete multi-level memory architecture for the Zep memory system. While v1.0 only supports user-level memory, this architecture provides the foundation for expanding to project, team, and organization-level shared memory in future versions.

## Memory Hierarchy

Zep v3 supports two types of knowledge graphs that enable multi-level memory:

### 1. User Graphs (Personal Memory)

**Characteristics:**
- One graph per user (automatically created)
- Isolated and private to each user
- Stores personal preferences, traits, conversation history
- Accessible via `userId` parameter

**Current Status:** ✅ **Implemented in v1.0**

**Use Cases:**
- Individual coding preferences ("I prefer functional programming")
- Personal shortcuts and aliases
- User-specific workflow preferences
- Private notes and reminders

**API Example:**
```typescript
// Add to user graph (automatic via thread.addMessages)
await zep.thread.addMessages(threadId, {
  messages: [{ role: 'user', content: 'I prefer TypeScript' }]
});

// Search user graph
await zep.graph.search({
  userId: "spikel1283",
  query: "programming preferences"
});
```

### 2. Custom Graphs (Shared Knowledge)

**Characteristics:**
- Created explicitly for specific purposes
- Shared across multiple users
- Stores collaborative knowledge, team context, project info
- Accessible via `graphId` parameter

**Current Status:** 🔄 **Planned for v2.0+**

**Use Cases:**
- Project-specific technical decisions
- Team conventions and practices
- Organization-wide policies
- Shared documentation and context

**API Example:**
```typescript
// Create a custom graph
await zep.graph.create({
  graphId: "project-withvibes-dev",
  name: "Withvibes Dev Project",
  description: "Shared knowledge for the Withvibes.dev project"
});

// Add knowledge to the graph
await zep.graph.add({
  graphId: "project-withvibes-dev",
  type: "text",
  data: "This project uses TanStack, Convex, and WorkOS for auth"
});

// Search the graph
await zep.graph.search({
  graphId: "project-withvibes-dev",
  query: "authentication"
});
```

## Multi-Level Architecture Design

### Hierarchy Structure

```
┌─────────────────────────────────────────┐
│  ORG GRAPH (org-{orgId})                │
│  "All PRs need 2 approvals"             │
│  Scope: Company-wide                     │
│  Access: All employees                   │
│  ↓                                       │
├─────────────────────────────────────────┤
│  TEAM GRAPH (team-{teamId})             │
│  "We use conventional commits"          │
│  Scope: Engineering team                 │
│  Access: Team members only               │
│  ↓                                       │
├─────────────────────────────────────────┤
│  PROJECT GRAPH (project-{projectId})    │
│  "Uses TanStack + Convex + WorkOS"      │
│  Scope: Single codebase                  │
│  Access: Project contributors            │
│  ↓                                       │
├─────────────────────────────────────────┤
│  USER GRAPH (user-{userId})             │
│  "I prefer TypeScript over JavaScript"  │
│  Scope: Individual only                  │
│  Access: Single user                     │
└─────────────────────────────────────────┘
```

### Memory Level Specifications

| Level | Graph Type | ID Format | Scope | Access Pattern |
|-------|------------|-----------|-------|----------------|
| **User** | User Graph | `userId` | Personal preferences, individual work | Single user only |
| **Project** | Custom Graph | `project-{projectId}` | Project context, tech stack, codebase info | All project contributors |
| **Team** | Custom Graph | `team-{teamId}` | Team conventions, shared practices | All team members |
| **Organization** | Custom Graph | `org-{orgId}` | Company policies, standards | All employees |

### Environment Variable Strategy

```typescript
// Environment variables for multi-level memory
const userId = process.env.ZEP_USER_ID;           // "spikel1283"
const projectId = process.env.ZEP_PROJECT_ID;     // "withvibes-dev"
const teamId = process.env.ZEP_TEAM_ID;          // "engineering"
const orgId = process.env.ZEP_ORG_ID;            // "withvibes"

// Generate graph IDs
const projectGraphId = `project-${projectId}`;
const teamGraphId = `team-${teamId}`;
const orgGraphId = `org-${orgId}`;
```

## Proposed Tools for v2.0+

### Enhanced Recall Tool

**Multi-level search with scope parameter:**

```typescript
recall: tool({
  description: "Search memories across user, project, team, and org levels",
  args: {
    query: tool.schema.string().describe("What to search for"),
    scope: tool.schema.enum(["user", "project", "team", "org", "all"])
      .optional()
      .default("all")
      .describe("Which memory level to search")
  },
  async execute(args) {
    const results = [];

    // Search user graph
    if (args.scope === "user" || args.scope === "all") {
      const userResults = await zep.graph.search({
        userId: userId,
        query: args.query,
        limit: 5,
        scope: "edges"
      });
      results.push(...(userResults.edges || []));
    }

    // Search project graph
    if (args.scope === "project" || args.scope === "all") {
      const projectResults = await zep.graph.search({
        graphId: projectGraphId,
        query: args.query,
        limit: 5,
        scope: "edges"
      });
      results.push(...(projectResults.edges || []));
    }

    // Search team graph
    if (args.scope === "team" || args.scope === "all") {
      const teamResults = await zep.graph.search({
        graphId: teamGraphId,
        query: args.query,
        limit: 5,
        scope: "edges"
      });
      results.push(...(teamResults.edges || []));
    }

    // Search org graph
    if (args.scope === "org" || args.scope === "all") {
      const orgResults = await zep.graph.search({
        graphId: orgGraphId,
        query: args.query,
        limit: 5,
        scope: "edges"
      });
      results.push(...(orgResults.edges || []));
    }

    // Format results with source indication
    if (results.length > 0) {
      const facts = results.map(edge =>
        `[${edge.graphId || 'user'}] ${edge.fact}`
      ).join('\n');
      return `Found ${results.length} relevant memories:\n${facts}`;
    }

    return "No relevant memories found.";
  }
})
```

### Level-Specific Remember Tools

**1. remember-project** - Store project-level facts
```typescript
rememberProject: tool({
  description: "Store a fact in project memory (shared across all team members)",
  args: {
    fact: tool.schema.string().describe("The fact to remember for the project"),
  },
  async execute(args) {
    await zep.graph.add({
      graphId: projectGraphId,
      type: "text",
      data: args.fact
    });

    return `Project memory updated: ${args.fact}`;
  }
})
```

**2. remember-team** - Store team-level facts
```typescript
rememberTeam: tool({
  description: "Store a fact in team memory (shared across team)",
  args: {
    fact: tool.schema.string().describe("The fact to remember for the team"),
  },
  async execute(args) {
    await zep.graph.add({
      graphId: teamGraphId,
      type: "text",
      data: args.fact
    });

    return `Team memory updated: ${args.fact}`;
  }
})
```

**3. remember-org** - Store org-level facts
```typescript
rememberOrg: tool({
  description: "Store a fact in org memory (shared company-wide)",
  args: {
    fact: tool.schema.string().describe("The fact to remember for the organization"),
  },
  async execute(args) {
    await zep.graph.add({
      graphId: orgGraphId,
      type: "text",
      data: args.fact
    });

    return `Organization memory updated: ${args.fact}`;
  }
})
```

### Memory Management Tools

**1. forget** - Invalidate facts
```typescript
forget: tool({
  description: "Remove or invalidate a fact from memory",
  args: {
    query: tool.schema.string().describe("Search for the fact to forget"),
    scope: tool.schema.enum(["user", "project", "team", "org"])
      .describe("Which memory level to forget from")
  },
  async execute(args) {
    const graphParam = args.scope === "user"
      ? { userId: userId }
      : { graphId: `${args.scope}-${args.scope}Id` };

    const results = await zep.graph.search({
      ...graphParam,
      query: args.query,
      limit: 1,
      scope: "edges"
    });

    if (results.edges && results.edges.length > 0) {
      const edge = results.edges[0];
      // Mark as invalid by adding contradicting fact or using Zep's update API
      return `Forgot: ${edge.fact}`;
    }

    return "No matching memory found to forget.";
  }
})
```

**2. list-memories** - Browse stored facts
```typescript
listMemories: tool({
  description: "List all facts stored at a specific memory level",
  args: {
    scope: tool.schema.enum(["user", "project", "team", "org"])
      .describe("Which memory level to list"),
    limit: tool.schema.number().optional().default(10)
      .describe("Maximum number of facts to return")
  },
  async execute(args) {
    const graphParam = args.scope === "user"
      ? { userId: userId }
      : { graphId: `${args.scope}-${args.scope}Id` };

    const results = await zep.graph.search({
      ...graphParam,
      query: "", // Empty query to get all
      limit: args.limit,
      scope: "edges"
    });

    if (results.edges && results.edges.length > 0) {
      const facts = results.edges
        .map((edge, i) => `${i+1}. ${edge.fact} (${edge.validAt} - ${edge.invalidAt || 'present'})`)
        .join('\n');
      return `${args.scope} memories:\n${facts}`;
    }

    return `No memories found at ${args.scope} level.`;
  }
})
```

## Usage Scenarios

### Scenario 1: User Preferences (Current - v1.0)
```
User: "I prefer using Tailwind CSS"
→ Automatically stored in user graph

Later:
User: "What CSS framework do I like?"
→ recall tool searches user graph
→ Returns: "You prefer Tailwind CSS"
```

### Scenario 2: Project Context (Future - v2.0)
```
User: "This project uses Convex for the database"
→ remember-project tool stores in project graph

Different team member on same project:
User: "What database are we using?"
→ recall(scope: "project") searches project graph
→ Returns: "This project uses Convex"
```

### Scenario 3: Team Conventions (Future - v2.0)
```
Team lead: "Our team uses conventional commits"
→ remember-team tool stores in team graph

New team member:
User: "What commit format should I use?"
→ recall(scope: "team") searches team graph
→ Returns: "Team uses conventional commits"
```

### Scenario 4: Org Policies (Future - v2.0)
```
Admin: "Company policy: all PRs need 2 approvals"
→ remember-org tool stores in org graph

Any employee:
User: "How many PR approvals do we need?"
→ recall(scope: "org") searches org graph
→ Returns: "Company policy requires 2 PR approvals"
```

## Access Control & Security

### Current Implementation (v1.0)
- ✅ Each user has isolated user graph
- ✅ No cross-user data access
- ✅ Zep API key provides project-level security

### Future Multi-Level Access (v2.0+)

**Access Patterns:**

| Memory Level | Who Can Read | Who Can Write |
|--------------|--------------|---------------|
| User Graph | Owner only | Owner only |
| Project Graph | All project contributors | All project contributors |
| Team Graph | All team members | Team leads + members |
| Org Graph | All employees | Admins only |

**Security Mechanisms:**

1. **Environment Variables:** Graph IDs passed via env vars
   - Daytona sandboxes get different env vars per user/project/team
   - Missing env var = no access to that level

2. **Zep API Key:** Project-level access control
   - One API key per Zep Cloud project
   - All graphs belong to same project

3. **JWT Tokens (Optional):** Fine-grained access
   - User-specific tokens with embedded permissions
   - Graph-level access control
   - See implementation in original plan: `/app/lib/zep-auth.ts`

**Isolation Guarantees:**

- User graphs are completely isolated per userId
- Custom graphs require explicit graphId to access
- No graph discovery API - you must know the graphId
- Graph creation requires authentication

## Implementation Roadmap

### v1.0 (Current)
- ✅ User-level memory with automatic storage
- ✅ Basic `remember` and `recall` tools
- ✅ Semantic search across user graph
- ✅ Temporal fact tracking with validity dates

### v2.0 (Next - Project Memory)
- 🔄 Project-level custom graph creation
- 🔄 `remember-project` tool
- 🔄 Enhanced `recall` with `scope: "project"`
- 🔄 Environment variable configuration
- 🔄 Graph initialization on first use

### v3.0 (Future - Team & Org Memory)
- 🔄 Team-level custom graphs
- 🔄 Organization-level custom graphs
- 🔄 Full scope support in `recall` ("user", "project", "team", "org", "all")
- 🔄 `remember-team` and `remember-org` tools
- 🔄 Role-based write permissions

### v4.0 (Advanced Features)
- 🔄 `forget` tool for fact invalidation
- 🔄 `list-memories` tool for browsing
- 🔄 Automatic context injection (no manual recall needed)
- 🔄 Memory merge conflicts resolution
- 🔄 Memory export and portability

## Technical Considerations

### Graph Initialization

Custom graphs must be created before use:

```typescript
// On first project access
if (projectId && !await graphExists(projectGraphId)) {
  await zep.graph.create({
    graphId: projectGraphId,
    name: `Project: ${projectId}`,
    description: `Shared knowledge for project ${projectId}`
  });
}
```

### Semantic Search Across Levels

When searching "all" levels, results are combined and ranked:

1. Search each graph in parallel
2. Combine results from all levels
3. De-duplicate if same fact appears in multiple graphs
4. Rank by semantic relevance score
5. Tag each result with source graph

### Fact Precedence

When same information exists at multiple levels:

**Resolution order (most specific wins):**
1. User graph (highest precedence)
2. Project graph
3. Team graph
4. Org graph (lowest precedence)

**Example:**
- Org policy: "Use Jest for testing"
- Team convention: "Use Vitest for testing"
- User preference: "I prefer Bun test"

→ User's preference takes precedence for their work

### Memory Conflicts

When facts contradict across levels:

**Strategy:**
- Inform the user of the conflict
- Allow user to choose which to follow
- Respect hierarchy by default (user > project > team > org)
- Store conflict resolution as new fact

## Conclusion

This multi-level architecture provides a foundation for building increasingly sophisticated memory systems. While v1.0 focuses on user-level memory, the design supports seamless expansion to project, team, and organization levels in future versions.

The key principles are:
- **Isolation by default** - User memories stay private
- **Explicit sharing** - Custom graphs require intentional creation
- **Semantic search** - Find information by meaning
- **Temporal tracking** - Facts have validity over time
- **Flexible hierarchy** - Support any organizational structure

For API documentation and implementation details, see `api-reference.md`.
