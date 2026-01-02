#!/usr/bin/env node

import { getProvider } from "./dist/ai/index.js";
import { loadConfig } from "./dist/config/index.js";

async function debugAIHang() {
  console.log("🔍 DEBUGGING AI HANG ISSUE...\n");

  try {
    console.log("1. Loading config...");
    const config = await loadConfig();
    console.log(`✅ Config loaded: ${config.provider} / ${config.model}`);

    console.log("\n2. Getting AI provider...");
    const provider = await getProvider();
    console.log("✅ Provider loaded");

    console.log("\n3. Testing simple AI call WITHOUT tools...");
    
    const startTime = Date.now();
    console.log("⏱️ Starting request...");

    const generator = provider.chatStream({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello! Just say hi back briefly." }
      ],
      model: config.model,
      maxTokens: 100,
      temperature: 0.7,
      // NO TOOLS - test without MCP
    });

    let responseReceived = false;
    let fullResponse = "";

    for await (const chunk of generator) {
      const elapsed = Date.now() - startTime;
      
      if (chunk.type === "text" && chunk.content) {
        responseReceived = true;
        fullResponse += chunk.content;
        console.log(`📝 [${elapsed}ms] Received: ${chunk.content}`);
      } else if (chunk.type === "error") {
        console.log(`❌ [${elapsed}ms] Error: ${chunk.error}`);
        break;
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`\n🎯 RESULT:`);
    console.log(`Response received: ${responseReceived ? "✅ YES" : "❌ NO"}`);
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Response length: ${fullResponse.length} chars`);
    
    if (fullResponse.length > 0) {
      console.log(`Response preview: "${fullResponse.substring(0, 100)}"`);
    }

  } catch (error) {
    console.error("❌ Debug failed:", error.message);
    console.error("Stack:", error.stack);
  }
}

debugAIHang();
