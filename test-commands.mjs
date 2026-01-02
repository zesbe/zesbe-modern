#!/usr/bin/env node
import { SLASH_COMMANDS } from './dist/tui/components/CommandMenu.js';

console.log('🧪 Testing Command List After Removing /quit\n');

console.log('📋 All Available Slash Commands:');
console.log('═'.repeat(50));

// Group commands by category
const grouped = SLASH_COMMANDS.reduce((acc, cmd) => {
  const category = cmd.category || 'Other';
  if (!acc[category]) acc[category] = [];
  acc[category].push(cmd);
  return acc;
}, {});

Object.entries(grouped).forEach(([category, commands]) => {
  console.log(`\n📁 ${category}:`);
  commands.forEach(cmd => {
    console.log(`  /${cmd.name.padEnd(15)} - ${cmd.description}`);
  });
});

console.log('\n' + '═'.repeat(50));

// Check specifically for quit commands
const quitCommands = SLASH_COMMANDS.filter(cmd =>
  cmd.name.includes('quit') || cmd.description.toLowerCase().includes('quit')
);

console.log(`\n🔍 Commands containing 'quit': ${quitCommands.length}`);
if (quitCommands.length > 0) {
  console.log('❌ ERROR: quit commands still found:');
  quitCommands.forEach(cmd => {
    console.log(`  /${cmd.name} - ${cmd.description}`);
  });
} else {
  console.log('✅ SUCCESS: No quit commands found');
}

// Check exit commands
const exitCommands = SLASH_COMMANDS.filter(cmd =>
  cmd.name.includes('exit') || cmd.description.toLowerCase().includes('exit')
);

console.log(`\n🚪 Exit commands available: ${exitCommands.length}`);
exitCommands.forEach(cmd => {
  console.log(`  /${cmd.name} - ${cmd.description}`);
});

console.log('\n✅ Command cleanup test completed!');