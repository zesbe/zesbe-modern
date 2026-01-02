#!/usr/bin/env node
import { mcpManager } from './dist/mcp/index.js';
import { getProvider } from './dist/ai/index.js';
import { TOOL_DEFINITIONS, executeTool } from './dist/tools/index.js';
import { loadConfig, CODING_SYSTEM_PROMPT } from './dist/config/index.js';

console.log('🔍 Testing App.tsx Behavior Simulation\n');

await mcpManager.initialize();
const mcpTools = mcpManager.getTools();
const allTools = [...TOOL_DEFINITIONS, ...mcpTools];

const config = await loadConfig();
const provider = await getProvider();

console.log(`📋 Setup: ${allTools.length} tools total`);
console.log(`📋 Provider: ${config.provider} | Model: ${config.model}\n`);

// Simulate App.tsx state exactly
let messages = [
  { role: 'system', content: CODING_SYSTEM_PROMPT }
];

console.log('='.repeat(50));
console.log('FIRST CHAT - Should succeed');
console.log('='.repeat(50));

// First user message
const firstUserMessage = { role: 'user', content: 'list files in current directory' };
messages.push(firstUserMessage);
console.log(`👤 User: ${firstUserMessage.content}`);

try {
  const generator = provider.chatStream({
    messages: messages,
    model: config.model,
    maxTokens: 1000,
    temperature: 0.7,
    tools: allTools,
  });

  let assistantContent = '';
  let toolCalls = [];

  for await (const chunk of generator) {
    if (chunk.type === 'text') {
      assistantContent += chunk.text;
      process.stdout.write('.');
    } else if (chunk.type === 'tool_call') {
      toolCalls.push({
        id: chunk.toolCall.id,
        name: chunk.toolCall.name,
        arguments: chunk.toolCall.arguments
      });
      console.log(`\n🔧 Tool Call: ${chunk.toolCall.name}`);
      console.log(`   Args: ${JSON.stringify(chunk.toolCall.arguments)}`);
    } else if (chunk.type === 'error') {
      console.log(`\n❌ Stream Error: ${chunk.error}`);
      throw new Error(chunk.error);
    }
  }

  // Add assistant message with tool calls (exactly like App.tsx line 513-516)
  if (toolCalls.length > 0) {
    messages.push({
      role: 'assistant',
      content: assistantContent,
      toolCalls: toolCalls
    });
    console.log(`\n🤖 Assistant: ${assistantContent}`);
    console.log(`   Tool Calls: ${toolCalls.length}`);

    // Execute tools and add results (exactly like App.tsx)
    for (const toolCall of toolCalls) {
      console.log(`\n⚙️  Executing: ${toolCall.name}`);

      let toolResult;
      const builtinTool = TOOL_DEFINITIONS.find(t => t.name === toolCall.name);
      if (builtinTool) {
        const result = await executeTool(toolCall.name, toolCall.arguments);
        toolResult = result.success ? result.output : `Error: ${result.error}`;
      } else {
        toolResult = await mcpManager.callTool(toolCall.name, toolCall.arguments);
      }

      // Add tool message (exactly like App.tsx)
      const toolMessage = {
        role: 'tool',
        content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
        toolCallId: toolCall.id,
        rawContent: toolResult
      };
      messages.push(toolMessage);
      console.log(`   Result: ${toolMessage.content.slice(0, 100)}...`);
    }
  }

  console.log('\n✅ First chat completed successfully\n');
} catch (error) {
  console.log(`\n❌ First chat failed: ${error.message}`);
  process.exit(1);
}

console.log('='.repeat(50));
console.log('SECOND CHAT - User reports this always fails');
console.log('='.repeat(50));

// Second user message
const secondUserMessage = { role: 'user', content: 'now search for typescript documentation online' };
messages.push(secondUserMessage);
console.log(`👤 User: ${secondUserMessage.content}`);

console.log('\nMessage history going to API:');
messages.forEach((msg, i) => {
  const preview = msg.content ? msg.content.slice(0, 50) + '...' : '';
  const extras = [];
  if (msg.toolCallId) extras.push(`toolCallId: ${msg.toolCallId}`);
  if (msg.toolCalls) extras.push(`${msg.toolCalls.length} toolCalls`);
  console.log(`  ${i}: ${msg.role} - ${preview} ${extras.length ? `(${extras.join(', ')})` : ''}`);
});

try {
  console.log('\n🚀 Starting second chat stream...');
  const generator2 = provider.chatStream({
    messages: messages,
    model: config.model,
    maxTokens: 1000,
    temperature: 0.7,
    tools: allTools,
  });

  let assistantContent2 = '';
  let toolCalls2 = [];

  for await (const chunk of generator2) {
    if (chunk.type === 'text') {
      assistantContent2 += chunk.text;
      process.stdout.write('.');
    } else if (chunk.type === 'tool_call') {
      toolCalls2.push({
        id: chunk.toolCall.id,
        name: chunk.toolCall.name,
        arguments: chunk.toolCall.arguments
      });
      console.log(`\n🔧 Tool Call: ${chunk.toolCall.name}`);
    } else if (chunk.type === 'error') {
      console.log(`\n❌ Stream Error: ${chunk.error}`);
      throw new Error(chunk.error);
    }
  }

  console.log(`\n🤖 Assistant: ${assistantContent2}`);
  console.log('\n✅ Second chat completed successfully!');

} catch (error) {
  console.log(`\n❌ Second chat failed with error:`);
  console.log(`   Error: ${error.message}`);

  // Check if it's the specific MiniMax error
  if (error.message.includes('invalid chat setting (2013)')) {
    console.log('\n🔍 This is the exact error you reported!');
    console.log('   Error code 2013 = "invalid chat setting"');
    console.log('   This suggests message format issues in the history');

    console.log('\n📋 Analyzing message structure:');
    messages.forEach((msg, i) => {
      console.log(`   Message ${i}:`);
      console.log(`     Role: ${msg.role}`);
      console.log(`     Content length: ${msg.content?.length || 0}`);
      if (msg.toolCalls) console.log(`     Tool calls: ${msg.toolCalls.length}`);
      if (msg.toolCallId) console.log(`     Tool call ID: ${msg.toolCallId}`);
      if (msg.rawContent) console.log(`     Raw content: ${typeof msg.rawContent}`);
    });
  }
}

await mcpManager.disconnectAll();
console.log('\n🏁 Test Complete');