#!/usr/bin/env node

import { Command } from 'commander';
import { AwesomePluginGateway } from './core/gateway.js';

const program = new Command();

program
  .name('awesome-plugin')
  .description('Awesome MCP Meta Plugin - Intelligent tool selection and auto-discovery')
  .version('0.1.0');

program
  .command('start')
  .description('Start the Awesome Plugin Gateway')
  .action(async () => {
    console.log('Starting Awesome Plugin Gateway...');
    const gateway = new AwesomePluginGateway();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down...');
      await gateway.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nShutting down...');
      await gateway.stop();
      process.exit(0);
    });

    await gateway.start();
  });

program
  .command('init')
  .description('Initialize Awesome Plugin configuration')
  .action(async () => {
    console.log('Initializing Awesome Plugin...');
    console.log('\nConfiguration wizard coming soon in Phase 3!');
    console.log('For now, you can manually configure servers in config/servers/');
  });

program
  .command('discover')
  .description('Discover MCP servers from GitHub')
  .option('-l, --limit <number>', 'Maximum number of results', '50')
  .option('--min-score <number>', 'Minimum quality score (0-100)', '70')
  .action(async (options) => {
    console.log('Discovering MCP servers from GitHub...');
    console.log(`Limit: ${options.limit}, Min score: ${options.minScore}`);
    console.log('\nGitHub auto-discovery coming soon in Phase 3!');
  });

program
  .command('list')
  .description('List all connected MCP servers')
  .action(async () => {
    console.log('Connected MCP servers:');
    console.log('\nServer listing coming soon!');
  });

program
  .command('stats')
  .description('Show gateway statistics')
  .action(async () => {
    console.log('Gateway Statistics:');
    console.log('\nStatistics coming soon!');
  });

program.parse(process.argv);
