# Zep Cloud API Reference

**SDK Version:** 3.8.0
**Package:** `@getzep/zep-cloud`
**Language:** TypeScript/JavaScript

## Installation

```bash
bun add @getzep/zep-cloud
```

## Client Initialization

```typescript
import { ZepClient } from "@getzep/zep-cloud";

const zep = new ZepClient({
  apiKey: process.env.ZEP_API_KEY  // Your Zep Cloud API key
});
```

## Core Concepts

- **User:** An individual with their own knowledge graph
- **Thread:** A conversation session associated with a user
- **Message:** A single chat message (user or assistant)
- **Graph:** A knowledge graph (user graph or custom graph)
- **Edge:** A fact or relationship in the graph
- **Entity:** A person, place, or concept mentioned in conversations

---

## User Operations

### Create User

```typescript
await zep.user.add({
  userId: "user123",
  email: "user@example.com",
  firstName: "Jane",
  lastName: "Smith",
});
```

**Parameters:**
- `userId` (string, required): Unique identifier for the user
- `email` (string, optional): User's email address
- `firstName` (string, recommended): User's first name
- `lastName` (string, optional): User's last name

**Important:** Provide at least first name for proper entity recognition in the knowledge graph.

**Returns:** User object with creation timestamp

### Get User

```typescript
const user = await zep.user.get("user123");
```

**Parameters:**
- `userId` (string, required): User ID to retrieve

**Returns:** User object with metadata

### Update User

```typescript
await zep.user.update("user123", {
  email: "newemail@example.com",
  firstName: "Jane",
  lastName: "Doe"
});
```

**Parameters:**
- `userId` (string, required): User ID to update
- `data` (object, required): Fields to update

**Returns:** Updated user object

### Delete User

```typescript
await zep.user.delete("user123");
```

**Parameters:**
- `userId` (string, required): User ID to delete

**Note:** This permanently deletes the user and their entire knowledge graph.

---

## Thread Operations

### Create Thread

```typescript
await zep.thread.create({
  threadId: "thread-abc123",
  userId: "user123",
});
```

**Parameters:**
- `threadId` (string, required): Unique identifier for the thread
- `userId` (string, required): User ID who owns this thread

**Returns:** Thread object

**Note:** Threads are conversation sessions. Each OpenCode session should have its own thread.

### Add Messages to Thread

```typescript
await zep.thread.addMessages("thread-abc123", {
  messages: [
    {
      role: "user",
      content: "I prefer TypeScript over JavaScript",
    },
    {
      role: "assistant",
      content: "Noted! I'll use TypeScript for code examples.",
    }
  ]
});
```

**Parameters:**
- `threadId` (string, required): Thread ID to add messages to
- `options.messages` (array, required): Array of message objects
  - `role` (string): "user" or "assistant"
  - `content` (string): Message text

**Returns:** Success confirmation

**Note:** Messages are automatically analyzed for fact extraction and graph building.

### Get Thread Messages

```typescript
const messages = await zep.thread.getMessages("thread-abc123", {
  limit: 10,
  offset: 0
});
```

**Parameters:**
- `threadId` (string, required): Thread ID
- `options.limit` (number, optional): Max messages to return (default: 10)
- `options.offset` (number, optional): Skip first N messages (default: 0)

**Returns:** Array of message objects with metadata

### Get User Context (Memory)

```typescript
const memory = await zep.thread.getUserContext("thread-abc123");
```

**Parameters:**
- `threadId` (string, required): Thread ID

**Returns:** Object containing:
- `context` (string): Formatted memory context with facts and entities
- `facts` (array): Extracted facts from conversations
- `entities` (array): Identified entities (people, places, concepts)

**Usage:** This is the primary method for retrieving memory to inject into LLM prompts.

**Example Response:**
```typescript
{
  context: `FACTS and ENTITIES represent relevant context to the current conversation.

# These are the facts about User user123:
- User user123 prefers TypeScript over JavaScript (2025-10-29 - present)
- User user123 uses Tailwind CSS for styling (2025-10-29 - present)

# These are the entities:
- TypeScript (programming language)
- JavaScript (programming language)
- Tailwind CSS (CSS framework)`,
  facts: [...],
  entities: [...]
}
```

### Delete Thread

```typescript
await zep.thread.delete("thread-abc123");
```

**Parameters:**
- `threadId` (string, required): Thread ID to delete

**Note:** Deletes the thread but not the facts extracted from it (those remain in the user graph).

---

## Graph Operations

### User Graphs (Automatic)

User graphs are created automatically when a user is added. You access them via `userId`.

