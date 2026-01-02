#!/usr/bin/env node
/**
 * Test MCP tool execution
 */

import { mcpManager } from './dist/mcp/index.js';

console.log('🔍 Testing MCP Tool Execution\n');

// Initialize
console.log('📋 Initializing MCP...');
await mcpManager.initialize();
const connected = mcpManager.getConnectedServers();
console.log(`✅ Connected: ${connected.join(', ')}\n`);

// Get all tools
const tools = mcpManager.getTools();
console.log(`📋 Available tools (${tools.length}):`);
for (const tool of tools) {
  console.log(`  - ${tool.name}`);
}
console.log();

// Test 1: memory read_graph (no args needed)
console.log('📋 Test 1: memory read_graph');
try {
  const result = await mcpManager.callTool('mcp_memory_read_graph', {});
  console.log('✅ Result:', result.slice(0, 300));
} catch (e) {
  console.error('❌ Error:', e.message);
}
console.log();

// Test 2: sequential-thinking
console.log('📋 Test 2: sequential-thinking');
try {
  const result = await mcpManager.callTool('mcp_sequential-thinking_sequentialthinking', {
    thought: "Testing MCP integration",
    thoughtNumber: 1,
    totalThoughts: 1,
    nextThoughtNeeded: false
  });
  console.log('✅ Result:', result.slice(0, 300));
} catch (e) {
  console.error('❌ Error:', e.message);
}
console.log();

// Test 3: exa web search
console.log('📋 Test 3: exa web_search_exa');
try {
  const result = await mcpManager.callTool('mcp_exa_web_search_exa', {
    query: "TypeScript MCP SDK",
    numResults: 2
  });
  console.log('✅ Result:', result.slice(0, 500));
} catch (e) {
  console.error('❌ Error:', e.message);
}
console.log();

// Test 4: context7 resolve-library-id
console.log('📋 Test 4: context7 resolve-library-id');
try {
  const result = await mcpManager.callTool('mcp_context7_resolve-library-id', {
    libraryName: "react",
    query: "React hooks useState"
  });
  console.log('✅ Result:', result.slice(0, 500));
} catch (e) {
  console.error('❌ Error:', e.message);
}
console.log();

// Cleanup
await mcpManager.disconnectAll();
console.log('🏁 MCP Tool Tests Complete');
