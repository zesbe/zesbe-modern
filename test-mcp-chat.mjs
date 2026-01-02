#!/usr/bin/env node
/**
 * Test MCP integration with AI chat (simulates what App.tsx does)
 */

import { mcpManager } from './dist/mcp/index.js';
import { getProvider } from './dist/ai/index.js';
import { TOOL_DEFINITIONS } from './dist/tools/index.js';
import { loadConfig, CODING_SYSTEM_PROMPT } from './dist/config/index.js';

console.log('🔍 Testing MCP + AI Chat Integration\n');

// Initialize MCP
console.log('📋 Step 1: Initialize MCP...');
await mcpManager.initialize();
const mcpTools = mcpManager.getTools();
console.log(`✅ MCP initialized: ${mcpManager.getConnectedServers().join(', ')}`);
console.log(`   MCP tools: ${mcpTools.length}`);
console.log(`   Built-in tools: ${TOOL_DEFINITIONS.length}`);
console.log();

// Load config and provider
console.log('📋 Step 2: Load AI Provider...');
const config = await loadConfig();
console.log(`   Provider: ${config.provider}`);
console.log(`   Model: ${config.model}`);
console.log(`   YOLO: ${config.yolo}`);

const provider = await getProvider();
console.log(`✅ Provider loaded: ${provider.name}`);
console.log();

// Combine tools (like App.tsx does)
const allTools = [...TOOL_DEFINITIONS, ...mcpTools];
console.log(`📋 Step 3: Combined tools: ${allTools.length} total`);
console.log();

// Test chat with tools
console.log('📋 Step 4: Test AI chat with MCP tools...');
console.log('   Asking AI to use MCP memory tool...\n');

const messages = [
  { role: 'system', content: CODING_SYSTEM_PROMPT },
  { role: 'user', content: 'Use the mcp_memory_read_graph tool to read the knowledge graph and tell me what you find.' }
];

try {
  let fullText = '';
  let hasToolCalls = false;
  const toolResults = [];

  console.log('   Streaming response...');
  const generator = provider.chatStream({
    messages,
    model: config.model,
    maxTokens: 1000,
    temperature: 0.7,
    tools: allTools,
  });

  for await (const chunk of generator) {
    if (chunk.type === 'text' && chunk.content) {
      fullText += chunk.content;
      process.stdout.write(chunk.content);
    } else if (chunk.type === 'tool_call' && chunk.toolCall) {
      hasToolCalls = true;
      console.log(`\n\n🔧 Tool call: ${chunk.toolCall.name}`);
      console.log(`   Args: ${JSON.stringify(chunk.toolCall.arguments)}`);

      // Execute MCP tool
      if (chunk.toolCall.name.startsWith('mcp_')) {
        const result = await mcpManager.callTool(chunk.toolCall.name, chunk.toolCall.arguments);
        console.log(`   Result: ${result.slice(0, 200)}...`);
        toolResults.push({
          id: chunk.toolCall.id,
          name: chunk.toolCall.name,
          output: result
        });
      }
    } else if (chunk.type === 'error') {
      console.error(`\n❌ Error: ${chunk.error}`);
    }
  }

  console.log('\n');

  if (hasToolCalls && toolResults.length > 0) {
    console.log('📋 Step 5: Continue with tool results...');

    // Add assistant message with tool calls
    messages.push({
      role: 'assistant',
      content: fullText || '',
      toolCalls: toolResults.map(t => ({
        id: t.id,
        name: t.name,
        arguments: {}
      }))
    });

    // Add tool results
    for (const result of toolResults) {
      messages.push({
        role: 'tool',
        content: result.output,
        toolCallId: result.id
      });
    }

    // Get final response
    const gen2 = provider.chatStream({
      messages,
      model: config.model,
      maxTokens: 1000,
      temperature: 0.7,
      tools: allTools,
    });

    console.log('   AI Response:\n');
    for await (const chunk of gen2) {
      if (chunk.type === 'text' && chunk.content) {
        process.stdout.write(chunk.content);
      }
    }
    console.log('\n');
  }

  console.log('✅ Chat test complete!');
} catch (e) {
  console.error('❌ Chat error:', e.message);
  console.error(e.stack);
}

// Cleanup
await mcpManager.disconnectAll();
console.log('\n🏁 Test Complete');