**Search User Graph:**
```typescript
const results = await zep.graph.search({
  userId: "user123",
  query: "programming preferences",
  limit: 5,
  scope: "edges"  // Search facts/relationships
});
```

### Custom Graphs (Manual Creation)

Create graphs for projects, teams, or organizations.

#### Create Custom Graph

```typescript
await zep.graph.create({
  graphId: "project-withvibes-dev",
  name: "Withvibes Development",
  description: "Shared knowledge for the Withvibes.dev project"
});
```

**Parameters:**
- `graphId` (string, required): Unique identifier for the graph
- `name` (string, required): Human-readable name
- `description` (string, optional): Graph description

**Returns:** Graph object

#### Add Data to Custom Graph

```typescript
// Add text data
await zep.graph.add({
  graphId: "project-withvibes-dev",
  type: "text",
  data: "This project uses TanStack, Convex, and WorkOS for authentication"
});

// Add JSON data
await zep.graph.add({
  graphId: "project-withvibes-dev",
  type: "json",
  data: JSON.stringify({
    stack: {
      frontend: "TanStack (React)",
      backend: "Convex",
      auth: "WorkOS"
    }
  })
});
```

**Parameters:**
- `graphId` (string, required): Graph ID to add data to
- `type` (string, required): "text", "json", or "message"
- `data` (string, required): The data to add

**Returns:** Success confirmation

**Note:** Data is automatically analyzed for fact extraction.

#### Search Custom Graph

```typescript
const results = await zep.graph.search({
  graphId: "project-withvibes-dev",
  query: "authentication",
  limit: 5,
  scope: "edges"
});
```

**Parameters:**
- `graphId` (string, required): Graph ID to search
- `query` (string, required): Semantic search query
- `limit` (number, optional): Max results (default: 10)
- `scope` (string, required): "edges" for facts, "nodes" for entities

**Returns:** Search results object containing:
- `edges` (array): Matching facts/relationships
- `nodes` (array): Matching entities (if scope includes nodes)

**Edge Object:**
```typescript
{
  fact: "Project uses Convex for backend",
  valid_at: "2025-10-29T00:00:00Z",
  invalid_at: null,  // Still valid
  source: "user123",
  confidence: 0.95
}
```

#### Get Graph

```typescript
const graph = await zep.graph.get("project-withvibes-dev");
```

**Parameters:**
- `graphId` (string, required): Graph ID to retrieve

**Returns:** Graph object with metadata

#### Delete Graph

```typescript
await zep.graph.delete("project-withvibes-dev");
```

**Parameters:**
- `graphId` (string, required): Graph ID to delete

**Warning:** This permanently deletes the entire graph and all its facts.

#### List All Graphs

```typescript
const graphs = await zep.graph.listAll();
```

**Returns:** Array of graph objects

---

## Search API

The search API is the core of Zep's memory system.

### Semantic Search

```typescript
const results = await zep.graph.search({
  userId: "user123",      // OR graphId: "custom-graph-id"
  query: "user preferences",
  limit: 10,
  scope: "edges",
  searchType: "similarity"  // Default: similarity (semantic)
});
```

**Parameters:**
- `userId` or `graphId` (string, required): Which graph to search
- `query` (string, required): Semantic search query
- `limit` (number, optional): Max results (default: 10, max: 100)
- `scope` (string, required): "edges", "nodes", or "both"
- `searchType` (string, optional): "similarity" (semantic) or "mmr" (diverse results)

**Returns:** Search results object

### Understanding Search Results

**Edges (Facts):**
```typescript
{
  fact: "User prefers TypeScript",
  valid_at: "2025-10-29T12:00:00Z",
  invalid_at: null,
  source: "thread-abc123",
  entities: ["TypeScript", "User"],
  confidence: 0.98
}
```

**Nodes (Entities):**
```typescript
{
  name: "TypeScript",
  type: "programming_language",
  summary: "A typed superset of JavaScript",
  related_facts: [...]
}
```

### Search Strategies

**1. Broad Search (find anything relevant):**
```typescript
await zep.graph.search({
  userId: "user123",
  query: "programming",
  limit: 20,
  scope: "both",
  searchType: "mmr"  // Maximal Marginal Relevance for diversity
});
```

**2. Specific Search (find exact preference):**
```typescript
await zep.graph.search({
  userId: "user123",
  query: "preferred CSS framework",
  limit: 3,
  scope: "edges",
  searchType: "similarity"
});
```

**3. Entity Search (find person or concept):**
```typescript
await zep.graph.search({
  userId: "user123",
  query: "React",
  limit: 5,
  scope: "nodes"
});
```

---

## Advanced Features

### Fact Triples

Zep automatically extracts fact triples: (subject, predicate, object)

