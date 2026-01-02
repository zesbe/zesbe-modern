#!/usr/bin/env node

import { spawn } from "child_process";
import { setTimeout } from "timers/promises";

async function testLongChatWithGlitchMonitoring() {
  console.log("🔍 TESTING LONG CHAT SESSION WITH GLITCH MONITORING...\n");

  const child = spawn("node", ["dist/index.js", "--console"], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"]
  });

  let outputBuffer = "";
  let errorBuffer = "";
  let glitchDetected = false;
  let responseCount = 0;

  // Monitor stdout for normal output
  child.stdout.on("data", (data) => {
    const output = data.toString();
    outputBuffer += output;
    process.stdout.write(output);
    
    // Check for response completion
    if (output.includes("❯")) {
      responseCount++;
    }
  });

  // Monitor stderr for errors/glitches
  child.stderr.on("data", (data) => {
    const error = data.toString();
    errorBuffer += error;
    
    console.log("\n🚨 GLITCH/ERROR DETECTED:");
    console.log(error);
    
    if (error.includes("React") || error.includes("hooks") || error.includes("Error")) {
      glitchDetected = true;
    }
  });

  // Wait for startup
  await setTimeout(3000);
  console.log("\n📝 Sending complex prompt that should use MCP tools...\n");

  // Send complex prompt that should trigger MCP
  const complexPrompt = "Carikan dokumentasi lengkap tentang React Server Components terbaru di internet, lalu analisis step-by-step implementasinya dengan contoh code yang praktis. Setelah itu cari juga dokumentasi Next.js 14 App Router dan bandingkan dengan pendekatan sebelumnya.\n";
  
  child.stdin.write(complexPrompt);

  // Monitor for 20 seconds
  console.log("⏱️ Monitoring for 20 seconds...");
  
  let monitorTime = 0;
  const interval = setInterval(() => {
    monitorTime++;
    console.log(`\n📊 ${monitorTime}s - Responses: ${responseCount} | Glitches: ${glitchDetected ? "YES" : "NO"}`);
    
    if (monitorTime >= 20) {
      clearInterval(interval);
      
      // Exit command
      child.stdin.write("/exit\n");
      
      setTimeout(2000).then(() => {
        console.log("\n🎯 FINAL RESULTS:");
        console.log(`Total responses: ${responseCount}`);
        console.log(`Glitches detected: ${glitchDetected ? "❌ YES" : "✅ NO"}`);
        console.log(`Output length: ${outputBuffer.length} chars`);
        console.log(`Error length: ${errorBuffer.length} chars`);
        
        if (errorBuffer.length > 0) {
          console.log("\n🚨 ERROR LOG:");
          console.log(errorBuffer);
        }
        
        if (outputBuffer.includes("Tool called:") || outputBuffer.includes("mcp_")) {
          console.log("✅ MCP tools were used!");
        } else {
          console.log("⚠️ No MCP tool usage detected");
        }
        
        child.kill();
        process.exit(0);
      });
    }
  }, 1000);

  child.on("close", (code) => {
    console.log(`\n🏁 Process exited with code ${code}`);
    clearInterval(interval);
  });
}

testLongChatWithGlitchMonitoring();
