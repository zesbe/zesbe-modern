import React from "react";
import { render } from "ink";
import { App } from "./App.js";

function isRawModeSupported(): boolean {
  try {
    // Enhanced terminal compatibility checks
    if (!process.stdin || !process.stdout) return false;

    // Check if running in a proper TTY
    if (!process.stdin.isTTY || !process.stdout.isTTY) return false;

    // Check if setRawMode function exists and is callable
    if (typeof process.stdin.setRawMode !== 'function') return false;

    // Try to detect problematic environments
    const term = process.env.TERM;
    const ci = process.env.CI;

    // Skip in CI environments or non-interactive terminals
    if (ci || term === 'dumb' || !term) return false;

    // Test if we can actually set raw mode (non-destructive test)
    const originalRawMode = process.stdin.isRaw;
    try {
      process.stdin.setRawMode(true);
      process.stdin.setRawMode(originalRawMode || false);
      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

export async function startTUI() {
  // Check if raw mode is supported before starting TUI
  if (!isRawModeSupported()) {
    console.error('❌ Ink TUI not supported in this terminal environment.');
    console.error('   Falling back to stable console mode...\n');

    // Import console mode dynamically to avoid circular imports
    const { startConsole } = await import('../console/index.js');
    return startConsole();
  }

  try {
    // Try to start Ink TUI with enhanced error handling
    const { waitUntilExit } = render(<App />);
    return waitUntilExit();
  } catch (error) {
    console.error('❌ TUI failed to start:', error instanceof Error ? error.message : 'Unknown error');
    console.error('   Falling back to console mode...\n');

    const { startConsole } = await import('../console/index.js');
    return startConsole();
  }
}

export { App } from "./App.js";
