import React from "react";
import { render } from "ink";
import { App } from "./App.js";

function isRawModeSupported(): boolean {
  try {
    return process.stdin && typeof process.stdin.setRawMode === 'function' && process.stdin.isTTY === true;
  } catch {
    return false;
  }
}

export function startTUI() {
  // Check if raw mode is supported before starting TUI
  if (!isRawModeSupported()) {
    console.error('❌ Error: This terminal does not support raw mode.');
    console.error('   Interactive TUI mode is not available.');
    console.error('   Try running commands directly like:');
    console.error('   • zesbe-modern config');
    console.error('   • zesbe-modern providers');
    console.error('   • zesbe-modern mcp list');
    process.exit(1);
  }

  const { waitUntilExit } = render(<App />);
  return waitUntilExit();
}

export { App } from "./App.js";
