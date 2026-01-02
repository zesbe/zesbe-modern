#!/usr/bin/env node
import { Command } from 'commander';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Configuration paths for different scopes
const CONFIG_PATHS = {
  user: join(homedir(), '.zesbe-modern', 'mcp-config.json'),
  local: join(process.cwd(), '.zesbe-modern', 'mcp-config.json'),
  project: join(process.cwd(), '.mcp.json')
};

interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  transport: 'stdio' | 'sse' | 'http';
  scope: 'local' | 'user' | 'project';
}

interface MCPConfig {
  servers: Record<string, MCPServerConfig>;
}

// Default MCP configuration like Claude Code with working API keys
const DEFAULT_MCP_SERVERS: Record<string, Omit<MCPServerConfig, 'name' | 'scope'>> = {
  'context7': {
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp'],
    transport: 'stdio',
    env: {
      'CONTEXT7_API_KEY': 'ctx7sk-dfdd3d92-65fd-4e1d-bd1c-1bee51cbacf0'
    }
  },
  'sequential-thinking': {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    transport: 'stdio',
    env: {}
  },
  'exa': {
    command: 'npx',
    args: ['-y', 'exa-mcp-server'],
    transport: 'stdio',
    env: {
      'EXA_API_KEY': '8bab0085-90d5-4767-911d-6fd2f5caf6eb'
    }
  },
  'memory': {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    transport: 'stdio',
    env: {}
  }
};

// Load configuration from specific scope
async function loadConfig(scope?: 'local' | 'user' | 'project'): Promise<MCPConfig> {
  const config: MCPConfig = { servers: {} };

  // Load from all scopes if no specific scope provided
  const scopes = scope ? [scope] : ['user', 'local', 'project'] as const;

  for (const s of scopes) {
    try {
      const configPath = CONFIG_PATHS[s as keyof typeof CONFIG_PATHS];
      const content = await fs.readFile(configPath, 'utf-8');
      const scopeConfig = JSON.parse(content) as MCPConfig;

      // Merge servers with scope information
      for (const [name, server] of Object.entries(scopeConfig.servers)) {
        config.servers[name] = { ...server, name, scope: s as 'local' | 'user' | 'project' };
      }
    } catch {
      // File doesn't exist, continue
    }
  }

  return config;
}

// Save configuration to specific scope
async function saveConfig(config: MCPConfig, scope: 'local' | 'user' | 'project'): Promise<void> {
  const configPath = CONFIG_PATHS[scope];

  // Ensure directory exists
  await fs.mkdir(resolve(configPath, '..'), { recursive: true });

  // Filter servers for this scope only
  const scopeConfig: MCPConfig = {
    servers: Object.fromEntries(
      Object.entries(config.servers).filter(([_, server]) => server.scope === scope)
    )
  };

  await fs.writeFile(configPath, JSON.stringify(scopeConfig, null, 2));
}

// Test MCP server connection (health check)
async function testConnection(server: MCPServerConfig): Promise<boolean> {
  try {
    // Suppress all output during testing to prevent flickering
    const transport = new StdioClientTransport({
      command: server.command,
      args: server.args,
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(([_, v]) => v !== undefined)
        ) as Record<string, string>,
        ...server.env
      },
      stderr: 'ignore'
    });

    const client = new Client({ name: 'zesbe-modern-healthcheck', version: '1.0.0' }, {});

    // Shorter timeout to reduce UI delay
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 2000);
    });

    await Promise.race([
      client.connect(transport),
      timeoutPromise
    ]);

    await client.close();
    return true;
  } catch {
    return false;
  }
}

// Initialize default servers in project scope if none exist
async function initializeDefaults(scope: 'project' | 'local' = 'project'): Promise<void> {
  const config = await loadConfig();

  // Check if any servers already exist
  if (Object.keys(config.servers).length > 0) {
    return; // Don't overwrite existing config
  }

  // Add default servers
  for (const [name, serverConfig] of Object.entries(DEFAULT_MCP_SERVERS)) {
    config.servers[name] = { ...serverConfig, name, scope };
  }

  await saveConfig(config, scope);
}

// CLI Commands
const program = new Command();

program
  .name('zesbe-modern mcp')
  .description('Configure and manage MCP servers')
  .version('1.0.0');

// List command
program
  .command('list')
  .description('List configured MCP servers')
  .action(async () => {
    const config = await loadConfig();
    const servers = Object.values(config.servers);

    if (servers.length === 0) {
      console.log('No MCP servers configured.');
      console.log('\nTo add default servers, run:');
      console.log('  zesbe-modern mcp add-defaults');
      return;
    }

    console.log('Checking MCP server health...');

    // Test connections sequentially to avoid flickering
    const results = [];
    for (const server of servers) {
      process.stdout.write(`  Testing ${server.name}...`);
      const connected = await testConnection(server);
      process.stdout.write('\r'); // Clear the line
      results.push({ server, connected });
    }

    console.log(''); // Add blank line

    // Display results like Claude Code
    for (const { server, connected } of results) {
      const status = connected ? '✓ Connected' : '✗ Failed';
      const command = `${server.command} ${server.args.join(' ')}`;
      console.log(`${server.name}: ${command} - ${status}`);
    }
  });

