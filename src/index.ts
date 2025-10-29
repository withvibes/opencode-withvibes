import { ZepClient } from '@getzep/zep-cloud';
import type { Plugin } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import crypto from 'crypto';

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
export const WithvibesPlugin: Plugin = async ({ directory }) => {
  // Read from environment variables
  const apiKey = process.env.ZEP_API_KEY;
  const userId = process.env.ZEP_USER_ID || 'default-user';
  const debug = process.env.ZEP_DEBUG === 'true';

  // Generate deterministic thread ID based on directory and user to prevent memory fragmentation
  // This ensures the same project always uses the same thread for a given user
  const generateThreadId = (dir: string | undefined, user: string): string => {
    if (process.env.ZEP_THREAD_ID) {
      return process.env.ZEP_THREAD_ID;
    }

    if (!dir) {
      console.warn('[Withvibes] No directory provided. Using user-level thread only.');
      return `thread-${user}`;
    }

    // Create a hash of the directory path for a stable thread ID per project
    const dirHash = crypto.createHash('md5').update(dir).digest('hex').substring(0, 8);
    return `thread-${user}-${dirHash}`;
  };

  const threadId = generateThreadId(directory, userId);

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

  // Track pending storage operations to detect potential message loss
  let pendingStorageCount = 0;

  // Ensure user and thread exist
  try {
    await zep.user
      .add({
        userId: userId,
        firstName: userId,
      })
      .catch((error: any) => {
        // Only ignore "already exists" errors (409 Conflict)
        if (error.status === 409 || error.message?.includes('already exists')) {
          log('User already exists');
          return;
        }
        // Re-throw unexpected errors
        throw error;
      });

    await zep.thread
      .create({
        threadId: threadId,
        userId: userId,
      })
      .catch((error: any) => {
        // Only ignore "already exists" errors (409 Conflict)
        if (error.status === 409 || error.message?.includes('already exists')) {
          log('Thread already exists');
          return;
        }
        // Re-throw unexpected errors
        throw error;
      });
  } catch (error) {
    console.error('[Withvibes] Critical error setting up user/thread:', error);
    console.error('[Withvibes] Plugin will continue but memory features may not work correctly.');
  }

  return {
    // Hook: After each chat message
    'chat.message': async (_input, output) => {
      pendingStorageCount++;
      try {
        const { message } = output;

        log('Storing message from role:', message.role);

        // Extract text content from parts
        const textContent = output.parts
          .filter((part) => 'text' in part)
          .map((part) => part.text)
          .join('\n');

        if (!textContent) {
          log('No text content to store');
          return;
        }

        // Zep has a 2500 character limit for thread messages
        // For longer content, use graph.add API
        if (textContent.length > 2500) {
          log(`Message too long (${textContent.length} chars), using graph.add API`);

          // Warn if message will be truncated
          if (textContent.length > 5000) {
            console.warn(
              `[Withvibes] Message truncated from ${textContent.length} to 5000 characters. Some content will not be stored.`,
            );
          }

          // Use graph.add for long content
          await zep.graph.add({
            userId: userId,
            type: 'text',
            data: textContent.substring(0, 5000), // Limit to 5000 chars for graph.add
          });

          log('Long message stored via graph.add');
          return;
        }

        // Add message to Zep thread (v3 API)
        await zep.thread.addMessages(threadId, {
          messages: [
            {
              role: message.role === 'user' ? 'user' : 'assistant',
              content: textContent,
            },
          ],
        });

        log('Message stored successfully');
      } catch (error) {
        console.error('[Withvibes] Error storing message:', error);
        // Consider: Retry logic or dead letter queue for failed storage
      } finally {
        pendingStorageCount--;
        if (pendingStorageCount > 0) {
          log(`Pending storage operations: ${pendingStorageCount}`);
        }
      }
    },

    // Custom tool for explicit memory storage
    tool: {
      remember: tool({
        description: 'Store an important fact in memory',
        args: {
          fact: tool.schema.string().describe('The fact to remember'),
        },
        async execute(args) {
          // Input validation
          if (!args.fact || typeof args.fact !== 'string') {
            return 'Error: Fact is required and must be a string';
          }

          const trimmedFact = args.fact.trim();
          if (trimmedFact.length === 0) {
            return 'Error: Fact cannot be empty';
          }

          if (trimmedFact.length > 2500) {
            return `Error: Fact is too long (${trimmedFact.length} characters, max 2500)`;
          }

          try {
            await zep.thread.addMessages(threadId, {
              messages: [
                {
                  role: 'user',
                  content: `[MEMORY] ${trimmedFact}`,
                },
              ],
            });

            return `Remembered: ${trimmedFact}`;
          } catch (error: any) {
            const errorType = error.status ? `API Error ${error.status}` : 'Unknown Error';
            return `Failed to store memory: ${errorType} - ${error.message}. Check ZEP_API_KEY and network connection.`;
          }
        },
      }),

      recall: tool({
        description: 'Search memories for relevant facts',
        args: {
          query: tool.schema.string().describe('What to search for'),
        },
        async execute(args) {
          // Input validation
          if (!args.query || typeof args.query !== 'string') {
            return 'Error: Query is required and must be a string';
          }

          const trimmedQuery = args.query.trim();
          if (trimmedQuery.length === 0) {
            return 'Error: Query cannot be empty';
          }

          if (trimmedQuery.length > 500) {
            return `Error: Query is too long (${trimmedQuery.length} characters, max 500)`;
          }

          try {
            // v3 API uses graph.search instead of memory.search
            const results = await zep.graph.search({
              userId: userId,
              query: trimmedQuery,
              limit: 5,
              scope: 'edges',
            });

            const edges = results?.edges ?? [];
            if (edges.length > 0) {
              const facts = edges.map((edge) => `- ${edge?.fact ?? 'Unknown'}`).join('\n');
              return `Found ${edges.length} relevant memories:\n${facts}`;
            } else {
              return 'No relevant memories for this query.';
            }
          } catch (error: any) {
            const errorType = error.status ? `API Error ${error.status}` : 'Unknown Error';
            return `Failed to search memory: ${errorType} - ${error.message}. Check ZEP_API_KEY and network connection.`;
          }
        },
      }),
    },
  };
};

export default WithvibesPlugin;
