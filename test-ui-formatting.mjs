#!/usr/bin/env node
import { mcpManager } from './dist/mcp/index.js';
import { getProvider } from './dist/ai/index.js';
import { TOOL_DEFINITIONS, executeTool } from './dist/tools/index.js';
import { loadConfig, CODING_SYSTEM_PROMPT } from './dist/config/index.js';

console.log('🎨 Testing UI Formatting Improvements\n');

await mcpManager.initialize();
const mcpTools = mcpManager.getTools();
const allTools = [...TOOL_DEFINITIONS, ...mcpTools];

const config = await loadConfig();
const provider = await getProvider();

console.log(`📋 Testing with: ${config.provider} | ${config.model}\n`);

// Simulate App.tsx welcome message format
const connectedServers = mcpManager.getConnectedServers();

const welcomeMessage = `**Welcome to zesbe-modern! 🚀**

I'm your AI coding assistant powered by **${config.provider}**. I can help you with:

* Writing and editing code
* Debugging and troubleshooting
* Reading and analyzing files
* Running terminal commands (git, npm, etc)
* Searching for documentation online
* Analyzing project structure

**Current Configuration:**
Provider: **${config.provider}** | Model: **${config.model}**
YOLO mode: **${config.yolo ? "ON" : "OFF"}**
MCP Servers: **${connectedServers.length > 0 ? connectedServers.join(", ") : "None"}**

Type **/help** for commands or just start chatting! 💻`;

console.log('📋 Welcome Message Preview (how it will look in TUI):');
console.log('='.repeat(70));

// Simple markdown preview (simulate what the new Message component will render)
const lines = welcomeMessage.split('\n');
lines.forEach(line => {
  if (line.trim() === '') {
    console.log('');
    return;
  }

  if (line.trim().startsWith('* ')) {
    const text = line.replace(/^\s*\*\s+/, '');
    console.log(`  • ${text}`);
    return;
  }

  if (line.includes('**')) {
    // Simulate bold text (can't do actual bold in terminal preview)
    const formatted = line.replace(/\*\*(.*?)\*\*/g, '[$1]');
    console.log(formatted);
    return;
  }

  console.log(line);
});

console.log('='.repeat(70));

console.log('\n🎯 Test simple chat interaction:');

const messages = [
  { role: 'system', content: CODING_SYSTEM_PROMPT },
  { role: 'user', content: 'list files in current directory' }
];

try {
  console.log('\n────────────────────────────────────────────────────────────────────────');
  console.log('\n👤 You 10:25:30 PM');
  console.log('   list files in current directory');
  console.log('\n────────────────────────────────────────────────────────────────────────');

  const generator = provider.chatStream({
    messages: messages,
    model: config.model,
    maxTokens: 500,
    temperature: 0.7,
    tools: allTools,
  });

  let assistantContent = '';
  let toolCalls = [];
  const startTime = Date.now();

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
      console.log(`\n[Tool call: ${chunk.toolCall.name}]`);
      break; // Just show one tool call for demo
    }
  }

  const duration = (Date.now() - startTime) / 1000;

  console.log(`\n\n🤖 AI 10:25:${30 + Math.floor(duration)} PM (${duration.toFixed(1)}s)`);
  console.log(`   ${assistantContent || "I'll list the files in your current directory."}`);

  if (toolCalls.length > 0) {
    console.log('\n🔧 Tool');
    console.log(`   Executed: ${toolCalls[0].name}`);

    // Quick tool execution
    const result = await executeTool(toolCalls[0].name, toolCalls[0].arguments);
    const output = result.success ? result.output.slice(0, 200) + '...' : `Error: ${result.error}`;
    console.log(`   Result: ${output}`);
  }

  console.log('\n✅ UI formatting preview complete!');
  console.log('\nKey improvements:');
  console.log('• Proper markdown parsing for **bold** text');
  console.log('• Clean bullet point formatting');
  console.log('• Separator lines for user messages (like Claude Code)');
  console.log('• Consistent spacing and alignment');
  console.log('• Professional welcome message');

} catch (error) {
  console.log(`\n❌ Test failed: ${error.message}`);
}

await mcpManager.disconnectAll();
console.log('\n🏁 Test Complete');