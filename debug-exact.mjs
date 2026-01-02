#!/usr/bin/env node
import { mcpManager } from './dist/mcp/index.js';
import { getProvider } from './dist/ai/index.js';
import { TOOL_DEFINITIONS } from './dist/tools/index.js';
import { loadConfig, CODING_SYSTEM_PROMPT } from './dist/config/index.js';

console.log('🔍 Debug Exact Prompt\n');

await mcpManager.initialize();
const mcpTools = mcpManager.getTools();
const allTools = [...TOOL_DEFINITIONS, ...mcpTools];

console.log(`Total tools: ${allTools.length}`);
console.log(`MCP servers: ${mcpManager.getConnectedServers().join(', ')}`);

const config = await loadConfig();
const provider = await getProvider();

// Test exact prompt
console.log('\n📋 Test: Exact user prompt...\n');
try {
  const gen = provider.chatStream({
    messages: [
      { role: 'system', content: CODING_SYSTEM_PROMPT },
      { role: 'user', content: 'cari dokumentasi TypeScript terbaru pakai tool exa web search' }
    ],
    model: config.model,
    maxTokens: 2000,
    temperature: 0.7,
    tools: allTools,
  });
  
  let hasToolCall = false;
  for await (const chunk of gen) {
    if (chunk.type === 'text') process.stdout.write(chunk.content);
    if (chunk.type === 'tool_call') {
      hasToolCall = true;
      console.log('\n\n🔧 Tool call:', chunk.toolCall.name);
      console.log('   Args:', JSON.stringify(chunk.toolCall.arguments));
      
      // Execute the tool
      if (chunk.toolCall.name.startsWith('mcp_')) {
        const result = await mcpManager.callTool(chunk.toolCall.name, chunk.toolCall.arguments);
        console.log('   Result:', result.slice(0, 300) + '...');
      }
    }
    if (chunk.type === 'error') console.log('\n❌ Error:', chunk.error);
  }
  console.log('\n\n✅ Test complete!');
} catch (e) {
  console.log('\n❌ Exception:', e.message);
}

await mcpManager.disconnectAll();
