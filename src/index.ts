import { ZepClient } from '@getzep/zep-cloud';
import type { Plugin } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import crypto from 'crypto';
import matter from 'gray-matter';
import PQueue from 'p-queue';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

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
 * - Bundled zep-memory skill (follows Anthropic Skills Specification)
 */

// Skill frontmatter validation schema (Anthropic Skills Specification v1.0)
const SkillFrontmatterSchema = z.object({
  name: z.string(),
  description: z.string().min(20),
  license: z.string().optional(),
  'allowed-tools': z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

/**
 * Load and parse a bundled skill
 */
async function loadBundledSkill(
  skillPath: string,
): Promise<{ frontmatter: SkillFrontmatter; content: string } | null> {
  try {
    const file = Bun.file(skillPath);
    const text = await file.text();
    const { data, content } = matter(text);

    const frontmatter = SkillFrontmatterSchema.parse(data);
    return { frontmatter, content: content.trim() };
  } catch (error) {
    console.error(`[Withvibes] Failed to load skill from ${skillPath}:`, error);
    return null;
  }
}

export const WithvibesPlugin: Plugin = async ({ directory, client }) => {
  // Read from environment variables
  const apiKey = process.env.ZEP_API_KEY;
  const userId = process.env.ZEP_USER_ID || 'default-user';
  const debug = process.env.ZEP_DEBUG === 'true';
  // Async storage (fire-and-forget) is faster but may lose data on crash
  // Set to 'false' for guaranteed storage (blocks until complete)
  const asyncStorage = process.env.ZEP_ASYNC_STORAGE !== 'false';

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
  log(
    `Storage mode: ${asyncStorage ? 'async (non-blocking)' : 'blocking (guaranteed persistence)'}`,
  );

  if (!apiKey) {
    console.warn('[Withvibes] No ZEP_API_KEY found. Memory disabled.');
    return {};
  }

  // Initialize Zep client (v3 API)
  const zep = new ZepClient({ apiKey });
  log('Initialized for user:', userId, 'thread:', threadId);

  // Create queue for serializing message storage to prevent race conditions
  const storageQueue = new PQueue({ concurrency: 1 });

  // Helper function to chunk large messages
  const chunkMessage = (text: string, maxSize: number): string[] => {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += maxSize) {
      chunks.push(text.substring(i, i + maxSize));
    }
    return chunks;
  };

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

  // Add process exit handler to flush pending storage operations
  // This prevents data loss on graceful exit in async mode
  process.on('beforeExit', async () => {
    const pending = storageQueue.size + storageQueue.pending;
    if (pending > 0) {
      console.log(`[Withvibes] Flushing ${pending} pending messages before exit...`);
      await storageQueue.onIdle();
      console.log('[Withvibes] All messages flushed successfully');
    }
  });

  // Discover and load all bundled skills
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const skillsBaseDir = join(__dirname, '../skills');

  log('Discovering bundled skills from:', skillsBaseDir);

  // Discover all SKILL.md files in the skills directory
  const { Glob } = await import('bun');
  const glob = new Glob('**/SKILL.md');
  const skillPaths: string[] = [];

  for await (const match of glob.scan({
    cwd: skillsBaseDir,
    absolute: true,
  })) {
    skillPaths.push(match);
  }

  log(`Found ${skillPaths.length} skill(s)`);

  // Load all discovered skills
  const skills: Array<{
    frontmatter: SkillFrontmatter;
    content: string;
    path: string;
    basePath: string;
  }> = [];

  for (const skillPath of skillPaths) {
    const skill = await loadBundledSkill(skillPath);
    if (skill) {
      const basePath = dirname(skillPath);
      skills.push({ ...skill, path: skillPath, basePath });
      log(`Loaded skill: ${skill.frontmatter.name} from ${basePath}`);
    } else {
      console.warn(`[Withvibes] Failed to load skill from ${skillPath}`);
    }
  }

  // Build tools object
  const tools: Record<string, any> = {
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
  };

  // Register all bundled skills as tools (follows opencode-skills pattern)
  for (const skill of skills) {
    // Convert skill name to tool name (e.g., "zep-memory" -> "skills_zep_memory")
    const toolName = `skills_${skill.frontmatter.name.replace(/-/g, '_')}`;

    tools[toolName] = tool({
      description: skill.frontmatter.description,
      args: {},
      async execute(_args, toolCtx) {
        try {
          // Helper to send silent messages (noReply pattern - appears as user message, persists in context)
          const sendSilentPrompt = (text: string) =>
            client.session.prompt({
              path: { id: toolCtx.sessionID },
              body: {
                noReply: true,
                parts: [{ type: 'text', text }],
              },
            });

          // Message 1: Skill loading header
          await sendSilentPrompt(
            `The "${skill.frontmatter.name}" skill is loading\n${skill.frontmatter.name}`,
          );

          // Message 2: Skill content with base directory context
          await sendSilentPrompt(
            `Base directory for this skill: ${skill.basePath}\n\n${skill.content}`,
          );

          // Return confirmation
          return `Launching skill: ${skill.frontmatter.name}`;
        } catch (error: any) {
          console.error('[Withvibes] Failed to deliver skill content:', error);
          return `Error loading skill: ${error.message || 'Unknown error'}`;
        }
      },
    });

    log(`Registered tool: ${toolName}`);
  }

  return {
    // Hook: After each chat message
    'chat.message': async (_input, output) => {
      // Queue message storage to prevent race conditions
      const storagePromise = storageQueue.add(async () => {
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
          if (textContent.length <= 2500) {
            // Store directly via thread.addMessages
            await zep.thread.addMessages(threadId, {
              messages: [
                {
                  role: message.role === 'user' ? 'user' : 'assistant',
                  content: textContent,
                },
              ],
            });
            log('Message stored successfully via thread.addMessages');
            return;
          }

          // For longer content, chunk and store via graph.add API
          log(`Message length: ${textContent.length} chars, chunking for storage`);
          const chunks = chunkMessage(textContent, 4500); // Use 4500 to be safe under 5000 limit

          for (let i = 0; i < chunks.length; i++) {
            await zep.graph.add({
              userId: userId,
              type: 'text',
              data: chunks[i],
            });
            log(`Stored chunk ${i + 1}/${chunks.length}`);
          }

          log(`Long message stored successfully (${chunks.length} chunks)`);
        } catch (error) {
          console.error('[Withvibes] Error storing message:', error);
          // Queue will handle retries based on configuration
        }
      });

      // Conditionally await storage based on configuration
      const queueSize = storageQueue.size;
      const queuePending = storageQueue.pending;

      if (!asyncStorage) {
        // Blocking mode: wait for storage to complete (guaranteed persistence)
        await storagePromise;
        log(
          `Storage completed (blocking mode) - Queue: ${queuePending} pending, ${queueSize} waiting`,
        );
      } else {
        // Async mode: fire and forget (faster, but may lose data on crash)
        // Prevent unhandled promise rejection
        storagePromise.catch((_error) => {
          // Error already logged inside queue callback
          log('Storage error caught in async mode');
        });
        log(`Storage queued (async mode) - Queue: ${queuePending} pending, ${queueSize} waiting`);

        // Warn if queue backlog is growing
        if (queueSize > 10) {
          console.warn(`[Withvibes] Storage queue backlog: ${queueSize} messages waiting`);
        }
      }
    },

    // Tools
    tool: tools,
  };
};

export default WithvibesPlugin;