**Example:**
- Message: "I prefer TypeScript over JavaScript"
- Extracted triple: (User, prefers, TypeScript)
- Stored as edge in graph

### Temporal Tracking

Facts have validity periods:

```typescript
{
  fact: "User works with Python 3.9",
  valid_at: "2025-10-29",
  invalid_at: "2025-11-28"  // Invalidated when user said they upgraded to 3.12
}
```

When new information contradicts old facts, Zep automatically invalidates the old fact and creates a new one.

### Entity Extraction

Entities are automatically identified:

- **People:** "Jane Smith", "the engineer"
- **Places:** "San Francisco", "the office"
- **Concepts:** "TypeScript", "React hooks"
- **Projects:** "Project Alpha", "the API rewrite"

Entities are linked via relationships in the knowledge graph.

---

## Error Handling

```typescript
try {
  await zep.thread.addMessages(threadId, { messages });
} catch (error) {
  if (error.statusCode === 404) {
    console.error("Thread not found");
  } else if (error.statusCode === 401) {
    console.error("Invalid API key");
  } else {
    console.error("Zep error:", error.message);
  }
}
```

**Common Error Codes:**
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (invalid API key)
- `404` - Resource not found (user, thread, or graph doesn't exist)
- `429` - Rate limit exceeded
- `500` - Server error

---

## Best Practices

### 1. User Creation
```typescript
// ✅ Good - Provide names for proper entity recognition
await zep.user.add({
  userId: "user123",
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@example.com"
});

// ❌ Bad - No name makes entity recognition harder
await zep.user.add({
  userId: "user123"
});
```

### 2. Thread Management
```typescript
// ✅ Good - One thread per conversation session
const threadId = `session-${Date.now()}`;
await zep.thread.create({ threadId, userId });

// ❌ Bad - Reusing same thread for all sessions
// This mixes different conversation contexts
```

### 3. Message Storage
```typescript
// ✅ Good - Include both user and assistant messages
await zep.thread.addMessages(threadId, {
  messages: [
    { role: "user", content: userMessage },
    { role: "assistant", content: assistantResponse }
  ]
});

// ⚠️ Okay - Just user messages (less context for AI)
await zep.thread.addMessages(threadId, {
  messages: [{ role: "user", content: userMessage }]
});
```

### 4. Memory Retrieval
```typescript
// ✅ Good - Get context before generating response
const memory = await zep.thread.getUserContext(threadId);
const prompt = `${systemPrompt}\n\nUser Context:\n${memory.context}\n\nUser: ${userMessage}`;

// ❌ Bad - Forgetting to use memory context
const prompt = `${systemPrompt}\n\nUser: ${userMessage}`;
```

### 5. Search Queries
```typescript
// ✅ Good - Descriptive, semantic queries
await zep.graph.search({
  userId: "user123",
  query: "preferred programming languages and frameworks"
});

// ❌ Bad - Single keyword queries
await zep.graph.search({
  userId: "user123",
  query: "lang"
});
```

---

## Rate Limits

Zep Cloud enforces rate limits based on your plan:

- **Free Plan:** 100 requests/minute
- **Pro Plan:** 1000 requests/minute
- **Enterprise:** Custom limits

**Handling rate limits:**
```typescript
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function addMessageWithRetry(threadId, messages, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await zep.thread.addMessages(threadId, { messages });
    } catch (error) {
      if (error.statusCode === 429 && i < retries - 1) {
        await delay(1000 * (i + 1));  // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}
```

---

## Additional Resources

- **Official Documentation:** https://help.getzep.com
- **SDK Repository:** https://github.com/getzep/zep-js
- **API Playground:** https://app.getzep.com/playground
- **Community Discord:** https://discord.com/invite/W8Kw6bsgXQ

---

## TypeScript Types

```typescript
// User
interface User {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  updatedAt: string;
}

// Thread
interface Thread {
  threadId: string;
  userId: string;
  createdAt: string;
}

// Message
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

// Graph
interface Graph {
  graphId: string;
  name: string;
  description?: string;
  createdAt: string;
}

// Search Result
interface SearchResult {
  edges?: Edge[];
  nodes?: Entity[];
}

interface Edge {
  fact: string;
  valid_at: string;
  invalid_at?: string | null;
  source: string;
  entities: string[];
  confidence: number;
}

interface Entity {
  name: string;
  type: string;
  summary: string;
  related_facts: Edge[];
}

// User Context
interface UserContext {
  context: string;
  facts: Edge[];
  entities: Entity[];
}
```

---

**Last Updated:** 2025-10-29
**SDK Version:** @getzep/zep-cloud@3.8.0
