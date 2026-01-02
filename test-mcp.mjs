#!/usr/bin/env node
/**
 * Test MCP (Model Context Protocol) functionality
 */

import { mcpManager, loadMCPConfig, listMCPServers, DEFAULT_MCP_CONFIG } from './dist/mcp/index.js';

console.log('🔍 Testing MCP Integration for zesbe-modern\n');

// Step 1: Check default config
console.log('📋 Step 1: Default MCP Config');
console.log(JSON.stringify(DEFAULT_MCP_CONFIG, null, 2));
console.log();

// Step 2: Load actual config
console.log('📋 Step 2: Loading MCP Config...');
try {
  const config = await loadMCPConfig();
  console.log('Loaded config:', JSON.stringify(config, null, 2));
} catch (e) {
  console.error('❌ Error loading config:', e.message);
}
console.log();

// Step 3: List configured servers
console.log('📋 Step 3: Listing MCP Servers...');
try {
  const servers = await listMCPServers();
  console.log('Configured servers:');
  for (const s of servers) {
    console.log(`  - ${s.name}: enabled=${s.config.enabled !== false}, command=${s.config.command}`);
  }
} catch (e) {
  console.error('❌ Error listing servers:', e.message);
}
console.log();

// Step 4: Initialize MCP Manager
console.log('📋 Step 4: Initializing MCP Manager...');
try {
  await mcpManager.initialize();
  console.log('✅ MCP Manager initialized');

  const connected = mcpManager.getConnectedServers();
  console.log(`Connected servers: ${connected.length > 0 ? connected.join(', ') : 'None'}`);

  const tools = mcpManager.getTools();
  console.log(`Available tools: ${tools.length}`);

  if (tools.length > 0) {
    console.log('\nFirst 5 tools:');
    for (const tool of tools.slice(0, 5)) {
      console.log(`  - ${tool.name}: ${tool.description?.slice(0, 50)}...`);
    }
  }
} catch (e) {
  console.error('❌ Error initializing MCP:', e.message);
  console.error(e.stack);
}
console.log();

// Step 5: Test calling a tool (if any available)
console.log('📋 Step 5: Testing Tool Call...');
const tools = mcpManager.getTools();
if (tools.length > 0) {
  // Find a simple tool to test - preferably memory or sequential-thinking
  const testTool = tools.find(t => t.name.includes('memory') || t.name.includes('read_graph'))
    || tools.find(t => t.name.includes('sequentialthinking'))
    || tools[0];

  console.log(`Testing tool: ${testTool.name}`);
  try {
    const result = await mcpManager.callTool(testTool.name, {});
    console.log('Result:', result.slice(0, 200) + (result.length > 200 ? '...' : ''));
  } catch (e) {
    console.error('❌ Tool call error:', e.message);
  }
} else {
  console.log('⚠️ No tools available to test');
}

// Cleanup
console.log('\n📋 Step 6: Cleanup...');
await mcpManager.disconnectAll();
console.log('✅ Disconnected all servers');

console.log('\n🏁 MCP Test Complete');
