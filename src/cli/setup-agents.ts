/**
 * Agent configuration setup
 */

import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import chalk from 'chalk';
import ora from 'ora';
import {
  atomicWrite,
  createBackup,
  ensureSchema,
  formatJson,
  info,
  readJsonFile,
  success,
  warning,
} from './utils.js';

export interface SetupOptions {
  overwrite: boolean;
}

interface AgentConfig {
  description: string;
  mode: 'primary' | 'subagent';
  model: string;
  prompt: string;
  tools: Record<string, boolean>;
  permission?: Record<string, string>;
}

interface OpenCodeConfig {
  $schema: string;
  plugin?: string[];
  agent?: Record<string, AgentConfig>;
  permission?: Record<string, string>;
}

/**
 * The 5 pre-configured agent templates
 */
function getAgentTemplates(): Record<string, AgentConfig> {
  return {
    fullstack: {
      description: 'Full TanStack development with testing and memory',
      mode: 'primary',
      model: 'anthropic/claude-sonnet-4-20250514',
      prompt: '{file:./prompts/fullstack.md}',
      tools: {
        skills_zep_memory: true,
        skills_artifacts_builder: true,
        skills_webapp_testing: true,
        skills_mcp_builder: true,
        skills_theme_factory: true,
        skills_skill_creator: true,
        remember: true,
        recall: true,
        write: true,
        edit: true,
        bash: true,
        read: true,
        grep: true,
        glob: true,
        webfetch: true,
      },
    },

    designer: {
      description: 'UI/UX specialist with visual design and theming',
      mode: 'primary',
      model: 'anthropic/claude-sonnet-4-20250514',
      prompt: '{file:./prompts/designer.md}',
      tools: {
        skills_zep_memory: true,
        skills_canvas_design: true,
        skills_artifacts_builder: true,
        skills_theme_factory: true,
        skills_slack_gif_creator: true,
        remember: true,
        recall: true,
        write: true,
        edit: true,
        bash: true,
        read: true,
        webfetch: true,
      },
    },

    docs: {
      description: 'Documentation and spreadsheet specialist',
      mode: 'primary',
      model: 'anthropic/claude-sonnet-4-20250514',
      prompt: '{file:./prompts/docs.md}',
      tools: {
        skills_zep_memory: true,
        skills_document_skills_xlsx: true,
        skills_document_skills_docx: true,
        skills_document_skills_pptx: true,
        skills_document_skills_pdf: true,
        remember: true,
        recall: true,
        write: true,
        edit: true,
        bash: true,
        read: true,
        webfetch: true,
      },
    },

    tester: {
      description: 'Testing, linting, type checking, and code quality',
      mode: 'subagent',
      model: 'anthropic/claude-sonnet-4-20250514',
      prompt: '{file:./prompts/tester.md}',
      tools: {
        skills_zep_memory: true,
        skills_webapp_testing: true,
        remember: true,
        recall: true,
        write: true,
        edit: true,
        bash: true,
        read: true,
        grep: true,
        glob: true,
      },
    },

    'memory-expert': {
      description: 'Advanced memory operations and context retrieval',
      mode: 'subagent',
      model: 'anthropic/claude-sonnet-4-20250514',
      prompt: '{file:./prompts/memory-expert.md}',
      tools: {
        skills_zep_memory: true,
        remember: true,
        recall: true,
        read: true,
      },
    },
  };
}

/**
 * Merges agent configurations with existing config
 * @param existing - Existing config object
 * @param template - Template config object
 * @param options - Setup options (overwrite flag)
 * @returns Merged config
 */
function mergeConfig(
  existing: OpenCodeConfig,
  template: Record<string, AgentConfig>,
  options: SetupOptions,
): OpenCodeConfig {
  // 1. Ensure plugin array exists and includes our plugin
  if (!existing.plugin) {
    existing.plugin = [];
  }
  if (!existing.plugin.includes('opencode-withvibes')) {
    existing.plugin.push('opencode-withvibes');
  }

  // 2. Ensure agent object exists
  if (!existing.agent) {
    existing.agent = {};
  }

  // 3. Handle agents based on overwrite flag
  for (const [agentName, agentConfig] of Object.entries(template)) {
    if (existing.agent[agentName]) {
      if (options.overwrite) {
        // Replace existing agent
        console.log(chalk.yellow(`🔄 Overwriting agent "${agentName}"`));
        existing.agent[agentName] = agentConfig;
      } else {
        // Skip existing agent
        console.log(chalk.dim(`⏭️  Agent "${agentName}" exists, skipping`));
      }
    } else {
      // Add new agent
      console.log(chalk.green(`✅ Adding agent "${agentName}"`));
      existing.agent[agentName] = agentConfig;
    }
  }

  // 4. Add permission config if missing (never overwrite)
  if (!existing.permission) {
    existing.permission = {
      bash: 'allow',
      edit: 'allow',
      webfetch: 'allow',
    };
  }

  // 5. Ensure schema
  return ensureSchema(existing);
}

/**
 * Creates or updates opencode.json with agent configurations
 */
export async function setupAgents(options: SetupOptions): Promise<void> {
  const spinner = ora('Configuring agents...').start();

  try {
    const configPath = path.join(process.cwd(), 'opencode.json');
    const agentTemplates = getAgentTemplates();

    let config: OpenCodeConfig;
    let backupPath: string | null = null;

    // Check if opencode.json exists
    if (existsSync(configPath)) {
      spinner.text = 'Found existing opencode.json';

      // Create backup
      backupPath = await createBackup(configPath);
      const backupFilename = path.basename(backupPath);

      if (options.overwrite) {
        spinner.info(chalk.yellow(`⚠️  Overwrite mode enabled\n   Backup: ${backupFilename}`));
      } else {
        spinner.info(chalk.green(`✅ Found existing opencode.json\n   Backup: ${backupFilename}`));
      }

      // Read existing config
      const existingConfig = await readJsonFile(configPath);
      if (!existingConfig) {
        throw new Error('Failed to read existing opencode.json');
      }

      // Merge configurations
      console.log(''); // Blank line before merge output
      config = mergeConfig(existingConfig, agentTemplates, options);
    } else {
      spinner.succeed(chalk.green('Creating opencode.json'));

      // Create new config from scratch
      config = {
        $schema: 'https://opencode.ai/config.json',
        plugin: ['opencode-withvibes'],
        agent: agentTemplates,
        permission: {
          bash: 'allow',
          edit: 'allow',
          webfetch: 'allow',
        },
      };

      console.log(''); // Blank line before agent output
      for (const agentName of Object.keys(agentTemplates)) {
        console.log(chalk.green(`✅ Adding agent "${agentName}"`));
      }
    }

    // Write config atomically
    await atomicWrite(configPath, formatJson(config));

    console.log(''); // Blank line after agent output
    const agentCount = Object.keys(config.agent || {}).length;
    const primaryCount = Object.values(config.agent || {}).filter(
      (a) => a.mode === 'primary',
    ).length;
    const subagentCount = agentCount - primaryCount;

    success('Agent configuration complete', [
      `Total agents: ${agentCount} (${primaryCount} primary, ${subagentCount} subagents)`,
    ]);
  } catch (error: any) {
    spinner.fail(chalk.red('Agent configuration failed'));
    throw error;
  }
}
