export { AwesomePluginGateway, type MCPServerConfig, type ToolMetadata } from './core/gateway.js';
export { SessionManager, type Session } from './core/session-manager.js';
export { ToolLoader, type LoadedToolsResult, type ToolLoadingStrategy } from './core/tool-loader.js';

// Main entry point for running as MCP server
async function main() {
  const { AwesomePluginGateway } = await import('./core/gateway.js');
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

  // Start the gateway
  await gateway.start();
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
