import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import { ZepClient } from "@getzep/zep-cloud";

/**
 * Withvibes OpenCode Plugin
 *
 * Provides persistent memory and context management for OpenCode sessions
 * using Zep Cloud knowledge graphs.
 *
 * Features:
 * - Automatic conversation storage
 * - Semantic memory search
 * - User-level memory isolation
 * - Custom remember/recall tools
 */
export const WithvibesPlugin: Plugin = async ({ client, project, directory }) => {
  // Read from environment variables
  const apiKey = process.env.ZEP_API_KEY;
  const threadId = process.env.ZEP_THREAD_ID || `thread-${Date.now()}`;
  const userId = process.env.ZEP_USER_ID || 'default-user';
  const debug = process.env.ZEP_DEBUG === 'true';

  const log = (...args: any[]) => {
    if (debug) console.log('[Withvibes]', ...args);
  };

  log('Plugin loading...');

  if (!apiKey) {
    console.warn('[Withvibes] No ZEP_API_KEY found. Memory disabled.');
    return {};
  }

  // Initialize Zep client (v3 API)
  const zep = new ZepClient({ apiKey });
  log('Initialized for user:', userId, 'thread:', threadId);

  // Ensure user and thread exist
  try {
    await zep.user.add({
      userId: userId,
      firstName: userId,
    }).catch(() => {
      log('User already exists or created');
    });

    await zep.thread.create({
      threadId: threadId,
      userId: userId,
    }).catch(() => {
      log('Thread already exists or created');
    });
  } catch (error) {
    console.error('[Withvibes] Error setting up user/thread:', error);
  }

  return {
    // Hook: After each chat message
    "chat.message": async (input, output) => {
      try {
        const { message } = output;

        log('Storing message from role:', message.role);

        // Extract text content from parts
        const textContent = output.parts
          .filter(part => 'text' in part)
          .map(part => part.text)
          .join('\n');

        if (!textContent) {
          log('No text content to store');
          return;
        }

        // Zep has a 2500 character limit for thread messages
        // For longer content, use graph.add API
        if (textContent.length > 2500) {
          log(`Message too long (${textContent.length} chars), using graph.add API`);

          // Use graph.add for long content
          await zep.graph.add({
            userId: userId,
            type: "text",
            data: textContent.substring(0, 5000) // Limit to 5000 chars for graph.add
          });

          log('Long message stored via graph.add');
          return;
        }

        // Add message to Zep thread (v3 API)
        await zep.thread.addMessages(threadId, {
          messages: [{
            role: message.role === 'user' ? 'user' : 'assistant',
            content: textContent,
          }],
        });

        log('Message stored successfully');
      } catch (error) {
        console.error('[Withvibes] Error storing message:', error);
      }
    },

    // Custom tool for explicit memory storage
    tool: {
      remember: tool({
        description: "Store an important fact in memory",
        args: {
          fact: tool.schema.string().describe("The fact to remember"),
        },
        async execute(args) {
          try {
            await zep.thread.addMessages(threadId, {
              messages: [{
                role: 'user',
                content: `[MEMORY] ${args.fact}`,
              }],
            });

            return `Remembered: ${args.fact}`;
          } catch (error: any) {
            return `Failed to store: ${error.message}`;
          }
        },
      }),

      recall: tool({
        description: "Search memories for relevant facts",
        args: {
          query: tool.schema.string().describe("What to search for"),
        },
        async execute(args) {
          try {
            // v3 API uses graph.search instead of memory.search
            const results = await zep.graph.search({
              userId: userId,
              query: args.query,
              limit: 5,
              scope: "edges",
            });

            if (results && results.edges && results.edges.length > 0) {
              const facts = results.edges.map(edge => `- ${edge.fact}`).join('\n');
              return `Found ${results.edges.length} relevant memories:\n${facts}`;
            } else {
              return "No relevant memories for this query.";
            }
          } catch (error: any) {
            return `Failed to search: ${error.message}`;
          }
        },
      }),
    },
  };
};

export default WithvibesPlugin;
