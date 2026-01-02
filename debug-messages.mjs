#!/usr/bin/env node
import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';

console.log('🐛 DEBUGGING: Message persistence in zesbe-modern TUI\n');

const child = spawn('node', ['dist/index.js'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env
});

let outputBuffer = '';
let chatCount = 0;

child.stdout.on('data', (data) => {
  const output = data.toString();
  outputBuffer += output;

  // Look for user message patterns
  const userMessages = output.match(/You:/g) || [];
  const aiResponses = output.match(/🤖 AI:|AI:/g) || [];

  if (userMessages.length > 0 || aiResponses.length > 0) {
    console.log(`📊 Messages detected - User: ${userMessages.length}, AI: ${aiResponses.length}`);
    console.log('📤 Recent output:', output.slice(-200));
  }
});

child.stderr.on('data', (data) => {
  console.error('❌ STDERR:', data.toString().trim());
});

async function sendTestMessages() {
  try {
    // Wait for startup
    await delay(2000);

    // Send test messages
    const testMessages = [
      'Hello, this is message 1',
      'This is message 2',
      'This is message 3',
      'Can you see all my previous messages?'
    ];

    for (let i = 0; i < testMessages.length; i++) {
      const msg = testMessages[i];
      console.log(`\n📝 Sending message ${i + 1}: "${msg}"`);

      child.stdin.write(msg + '\n');

      // Wait between messages
      await delay(3000);

      // Check current buffer for persistence
      const userMsgCount = (outputBuffer.match(/You:/g) || []).length;
      console.log(`📊 Total user messages visible: ${userMsgCount}`);
      console.log(`🔍 Expected: ${i + 1}, Actual: ${userMsgCount}`);

      if (userMsgCount < i + 1) {
        console.error(`❌ BUG DETECTED: Missing ${(i + 1) - userMsgCount} user messages!`);
      }
    }

    console.log('\n📋 FINAL ANALYSIS:');
    const finalUserCount = (outputBuffer.match(/You:/g) || []).length;
    console.log(`Total user messages sent: ${testMessages.length}`);
    console.log(`Total user messages visible: ${finalUserCount}`);
    console.log(`Messages lost: ${testMessages.length - finalUserCount}`);

  } catch (error) {
    console.error('💥 Test error:', error.message);
  } finally {
    console.log('\n🔚 Terminating test...');
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 1000);
  }
}

sendTestMessages();