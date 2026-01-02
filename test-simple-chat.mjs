#!/usr/bin/env node

import { spawn } from "child_process";
import { setTimeout } from "timers/promises";

async function testSimpleChat() {
  console.log("🔧 TESTING SIMPLE CHAT - DEBUGGING AI HANG...\n");

  const child = spawn("node", ["dist/index.js", "--console"], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"]
  });

  let fullOutput = "";
  let aiStarted = false;
  let aiCompleted = false;

  child.stdout.on("data", (data) => {
    const output = data.toString();
    fullOutput += output;
    process.stdout.write(output);
    
    if (output.includes("🤖 AI:")) {
      aiStarted = true;
    }
    if (aiStarted && output.includes("❯")) {
      aiCompleted = true;
    }
  });

  child.stderr.on("data", (data) => {
    console.log("\n🚨 ERROR:", data.toString());
  });

  await setTimeout(3000);
  
  console.log("\n📝 Testing simple prompt first...");
  child.stdin.write("Hello, test message\n");

  // Monitor for 10 seconds
  for (let i = 1; i <= 10; i++) {
    await setTimeout(1000);
    console.log(`${i}s - AI Started: ${aiStarted} | AI Completed: ${aiCompleted}`);
    
    if (aiCompleted) {
      console.log("✅ AI responded successfully!");
      break;
    }
  }

  if (!aiCompleted) {
    console.log("❌ AI HANG DETECTED - No response after 10s");
    console.log("\n📋 Full Output:");
    console.log(fullOutput);
  }

  child.stdin.write("/exit\n");
  
  setTimeout(2000).then(() => {
    child.kill();
  });
}

testSimpleChat();