// Add command
program
  .command('add')
  .description('Add an MCP server to zesbe-modern')
  .argument('<name>', 'Server name')
  .argument('<commandOrUrl>', 'Command or URL for the server')
  .argument('[args...]', 'Additional arguments')
  .option('-s, --scope <scope>', 'Configuration scope (local, user, or project)', 'local')
  .option('-t, --transport <transport>', 'Transport type (stdio, sse, http)', 'stdio')
  .option('-e, --env <env...>', 'Set environment variables (e.g. KEY=value)')
  .action(async (name, commandOrUrl, args, options) => {
    const { scope, transport, env: envVars } = options;

    if (!['local', 'user', 'project'].includes(scope)) {
      console.error('Error: scope must be one of: local, user, project');
      process.exit(1);
    }

    if (!['stdio', 'sse', 'http'].includes(transport)) {
      console.error('Error: transport must be one of: stdio, sse, http');
      process.exit(1);
    }

    // Parse environment variables
    const env: Record<string, string> = {};
    if (envVars) {
      for (const envVar of envVars) {
        const [key, value] = envVar.split('=');
        if (!value) {
          console.error(`Error: Invalid environment variable format: ${envVar}`);
          process.exit(1);
        }
        env[key] = value;
      }
    }

    // Create server configuration
    const serverConfig: MCPServerConfig = {
      name,
      command: commandOrUrl,
      args: args || [],
      env,
      transport: transport as 'stdio' | 'sse' | 'http',
      scope: scope as 'local' | 'user' | 'project'
    };

    // Load existing config and add server
    const config = await loadConfig();
    config.servers[name] = serverConfig;

    // Save to appropriate scope
    await saveConfig(config, scope as any);

    console.log(`Added MCP server "${name}" to ${scope} scope`);
    console.log(`Command: ${commandOrUrl} ${(args || []).join(' ')}`);

    // Test connection
    console.log('\nTesting connection...');
    const connected = await testConnection(serverConfig);
    console.log(`Status: ${connected ? '✓ Connected' : '✗ Failed to connect'}`);
  });

// Remove command
program
  .command('remove')
  .description('Remove an MCP server')
  .argument('<name>', 'Server name to remove')
  .option('-s, --scope <scope>', 'Configuration scope (local, user, or project)')
  .action(async (name, options) => {
    const config = await loadConfig();

    if (!config.servers[name]) {
      console.error(`Error: Server "${name}" not found`);
      process.exit(1);
    }

    const server = config.servers[name];
    const targetScope = options.scope || server.scope;

    // Remove from config
    delete config.servers[name];

    // Save updated config
    await saveConfig(config, targetScope);

    console.log(`Removed MCP server "${name}" from ${targetScope} scope`);
  });

// Get command
program
  .command('get')
  .description('Get details about an MCP server')
  .argument('<name>', 'Server name')
  .action(async (name) => {
    const config = await loadConfig();

    if (!config.servers[name]) {
      console.error(`Error: Server "${name}" not found`);
      process.exit(1);
    }

    const server = config.servers[name];

    console.log(`${name}:`);
    console.log(`  Scope: ${server.scope === 'project' ? 'Project config (shared via .mcp.json)' : server.scope} config`);

    // Test connection
    const connected = await testConnection(server);
    console.log(`  Status: ${connected ? '✓ Connected' : '✗ Failed'}`);
    console.log(`  Command: ${server.command} ${server.args.join(' ')}`);

    if (Object.keys(server.env || {}).length > 0) {
      console.log('  Environment:');
      for (const [key, value] of Object.entries(server.env || {})) {
        console.log(`    ${key}=${value}`);
      }
    }

    console.log(`\nTo remove this server, run: zesbe-modern mcp remove "${name}" -s ${server.scope}`);
  });

// Add defaults command
program
  .command('add-defaults')
  .description('Add default MCP servers (context7, sequential-thinking, exa, memory)')
  .option('-s, --scope <scope>', 'Configuration scope (local, user, or project)', 'project')
  .action(async (options) => {
    const scope = options.scope as 'local' | 'user' | 'project';

    // initializeDefaults only supports 'local' and 'project', default to 'project' for 'user'
    const targetScope = scope === 'user' ? 'project' : scope;
    await initializeDefaults(targetScope);

    console.log(`Added default MCP servers to ${scope} scope:`);
    for (const name of Object.keys(DEFAULT_MCP_SERVERS)) {
      console.log(`  - ${name}`);
    }

    console.log('\nRun "zesbe-modern mcp list" to check server status');
  });

// Add JSON command
program
  .command('add-json')
  .description('Add an MCP server with a JSON string')
  .argument('<name>', 'Server name')
  .argument('<json>', 'JSON configuration string')
  .option('-s, --scope <scope>', 'Configuration scope (local, user, or project)', 'local')
  .action(async (name, jsonStr, options) => {
    try {
      const serverConfig = JSON.parse(jsonStr) as Omit<MCPServerConfig, 'name' | 'scope'>;

      const config = await loadConfig();
      config.servers[name] = {
        ...serverConfig,
        name,
        scope: options.scope as 'local' | 'user' | 'project'
      };

      await saveConfig(config, options.scope);
      console.log(`Added MCP server "${name}" from JSON to ${options.scope} scope`);
    } catch (error) {
      console.error(`Error: Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// Serve command placeholder
program
  .command('serve')
  .description('Start the zesbe-modern MCP server')
  .option('-p, --port <port>', 'Port number', '3721')
  .action(async (options) => {
    console.log(`Starting zesbe-modern MCP server on port ${options.port}...`);
    console.log('Note: MCP server functionality not yet implemented');
    console.log('This command is a placeholder for future implementation');
  });

export { program };