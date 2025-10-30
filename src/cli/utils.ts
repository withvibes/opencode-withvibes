/**
 * Shared utilities for CLI operations
 */

import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';

/**
 * Creates a timestamped backup of a file
 * @param filePath - Path to file to backup
 * @returns Path to backup file
 */
export async function createBackup(filePath: string): Promise<string> {
  if (!existsSync(filePath)) {
    throw new Error(`Cannot backup non-existent file: ${filePath}`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); // Format: 2025-10-29-14-30-45

  const backupPath = `${filePath}.backup.${timestamp}`;

  await fs.copyFile(filePath, backupPath);

  return backupPath;
}

/**
 * Performs an atomic write by writing to a temp file first, then renaming
 * @param filePath - Destination file path
 * @param content - Content to write
 */
export async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp`;

  try {
    // Write to temp file
    await fs.writeFile(tempPath, content, 'utf8');

    // Validate JSON if it's a JSON file
    if (filePath.endsWith('.json')) {
      try {
        JSON.parse(content);
      } catch (error: any) {
        await fs.unlink(tempPath);
        throw new Error(`Invalid JSON generated: ${error.message}`);
      }
    }

    // Atomic rename
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Cleanup temp file if it exists
    if (existsSync(tempPath)) {
      await fs.unlink(tempPath);
    }
    throw error;
  }
}

/**
 * Validates and ensures a JSON config has the correct schema
 * @param config - Config object to validate
 * @returns Config with schema field ensured
 */
export function ensureSchema(config: any): any {
  if (!config.$schema) {
    config.$schema = 'https://opencode.ai/config.json';
  }
  return config;
}

/**
 * Safely reads and parses a JSON file
 * @param filePath - Path to JSON file
 * @returns Parsed JSON object or null if file doesn't exist
 */
export async function readJsonFile(filePath: string): Promise<any | null> {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error: any) {
    throw new Error(`Failed to read JSON file ${filePath}: ${error.message}`);
  }
}

/**
 * Formats JSON with 2-space indentation
 * @param obj - Object to stringify
 * @returns Formatted JSON string
 */
export function formatJson(obj: any): string {
  return JSON.stringify(obj, null, 2) + '\n';
}

/**
 * Displays a success message with optional details
 */
export function success(message: string, details?: string[]): void {
  console.log(chalk.green(`✅ ${message}`));
  if (details && details.length > 0) {
    for (const detail of details) {
      console.log(chalk.dim(`   ${detail}`));
    }
  }
}

/**
 * Displays an info message with optional details
 */
export function info(message: string, details?: string[]): void {
  console.log(chalk.blue(`ℹ️  ${message}`));
  if (details && details.length > 0) {
    for (const detail of details) {
      console.log(chalk.dim(`   ${detail}`));
    }
  }
}

/**
 * Displays a warning message with optional details
 */
export function warning(message: string, details?: string[]): void {
  console.log(chalk.yellow(`⚠️  ${message}`));
  if (details && details.length > 0) {
    for (const detail of details) {
      console.log(chalk.dim(`   ${detail}`));
    }
  }
}

/**
 * Displays an error message with optional details
 */
export function error(message: string, details?: string[]): void {
  console.error(chalk.red(`❌ ${message}`));
  if (details && details.length > 0) {
    for (const detail of details) {
      console.error(chalk.dim(`   ${detail}`));
    }
  }
}
