/**
 * Environment validation and Zep Cloud connection verification
 */

import process from 'node:process';
import { ZepClient } from '@getzep/zep-cloud';
import chalk from 'chalk';
import ora from 'ora';

export interface EnvVars {
  ZEP_API_KEY: string;
  ZEP_USER_ID: string;
  ZEP_THREAD_ID?: string;
  ZEP_DEBUG?: string;
}

/**
 * Validates required environment variables
 * @throws {Error} If required env vars are missing or invalid
 */
export function validateEnvironment(): EnvVars {
  const ZEP_API_KEY = process.env.ZEP_API_KEY;
  const ZEP_USER_ID = process.env.ZEP_USER_ID;
  const ZEP_THREAD_ID = process.env.ZEP_THREAD_ID;
  const ZEP_DEBUG = process.env.ZEP_DEBUG;

  // Check for required env vars
  if (!ZEP_API_KEY) {
    console.error(chalk.red('❌ Missing required environment variable: ZEP_API_KEY'));
    console.error('\nSet it before running setup:');
    console.error(chalk.dim('  export ZEP_API_KEY=your-api-key'));
    throw new Error('Missing ZEP_API_KEY environment variable');
  }

  if (!ZEP_USER_ID) {
    console.error(chalk.red('❌ Missing required environment variable: ZEP_USER_ID'));
    console.error('\nSet it before running setup:');
    console.error(chalk.dim('  export ZEP_USER_ID=your-user-id'));
    throw new Error('Missing ZEP_USER_ID environment variable');
  }

  // Validate API key format
  if (!ZEP_API_KEY.startsWith('zep_')) {
    console.error(chalk.red('❌ Invalid ZEP_API_KEY format (should start with "zep_")'));
    throw new Error('Invalid ZEP_API_KEY format');
  }

  return { ZEP_API_KEY, ZEP_USER_ID, ZEP_THREAD_ID, ZEP_DEBUG };
}

/**
 * Tests connection to Zep Cloud
 * @param apiKey - Zep Cloud API key
 * @param userId - User ID for memory isolation
 * @throws {Error} If connection fails
 */
export async function testZepConnection(apiKey: string, userId: string): Promise<void> {
  const spinner = ora('Testing Zep Cloud connection...').start();

  try {
    const zep = new ZepClient({ apiKey });

    // Try to get or create user
    try {
      await zep.user.get(userId);
      spinner.succeed(chalk.green('Zep Cloud connection verified'));
    } catch (error: any) {
      // User doesn't exist, try to create
      if (error.status === 404) {
        await zep.user.add({
          userId,
          firstName: userId,
        });
        spinner.succeed(chalk.green('Zep Cloud connection verified (user created)'));
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to connect to Zep Cloud'));
    console.error(chalk.red(`   Error: ${error.message}`));
    console.error('\n💡 Tips:');
    console.error(chalk.dim('   - Get your API key at https://app.getzep.com'));
    console.error(chalk.dim('   - Make sure you copied the entire key'));
    console.error(chalk.dim("   - Keys start with 'zep_'"));
    throw new Error(`Zep connection failed: ${error.message}`);
  }
}

/**
 * Displays detected environment variables (with masked API key)
 */
export function displayEnvVars(envVars: EnvVars): void {
  console.log(chalk.green('✅ Environment variables detected'));

  // Mask API key (show only first 4 and last 4 characters)
  const maskedKey = envVars.ZEP_API_KEY.startsWith('zep_')
    ? `zep_${'•'.repeat(Math.max(0, envVars.ZEP_API_KEY.length - 8))}${envVars.ZEP_API_KEY.slice(-4)}`
    : '•'.repeat(envVars.ZEP_API_KEY.length);

  console.log(chalk.dim(`   ZEP_API_KEY: ${maskedKey}`));
  console.log(chalk.dim(`   ZEP_USER_ID: ${envVars.ZEP_USER_ID}`));

  if (envVars.ZEP_THREAD_ID) {
    console.log(chalk.dim(`   ZEP_THREAD_ID: ${envVars.ZEP_THREAD_ID}`));
  }

  if (envVars.ZEP_DEBUG) {
    console.log(chalk.dim(`   ZEP_DEBUG: ${envVars.ZEP_DEBUG}`));
  }

  console.log('');
}

/**
 * Main verification function - validates environment and tests Zep connection
 * @throws {Error} If validation or connection fails
 */
export async function verify(): Promise<EnvVars> {
  // Step 1: Validate environment variables
  const envVars = validateEnvironment();

  // Step 2: Display detected env vars
  displayEnvVars(envVars);

  // Step 3: Test Zep Cloud connection
  await testZepConnection(envVars.ZEP_API_KEY, envVars.ZEP_USER_ID);

  console.log('');

  return envVars;
}
