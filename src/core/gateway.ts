import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SessionManager } from './session-manager.js';
import { ToolLoader } from './tool-loader.js';

export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface ToolMetadata extends Tool {
  serverId: string;
  category?: string;
  keywords?: string[];
}

export class AwesomePluginGateway {
  private server: Server;
  private _sessionManager: SessionManager; // TODO: Use in Phase 2
  private _toolLoader: ToolLoader; // TODO: Use in Phase 2
  private connectedServers: Map<string, MCPServerConfig>;
  private availableTools: Map<string, ToolMetadata>;

  constructor() {
    this.server = new Server(
      {
        name: 'awesome-plugin',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this._sessionManager = new SessionManager();
    this._toolLoader = new ToolLoader();
    this.connectedServers = new Map();
    this.availableTools = new Map();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handler: List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.availableTools.values()).map(
        ({ serverId, category, keywords, ...tool }) => tool
      );

      return {
        tools,
      };
    });

    // Handler: Call a tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const toolMetadata = this.availableTools.get(toolName);

      if (!toolMetadata) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      // Forward the tool call to the appropriate MCP server
      // TODO: Implement actual tool forwarding to connected servers
      return {
        content: [
          {
            type: 'text',
            text: `Tool ${toolName} called with arguments: ${JSON.stringify(request.params.arguments)}`,
          },
        ],
      };
    });
  }

  async connectToServer(config: MCPServerConfig): Promise<void> {
    try {
      // Store server configuration
      this.connectedServers.set(config.id, config);

      // TODO: Implement actual server connection using child_process
      // For now, we'll simulate a connection
      console.log(`Connected to MCP server: ${config.name} (${config.id})`);

      // Register tools from this server
      await this.registerServerTools(config.id);
    } catch (error) {
      console.error(`Failed to connect to server ${config.name}:`, error);
      throw error;
    }
  }

  private async registerServerTools(serverId: string): Promise<void> {
    // TODO: Call tools/list on the connected server to get available tools
    // For now, we'll add some mock tools
    const mockTools: ToolMetadata[] = [
      {
        name: `${serverId}_example_tool`,
        description: `Example tool from ${serverId}`,
        inputSchema: {
          type: 'object',
          properties: {
            param: {
              type: 'string',
              description: 'Example parameter',
            },
          },
        },
        serverId,
        category: 'example',
        keywords: ['example', 'test'],
      },
    ];

    for (const tool of mockTools) {
      this.availableTools.set(tool.name, tool);
    }

    console.log(`Registered ${mockTools.length} tools from server: ${serverId}`);
  }

  async disconnectServer(serverId: string): Promise<void> {
    // Remove all tools from this server
    for (const [toolName, metadata] of this.availableTools.entries()) {
      if (metadata.serverId === serverId) {
        this.availableTools.delete(toolName);
      }
    }

    this.connectedServers.delete(serverId);
    console.log(`Disconnected server: ${serverId}`);
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Awesome Plugin Gateway started');
  }

  async stop(): Promise<void> {
    // Disconnect all servers
    for (const serverId of this.connectedServers.keys()) {
      await this.disconnectServer(serverId);
    }

    await this.server.close();
    console.log('Awesome Plugin Gateway stopped');
  }
}
