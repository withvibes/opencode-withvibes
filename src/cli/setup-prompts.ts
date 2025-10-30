/**
 * Prompts directory setup - copies prompt files from plugin to user project
 */

import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import ora from 'ora';
import { info, success } from './utils.js';

export interface SetupOptions {
  overwrite: boolean;
}

/**
 * Gets the plugin's prompts directory path
 */
function getPluginPromptsDir(): string {
  // This file is at dist/cli/setup-prompts.js
  // Plugin root is ../.. from dist/cli/
  // Prompts are at <plugin-root>/prompts/
  const currentFile = fileURLToPath(import.meta.url);
  const cliDir = path.dirname(currentFile);
  const distDir = path.dirname(cliDir);
  const pluginRoot = path.dirname(distDir);
  return path.join(pluginRoot, 'prompts');
}

/**
 * Required prompt files
 */
const REQUIRED_PROMPTS = [
  'fullstack.md',
  'designer.md',
  'docs.md',
  'tester.md',
  'memory-expert.md',
];

/**
 * Creates prompts directory and copies prompt files from plugin
 */
export async function setupPrompts(options: SetupOptions): Promise<void> {
  const spinner = ora('Setting up prompts...').start();

  try {
    const userPromptsDir = path.join(process.cwd(), 'prompts');
    const pluginPromptsDir = getPluginPromptsDir();

    // Verify plugin prompts directory exists
    if (!existsSync(pluginPromptsDir)) {
      spinner.fail(chalk.red('Plugin prompts directory not found'));
      throw new Error(`Plugin prompts not found at: ${pluginPromptsDir}`);
    }

    // Create user prompts directory if it doesn't exist
    if (!existsSync(userPromptsDir)) {
      await fs.mkdir(userPromptsDir, { recursive: true });
      spinner.succeed(chalk.green('Created prompts/ directory'));
    } else {
      spinner.info(chalk.blue('Found existing prompts/ directory'));
    }

    console.log(''); // Blank line before file operations

    // Copy each required prompt file
    let copiedCount = 0;
    let skippedCount = 0;

    for (const promptFile of REQUIRED_PROMPTS) {
      const sourcePath = path.join(pluginPromptsDir, promptFile);
      const destPath = path.join(userPromptsDir, promptFile);

      // Verify source file exists
      if (!existsSync(sourcePath)) {
        console.log(chalk.yellow(`⚠️  Source file not found: ${promptFile}`));
        continue;
      }

      // Check if destination exists
      if (existsSync(destPath)) {
        if (options.overwrite) {
          await fs.copyFile(sourcePath, destPath);
          console.log(chalk.yellow(`🔄 Overwritten prompts/${promptFile}`));
          copiedCount++;
        } else {
          console.log(chalk.dim(`⏭️  prompts/${promptFile} exists, skipping`));
          skippedCount++;
        }
      } else {
        await fs.copyFile(sourcePath, destPath);
        console.log(chalk.green(`✅ Created prompts/${promptFile}`));
        copiedCount++;
      }
    }

    console.log(''); // Blank line after file operations

    const summaryDetails: string[] = [];
    if (copiedCount > 0) {
      summaryDetails.push(`${copiedCount} file(s) copied`);
    }
    if (skippedCount > 0) {
      summaryDetails.push(`${skippedCount} file(s) skipped (already exist)`);
    }

    success('Prompts setup complete', summaryDetails);
  } catch (error: any) {
    spinner.fail(chalk.red('Prompts setup failed'));
    throw error;
  }
}
