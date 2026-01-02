#!/usr/bin/env node
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🧪 Testing zesbe-modern comprehensive functionality...\n');

async function sendMessage(process, message) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Message timeout'));
    }, 15000);

    const dataHandler = (data) => {
      const output = data.toString();
      console.log('📩 Output:', output.slice(0, 200) + (output.length > 200 ? '...' : ''));

      if (output.includes('❯') || output.includes('You:')) {
        clearTimeout(timeout);
        process.stdout.removeListener('data', dataHandler);
        process.stderr.removeListener('data', dataHandler);
        resolve(output);
      }
    };

    process.stdout.on('data', dataHandler);
    process.stderr.on('data', dataHandler);

    console.log(`📝 Sending: ${message}`);
    process.stdin.write(message + '\n');
  });
}

async function testChat() {
  console.log('🚀 Starting zesbe-modern...');

  const child = spawn('node', ['dist/index.js'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env
  });

  try {
    // Wait for startup
    await setTimeout(3000);

    console.log('\n📋 TEST 1: Simple greeting');
    await sendMessage(child, 'Hello, bagaimana kabar?');

    console.log('\n📋 TEST 2: Technical question');
    await sendMessage(child, 'Explain how JavaScript event loop works');

    console.log('\n📋 TEST 3: Code generation');
    await sendMessage(child, 'Write a simple function to calculate fibonacci');

    console.log('\n📋 TEST 4: Testing MCP tools');
    await sendMessage(child, 'Can you search for information about React hooks?');

    console.log('\n📋 TEST 5: Provider check');
    await sendMessage(child, '/provider');

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ ERROR during testing:', error.message);
  } finally {
    console.log('\n🔚 Terminating process...');
    child.kill('SIGTERM');

    // Force kill after 2 seconds
    setTimeout(() => {
      child.kill('SIGKILL');
    }, 2000);
  }
}

testChat().catch(console.error);