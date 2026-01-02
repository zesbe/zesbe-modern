#!/usr/bin/env node

import { getProvider } from "./dist/ai/index.js";
import { mcpManager } from "./dist/mcp/index.js";
import { loadConfig, CODING_SYSTEM_PROMPT } from "./dist/config/index.js";
import { TOOL_DEFINITIONS } from "./dist/tools/index.js";

async function testMCPWithAI() {
  console.log("🤖 Testing MCP Tools with AI Chat...\n");

  try {
    // Initialize MCP and config
    await mcpManager.initialize();
    const config = await loadConfig();
    const provider = await getProvider();

    // Get all tools (built-in + MCP)
    const mcpTools = mcpManager.getTools();
    const allTools = [...TOOL_DEFINITIONS, ...mcpTools];

    console.log(`📋 Total tools available: ${allTools.length} (Built-in: ${TOOL_DEFINITIONS.length}, MCP: ${mcpTools.length})`);

    // Test prompt that should trigger MCP tools
    const testPrompt = "Carikan dokumentasi React hooks terbaru, lalu analisis step-by-step cara penggunaannya";

    console.log(`\n💬 Testing prompt: "${testPrompt}"`);
    console.log("🔄 Sending to AI with MCP tools enabled...\n");

    const messages = [
      { role: "system", content: CODING_SYSTEM_PROMPT },
      { role: "user", content: testPrompt }
    ];

    // Make AI call with YOLO mode (tools enabled)
    const generator = provider.chatStream({
      messages,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      tools: allTools, // Include MCP tools
    });

    let toolCallsFound = false;
    let mcpToolUsed = false;
    let responseText = "";

    for await (const chunk of generator) {
      if (chunk.type === "text" && chunk.content) {
        responseText += chunk.content;
        process.stdout.write(chunk.content);
      } else if (chunk.type === "tool_call" && chunk.toolCall) {
        toolCallsFound = true;
        const toolName = chunk.toolCall.name;

        console.log(`\n🔧 Tool called: ${toolName}`);

        if (toolName.startsWith("mcp_")) {
          mcpToolUsed = true;
          console.log("✅ MCP Tool detected!");

          try {
            const result = await mcpManager.callTool(toolName, chunk.toolCall.arguments);
            console.log(`📄 MCP Result length: ${result.length} chars`);
            console.log(`📄 Preview: ${result.substring(0, 150)}...`);
          } catch (err) {
            console.log(`❌ MCP Tool failed: ${err.message}`);
          }
        }
      } else if (chunk.type === "error") {
        console.log(`\n❌ Error: ${chunk.error}`);
        break;
      }
    }

    console.log(`\n\n📊 Test Summary:`);
    console.log(`✅ AI Response generated: ${responseText.length > 0}`);
    console.log(`✅ Tool calls made: ${toolCallsFound}`);
    console.log(`✅ MCP tools used: ${mcpToolUsed}`);
    console.log(`🎯 MCP Integration Status: ${mcpToolUsed ? "✅ WORKING PERFECTLY" : "⚠️  NO MCP TOOLS USED"}`);

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    await mcpManager.disconnectAll();
    console.log("\n🔌 Test completed, MCP disconnected");
  }
}

testMCPWithAI();
