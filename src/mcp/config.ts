import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled?: boolean;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

const CONFIG_DIR = join(homedir(), ".zesbe-modern");
const MCP_CONFIG_PATH = join(CONFIG_DIR, "mcp.json");

// Default MCP servers
export const DEFAULT_MCP_CONFIG: MCPConfig = {
  mcpServers: {
    "context7": {
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
      env: {
        "CONTEXT7_API_KEY": "ctx7sk-dfdd3d92-65fd-4e1d-bd1c-1bee51cbacf0"
      },
      enabled: true
    },
    "sequential-thinking": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      enabled: true
    },
    "exa": {
      command: "npx",
      args: ["-y", "exa-mcp-server"],
      env: {
        "EXA_API_KEY": "8bab0085-90d5-4767-911d-6fd2f5caf6eb"
      },
      enabled: true
    },
    "memory": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-memory"],
      enabled: true
    }
  }
};

export async function loadMCPConfig(): Promise<MCPConfig> {
  try {
    const content = await readFile(MCP_CONFIG_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    // Return default config if file doesn't exist
    return DEFAULT_MCP_CONFIG;
  }
}

export async function saveMCPConfig(config: MCPConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(MCP_CONFIG_PATH, JSON.stringify(config, null, 2));
}

export async function addMCPServer(
  name: string,
  server: MCPServerConfig
): Promise<void> {
  const config = await loadMCPConfig();
  config.mcpServers[name] = { ...server, enabled: true };
  await saveMCPConfig(config);
}

export async function removeMCPServer(name: string): Promise<boolean> {
  const config = await loadMCPConfig();
  if (config.mcpServers[name]) {
    delete config.mcpServers[name];
    await saveMCPConfig(config);
    return true;
  }
  return false;
}

export async function toggleMCPServer(name: string): Promise<boolean | null> {
  const config = await loadMCPConfig();
  if (config.mcpServers[name]) {
    config.mcpServers[name].enabled = !config.mcpServers[name].enabled;
    await saveMCPConfig(config);
    return config.mcpServers[name].enabled;
  }
  return null;
}

export async function listMCPServers(): Promise<{ name: string; config: MCPServerConfig }[]> {
  const config = await loadMCPConfig();
  return Object.entries(config.mcpServers).map(([name, cfg]) => ({
    name,
    config: cfg
  }));
}

export { MCP_CONFIG_PATH, CONFIG_DIR };
