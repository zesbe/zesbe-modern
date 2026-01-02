#!/usr/bin/env node
import { mcpManager } from './dist/mcp/index.js';
import { getProvider } from './dist/ai/index.js';
import { TOOL_DEFINITIONS } from './dist/tools/index.js';
import { loadConfig, CODING_SYSTEM_PROMPT } from './dist/config/index.js';

console.log('🔍 Debug Tool Schemas\n');

// Initialize MCP
await mcpManager.initialize();
const mcpTools = mcpManager.getTools();

console.log(`Built-in tools: ${TOOL_DEFINITIONS.length}`);
console.log(`MCP tools: ${mcpTools.length}`);

// Check MCP tool schemas
console.log('\n📋 MCP Tool Schemas:');
for (const tool of mcpTools) {
  console.log(`\n${tool.name}:`);
  console.log(`  desc: ${tool.description?.slice(0, 50)}...`);
  console.log(`  params: ${JSON.stringify(tool.parameters).slice(0, 100)}...`);
}

// Try a simple chat without tools first
const config = await loadConfig();
const provider = await getProvider();

console.log('\n\n📋 Test 1: Chat WITHOUT tools...');
try {
  const gen = provider.chatStream({
    messages: [
      { role: 'user', content: 'say hello' }
    ],
    model: config.model,
    maxTokens: 100,
    temperature: 0.7,
  });
  for await (const chunk of gen) {
    if (chunk.type === 'text') process.stdout.write(chunk.content);
  }
  console.log('\n✅ Chat without tools works!\n');
} catch (e) {
  console.log('\n❌ Error:', e.message);
}

// Try with just built-in tools
console.log('\n📋 Test 2: Chat WITH built-in tools only...');
try {
  const gen = provider.chatStream({
    messages: [
      { role: 'user', content: 'list files in current directory' }
    ],
    model: config.model,
    maxTokens: 100,
    temperature: 0.7,
    tools: TOOL_DEFINITIONS.slice(0, 5), // Just first 5 tools
  });
  for await (const chunk of gen) {
    if (chunk.type === 'text') process.stdout.write(chunk.content);
    if (chunk.type === 'tool_call') console.log('\nTool call:', chunk.toolCall.name);
  }
  console.log('\n✅ Chat with built-in tools works!\n');
} catch (e) {
  console.log('\n❌ Error:', e.message);
}

// Try with MCP tools
console.log('\n📋 Test 3: Chat WITH MCP tools...');
try {
  const gen = provider.chatStream({
    messages: [
      { role: 'user', content: 'search for typescript docs' }
    ],
    model: config.model,
    maxTokens: 100,
    temperature: 0.7,
    tools: mcpTools.slice(0, 3), // Just first 3 MCP tools
  });
  for await (const chunk of gen) {
    if (chunk.type === 'text') process.stdout.write(chunk.content);
    if (chunk.type === 'tool_call') console.log('\nTool call:', chunk.toolCall.name);
  }
  console.log('\n✅ Chat with MCP tools works!\n');
} catch (e) {
  console.log('\n❌ Error:', e.message);
}

await mcpManager.disconnectAll();
console.log('\n🏁 Debug Complete');
