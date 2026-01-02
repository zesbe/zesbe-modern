import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { loadMCPConfig, MCPServerConfig } from "./config.js";
import type { ToolDefinition } from "../ai/types.js";

interface MCPClient {
  name: string;
  client: Client;
  transport: StdioClientTransport;
  tools: ToolDefinition[];
}

class MCPManager {
  private clients: Map<string, MCPClient> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const config = await loadMCPConfig();

    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      if (serverConfig.enabled !== false) {
        try {
          await this.connectServer(name, serverConfig);
        } catch (error) {
          console.error(`Failed to connect to MCP server ${name}:`, error);
        }
      }
    }

    this.initialized = true;
  }

  async connectServer(name: string, config: MCPServerConfig): Promise<void> {
    // Skip if already connected
    if (this.clients.has(name)) {
      return;
    }

    const client = new Client({
      name: `zesbe-${name}`,
      version: "1.0.0"
    });

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: { ...process.env, ...config.env } as Record<string, string>
    });

    try {
      await client.connect(transport);

      // Get available tools from this server
      const toolsResult = await client.listTools();
      const tools: ToolDefinition[] = toolsResult.tools.map(tool => ({
        name: `mcp_${name}_${tool.name}`,
        description: `[MCP:${name}] ${tool.description || tool.name}`,
        parameters: tool.inputSchema as ToolDefinition["parameters"]
      }));

      this.clients.set(name, { name, client, transport, tools });
      console.log(`Connected to MCP server: ${name} (${tools.length} tools)`);
    } catch (error) {
      console.error(`Error connecting to ${name}:`, error);
      throw error;
    }
  }

  async disconnectServer(name: string): Promise<boolean> {
    const mcpClient = this.clients.get(name);
    if (mcpClient) {
      try {
        await mcpClient.client.close();
      } catch {}
      this.clients.delete(name);
      return true;
    }
    return false;
  }

  async disconnectAll(): Promise<void> {
    for (const [name] of this.clients) {
      await this.disconnectServer(name);
    }
    this.initialized = false;
  }

  getTools(): ToolDefinition[] {
    const allTools: ToolDefinition[] = [];
    for (const mcpClient of this.clients.values()) {
      allTools.push(...mcpClient.tools);
    }
    return allTools;
  }

  async callTool(toolName: string, args: Record<string, unknown>): Promise<string> {
    // Parse tool name: mcp_<server>_<tool>
    const match = toolName.match(/^mcp_([^_]+)_(.+)$/);
    if (!match) {
      return `Invalid MCP tool name: ${toolName}`;
    }

    const [, serverName, actualToolName] = match;
    const mcpClient = this.clients.get(serverName);

    if (!mcpClient) {
      return `MCP server not connected: ${serverName}`;
    }

    try {
      const result = await mcpClient.client.callTool({
        name: actualToolName,
        arguments: args
      });

      // Extract text content from result
      if (result.content && Array.isArray(result.content)) {
        return result.content
          .map((c: any) => c.text || JSON.stringify(c))
          .join("\n");
      }

      return JSON.stringify(result);
    } catch (error) {
      return `MCP tool error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  isConnected(name: string): boolean {
    return this.clients.has(name);
  }

  getServerInfo(name: string): { tools: number; connected: boolean } | null {
    const mcpClient = this.clients.get(name);
    if (mcpClient) {
      return {
        tools: mcpClient.tools.length,
        connected: true
      };
    }
    return null;
  }
}

// Singleton instance
export const mcpManager = new MCPManager();

// Export for use elsewhere
export { MCPManager };
