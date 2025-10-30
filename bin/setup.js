#!/usr/bin/env node

/**
 * OpenCode Withvibes Setup CLI
 *
 * Automated setup tool for Daytona sandbox environments.
 * Handles environment validation, Zep Cloud connection testing,
 * and agent configuration with zero user interaction.
 */

import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  overwrite: args.includes('--overwrite') || args.includes('-f'),
  help: args.includes('--help') || args.includes('-h'),
  version: args.includes('--version') || args.includes('-v'),
};

// Get package.json for version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '..', 'package.json');

async function main() {
  try {
    // Import setup modules
    const { setupAgents } = await import('../dist/cli/setup-agents.js');
    const { setupPrompts } = await import('../dist/cli/setup-prompts.js');
    const { verify } = await import('../dist/cli/verify.js');

    // Show banner
    console.log('🎯 OpenCode Withvibes Setup');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Step 1: Validate environment and test Zep connection
    const envVars = await verify();

    // Step 2: Configure agents
    await setupAgents(flags);

    // Step 3: Setup prompts directory
    await setupPrompts(flags);

    // Step 4: Success output
    console.log('\n✨ Setup complete! Start coding:');
    console.log('   opencode run "Build a TanStack website"');
    console.log('   opencode run "@tester check everything"');
    console.log('   opencode run "@memory-expert What preferences have I stated?"\n');
    console.log('📚 Documentation:');
    console.log('  https://github.com/withvibes/opencode-withvibes#readme\n');
  } catch (error) {
    console.error(`\n❌ Setup failed: ${error.message}\n`);
    process.exit(1);
  }
}

// Handle --help flag
if (flags.help) {
  console.log(`
OpenCode Withvibes Setup - Automated configuration for Daytona sandboxes

USAGE:
  npx opencode-withvibes setup [OPTIONS]

OPTIONS:
  --overwrite, -f    Force overwrite existing agent configs
  --help, -h         Show this help message
  --version, -v      Show version number

ENVIRONMENT VARIABLES (Required):
  ZEP_API_KEY        Your Zep Cloud API key (get from https://app.getzep.com)
  ZEP_USER_ID        User ID for memory isolation

ENVIRONMENT VARIABLES (Optional):
  ZEP_THREAD_ID      Custom thread ID (auto-generated if not set)
  ZEP_DEBUG          Enable debug logging (true/false)

EXAMPLES:
  # Basic setup
  npx opencode-withvibes setup

  # Force overwrite existing configs
  npx opencode-withvibes setup --overwrite

  # Show help
  npx opencode-withvibes --help
`);
  process.exit(0);
}

// Handle --version flag
if (flags.version) {
  const fs = await import('node:fs/promises');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  console.log(`opencode-withvibes v${packageJson.version}`);
  process.exit(0);
}

// Run main setup
main();
