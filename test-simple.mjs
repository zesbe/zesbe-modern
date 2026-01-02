#!/usr/bin/env node
import { spawn } from 'child_process';

console.log('🧪 Simple Test: Starting zesbe-modern and monitoring for errors...\n');

const child = spawn('node', ['dist/index.js'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env
});

let hasErrors = false;

child.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('📤 STDOUT:', output.trim());
});

child.stderr.on('data', (data) => {
  const error = data.toString();
  console.error('❌ STDERR:', error.trim());
  hasErrors = true;
});

child.on('close', (code) => {
  console.log(`\n🔚 Process exited with code ${code}`);
  console.log(`📊 Errors detected: ${hasErrors ? 'YES' : 'NO'}`);
});

child.on('error', (err) => {
  console.error('💥 Process error:', err.message);
  hasErrors = true;
});

// Let it run for 10 seconds, then terminate
setTimeout(() => {
  console.log('\n⏰ Test timeout - terminating process');
  child.kill('SIGTERM');

  setTimeout(() => {
    child.kill('SIGKILL');
    process.exit(hasErrors ? 1 : 0);
  }, 2000);
}, 10000);