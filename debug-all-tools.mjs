#!/usr/bin/env node
import { mcpManager } from './dist/mcp/index.js';
import { getProvider } from './dist/ai/index.js';
import { TOOL_DEFINITIONS } from './dist/tools/index.js';
import { loadConfig } from './dist/config/index.js';

console.log('🔍 Debug ALL Tools Combined\n');

await mcpManager.initialize();
const mcpTools = mcpManager.getTools();
const allTools = [...TOOL_DEFINITIONS, ...mcpTools];

console.log(`Total tools: ${allTools.length}`);

const config = await loadConfig();
const provider = await getProvider();

// Test with ALL tools
console.log('\n📋 Test: Chat WITH ALL 44 tools...');
try {
  const gen = provider.chatStream({
    messages: [
      { role: 'user', content: 'hello' }
    ],
    model: config.model,
    maxTokens: 100,
    temperature: 0.7,
    tools: allTools,
  });
  for await (const chunk of gen) {
    if (chunk.type === 'text') process.stdout.write(chunk.content);
    if (chunk.type === 'error') console.log('\n❌ Stream error:', chunk.error);
  }
  console.log('\n✅ Works!\n');
} catch (e) {
  console.log('\n❌ Error:', e.message);
}

// Test with 30 tools
console.log('\n📋 Test: Chat WITH 30 tools...');
try {
  const gen = provider.chatStream({
    messages: [
      { role: 'user', content: 'hello' }
    ],
    model: config.model,
    maxTokens: 100,
    temperature: 0.7,
    tools: allTools.slice(0, 30),
  });
  for await (const chunk of gen) {
    if (chunk.type === 'text') process.stdout.write(chunk.content);
  }
  console.log('\n✅ Works!\n');
} catch (e) {
  console.log('\n❌ Error:', e.message);
}

// Test with 20 tools
console.log('\n📋 Test: Chat WITH 20 tools...');
try {
  const gen = provider.chatStream({
    messages: [
      { role: 'user', content: 'hello' }
    ],
    model: config.model,
    maxTokens: 100,
    temperature: 0.7,
    tools: allTools.slice(0, 20),
  });
  for await (const chunk of gen) {
    if (chunk.type === 'text') process.stdout.write(chunk.content);
  }
  console.log('\n✅ Works!\n');
} catch (e) {
  console.log('\n❌ Error:', e.message);
}

await mcpManager.disconnectAll();
console.log('🏁 Debug Complete');
