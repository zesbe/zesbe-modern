#!/usr/bin/env node
import { mcpManager } from './dist/mcp/index.js';
import { getProvider } from './dist/ai/index.js';
import { TOOL_DEFINITIONS, executeTool } from './dist/tools/index.js';
import { loadConfig, CODING_SYSTEM_PROMPT } from './dist/config/index.js';

console.log('🧪 Testing Multiple Consecutive Chats - Reproducing User Issue\n');

await mcpManager.initialize();
const mcpTools = mcpManager.getTools();
const allTools = [...TOOL_DEFINITIONS, ...mcpTools];

const config = await loadConfig();
const provider = await getProvider();

console.log(`📋 Setup: ${allTools.length} tools total`);
console.log(`📋 Provider: ${config.provider} | Model: ${config.model}`);

// Simulate persistent chat session (like App.tsx maintains)
let conversationHistory = [
  { role: 'system', content: CODING_SYSTEM_PROMPT }
];

async function simulateChat(chatNumber, userMessage) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`CHAT ${chatNumber}: "${userMessage}"`);
  console.log(`${'='.repeat(60)}`);

  // Add user message to persistent history
  conversationHistory.push({ role: 'user', content: userMessage });

  console.log(`📝 Messages in history: ${conversationHistory.length}`);
  console.log('   Message structure:');
  conversationHistory.forEach((msg, i) => {
    const preview = msg.content ? msg.content.slice(0, 40) + '...' : '';
    const extras = [];
    if (msg.toolCallId) extras.push(`toolCallId: ${msg.toolCallId}`);
    if (msg.toolCalls) extras.push(`${msg.toolCalls.length} toolCalls`);
    const extrasStr = extras.length ? ` (${extras.join(', ')})` : '';
    console.log(`   ${i}: ${msg.role} - ${preview}${extrasStr}`);
  });

  try {
    console.log('\n🚀 Starting AI stream...');
    const startTime = Date.now();

    const generator = provider.chatStream({
      messages: conversationHistory,
      model: config.model,
      maxTokens: 1000,
      temperature: 0.7,
      tools: allTools,
    });

    let assistantContent = '';
    let toolCalls = [];
    let hasError = false;

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
        console.log(`   ID: ${chunk.toolCall.id}`);
        console.log(`   Args: ${JSON.stringify(chunk.toolCall.arguments).slice(0, 100)}...`);
      } else if (chunk.type === 'error') {
        console.log(`\n❌ STREAM ERROR: ${chunk.error}`);
        hasError = true;

        // Check if this is the specific MiniMax error user reported
        if (chunk.error.includes('invalid chat setting (2013)')) {
          console.log('\n🚨 THIS IS THE EXACT ERROR USER REPORTED!');
          console.log('   MiniMax API Error: "invalid chat setting (2013)"');
          console.log('   This suggests message format issues in the conversation history');

          console.log('\n📋 Full conversation history at time of error:');
          conversationHistory.forEach((msg, i) => {
            console.log(`\n   Message ${i}:`);
            console.log(`     Role: ${msg.role}`);
            console.log(`     Content: ${(msg.content || '').slice(0, 200)}...`);
            if (msg.toolCalls) {
              console.log(`     Tool Calls: ${msg.toolCalls.length}`);
              msg.toolCalls.forEach((tc, j) => {
                console.log(`       ${j}: ${tc.name} (ID: ${tc.id})`);
              });
            }
            if (msg.toolCallId) console.log(`     Tool Call ID: ${msg.toolCallId}`);
            if (msg.rawContent) console.log(`     Has Raw Content: ${typeof msg.rawContent}`);
          });

          return false; // Signal failure
        }
        break;
      }
    }

    if (hasError) {
      console.log(`\n❌ Chat ${chatNumber} FAILED due to stream error`);
      return false;
    }

    // Add assistant message with tool calls (exactly like App.tsx)
    if (toolCalls.length > 0) {
      const assistantMessage = {
        role: 'assistant',
        content: assistantContent,
        toolCalls: toolCalls
      };
      conversationHistory.push(assistantMessage);

      console.log(`\n🤖 Assistant: ${assistantContent.slice(0, 100)}...`);
      console.log(`   Added assistant message with ${toolCalls.length} tool calls`);

      // Execute tools and add results (exactly like App.tsx)
      for (const toolCall of toolCalls) {
        console.log(`\n⚙️  Executing: ${toolCall.name} (${toolCall.id})`);

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
        conversationHistory.push(toolMessage);
        console.log(`   ✅ Tool result added (${toolMessage.content.length} chars)`);
        console.log(`   Content preview: ${toolMessage.content.slice(0, 150)}...`);
      }
    } else {
      // No tool calls, just add assistant message
      conversationHistory.push({
        role: 'assistant',
        content: assistantContent
      });
      console.log(`\n🤖 Assistant: ${assistantContent.slice(0, 200)}...`);
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n✅ Chat ${chatNumber} SUCCEEDED in ${duration}s`);
    console.log(`📊 Final history size: ${conversationHistory.length} messages`);
    return true;

  } catch (error) {
    console.log(`\n❌ Chat ${chatNumber} FAILED with exception:`);
    console.log(`   Error: ${error.message}`);

    // Check if it's the specific MiniMax error
    if (error.message.includes('invalid chat setting (2013)')) {
      console.log('\n🚨 THIS IS THE EXACT ERROR USER REPORTED!');
      console.log('   MiniMax API Error: "invalid chat setting (2013)"');
      console.log('   Error occurred at request level, not during streaming');
    }

    return false;
  }
}

// Test sequence: Multiple consecutive chats like user would do
const testChats = [
  'list files in current directory',
  'search for react hooks documentation online',
  'read the package.json file',
  'search for typescript best practices',
  'show git status',
  'find react components in this project'
];

console.log(`\n🎯 Testing ${testChats.length} consecutive chats to reproduce the issue...\n`);

let successCount = 0;
let failedAt = -1;

for (let i = 0; i < testChats.length; i++) {
  const success = await simulateChat(i + 1, testChats[i]);

  if (success) {
    successCount++;
  } else {
    failedAt = i + 1;
    console.log(`\n💥 FAILURE DETECTED at Chat ${failedAt}!`);
    break;
  }

  // Small delay between chats
  await new Promise(resolve => setTimeout(resolve, 500));
}

await mcpManager.disconnectAll();

console.log(`\n${'='.repeat(60)}`);
console.log('📊 FINAL TEST RESULTS');
console.log(`${'='.repeat(60)}`);
console.log(`✅ Successful chats: ${successCount}`);
console.log(`❌ Failed at chat: ${failedAt === -1 ? 'None - All passed!' : failedAt}`);
console.log(`📈 Success rate: ${Math.round((successCount / testChats.length) * 100)}%`);

if (failedAt === -1) {
  console.log('\n🎉 CONCLUSION: Could not reproduce the "second chat always fails" issue');
  console.log('   All 6 consecutive chats completed successfully');
  console.log('   The issue may have been resolved by previous fixes');
} else {
  console.log('\n🔍 CONCLUSION: Issue reproduced! Check error details above');
  console.log('   The failure pattern matches user reports');
}

console.log('\n🏁 Test Complete');