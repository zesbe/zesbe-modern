#!/usr/bin/env node

import { mcpManager, loadMCPConfig } from "./dist/mcp/index.js";

async function testMCPFunctionality() {
  console.log("🔧 Testing MCP Functionality...\n");

  try {
    // Test MCP initialization
    console.log("1. Initializing MCP servers...");
    await mcpManager.initialize();

    const connectedServers = mcpManager.getConnectedServers();
    console.log(`✅ Connected servers: ${connectedServers.length > 0 ? connectedServers.join(", ") : "None"}`);

    // Test available tools
    const tools = mcpManager.getTools();
    console.log(`✅ Available MCP tools: ${tools.length}`);

    if (tools.length > 0) {
      console.log("\n📋 MCP Tools List:");
      tools.forEach((tool, i) => {
        console.log(`  ${i + 1}. ${tool.name} - ${tool.description || "No description"}`);
      });
    }

    // Test if we can call a specific MCP tool
    console.log("\n🧪 Testing tool call...");

    // Try to find context7 tools
    const context7Tools = tools.filter(t => t.name.includes('context7') || t.name.includes('query') || t.name.includes('resolve'));

    if (context7Tools.length > 0) {
      console.log(`Found Context7 tools: ${context7Tools.map(t => t.name).join(", ")}`);

      // Test resolve-library-id if available
      const resolveLibraryTool = context7Tools.find(t => t.name.includes('resolve-library-id'));
      if (resolveLibraryTool) {
        console.log("\n🔍 Testing resolve-library-id...");
        try {
          const result = await mcpManager.callTool(resolveLibraryTool.name, {
            libraryName: "react",
            query: "React hooks documentation and examples"
          });
          console.log("✅ MCP tool call successful!");
          console.log("📄 Result preview:", result.substring(0, 200) + "...");
        } catch (err) {
          console.log("❌ MCP tool call failed:", err.message);
        }
      }
    } else {
      console.log("⚠️  No Context7 tools found");
    }

    // Test sequential thinking tools
    const thinkingTools = tools.filter(t => t.name.includes('thinking') || t.name.includes('sequential'));
    if (thinkingTools.length > 0) {
      console.log(`\nFound Sequential Thinking tools: ${thinkingTools.map(t => t.name).join(", ")}`);
    }

    // Test exa tools
    const exaTools = tools.filter(t => t.name.includes('exa') || t.name.includes('search'));
    if (exaTools.length > 0) {
      console.log(`\nFound Exa tools: ${exaTools.map(t => t.name).join(", ")}`);
    }

    // Test memory tools
    const memoryTools = tools.filter(t => t.name.includes('memory') || t.name.includes('entity') || t.name.includes('graph'));
    if (memoryTools.length > 0) {
      console.log(`\nFound Memory tools: ${memoryTools.map(t => t.name).join(", ")}`);
    }

    console.log(`\n🎯 MCP Status: ${connectedServers.length > 0 && tools.length > 0 ? "✅ FUNCTIONAL" : "❌ NOT WORKING"}`);

  } catch (error) {
    console.error("❌ MCP Test Failed:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    // Disconnect to clean up
    await mcpManager.disconnectAll();
    console.log("\n🔌 Disconnected MCP servers");
  }
}

testMCPFunctionality();