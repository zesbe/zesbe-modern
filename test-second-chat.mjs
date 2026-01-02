#!/usr/bin/env node
import { mcpManager } from './dist/mcp/index.js';
import { getProvider } from './dist/ai/index.js';
import { TOOL_DEFINITIONS } from './dist/tools/index.js';
import { loadConfig, CODING_SYSTEM_PROMPT } from './dist/config/index.js';

console.log('🔍 Test Second Chat Issue\n');

await mcpManager.initialize();
const mcpTools = mcpManager.getTools();
const allTools = [...TOOL_DEFINITIONS, ...mcpTools];

const config = await loadConfig();
const provider = await getProvider();

console.log(`📋 Setup: ${allTools.length} tools total\n`);

// Simulate first chat with tool call
let aiMessages = [
  { role: 'system', content: CODING_SYSTEM_PROMPT },
  { role: 'user', content: 'list files in current directory' }
];

console.log('📋 First Chat...');
try {
  const gen1 = provider.chatStream({
    messages: aiMessages,
    model: config.model,
    maxTokens: 1000,
    temperature: 0.7,
    tools: allTools,
  });

  let hadToolCall = false;
  for await (const chunk of gen1) {
    if (chunk.type === 'text') process.stdout.write('.');
    if (chunk.type === 'tool_call') {
      hadToolCall = true;
      console.log(`\n🔧 Tool: ${chunk.toolCall.name}`);
      
      // Simulate what App.tsx does - add assistant message with tool call
      aiMessages.push({
        role: 'assistant',
        content: '',
        toolCalls: [{
          id: chunk.toolCall.id,
          name: chunk.toolCall.name,
          arguments: chunk.toolCall.arguments
        }]
      });
      
      // Add tool result
      aiMessages.push({
        role: 'tool',
        content: 'package.json\ntsconfig.json\nsrc/',
        toolCallId: chunk.toolCall.id
      });
      break;
    }
  }
  
  if (!hadToolCall) {
    console.log('\n❌ No tool call in first chat');
    process.exit(1);
  }
  
  console.log('\n✅ First chat OK\n');
} catch (e) {
  console.log('\n❌ First chat error:', e.message);
  process.exit(1);
}

// Simulate second chat using same history
console.log('📋 Second Chat (this should fail)...');
aiMessages.push({ role: 'user', content: 'now search for typescript docs online' });

console.log('Messages for API:');
aiMessages.forEach((msg, i) => {
  console.log(`${i}: ${msg.role} - ${msg.content?.slice(0, 50)}... ${msg.toolCallId ? `(toolCallId: ${msg.toolCallId})` : ''} ${msg.toolCalls ? `(${msg.toolCalls.length} toolCalls)` : ''}`);
});
console.log('');

try {
  const gen2 = provider.chatStream({
    messages: aiMessages,
    model: config.model,
    maxTokens: 1000,
    temperature: 0.7,
    tools: allTools,
  });

  for await (const chunk of gen2) {
    if (chunk.type === 'text') process.stdout.write('.');
    if (chunk.type === 'error') {
      console.log('\n❌ Stream error:', chunk.error);
      break;
    }
  }
  console.log('\n✅ Second chat OK!');
} catch (e) {
  console.log('\n❌ Second chat error:', e.message);
}

await mcpManager.disconnectAll();
console.log('\n🏁 Test Complete');
