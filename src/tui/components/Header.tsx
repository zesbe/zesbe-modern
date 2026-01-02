import React from "react";
import { Box, Text } from "ink";

export interface HeaderProps {
  provider: string;
  model: string;
}

// Simple header like Claude Code
export function Header({ provider, model }: HeaderProps) {
  return (
    <Box marginBottom={1}>
      <Text color="cyan" bold>zesbe</Text>
      <Text dimColor> v1.0.0 </Text>
      <Text dimColor>(</Text>
      <Text color="yellow">{provider}</Text>
      <Text dimColor>/</Text>
      <Text color="green">{model}</Text>
      <Text dimColor>)</Text>
    </Box>
  );
}

// Status bar to show at the bottom
export interface StatusBarProps {
  provider: string;
  model: string;
  yolo?: boolean;
  mcpServers?: string[];
}

export function StatusBar({ provider, model, yolo = true, mcpServers = [] }: StatusBarProps) {
  return (
    <Box marginTop={1}>
      <Text dimColor>───────────────────────────────────────────────────────────────────────</Text>
    </Box>
  );
}

// Compact status line
export function StatusLine({ provider, model, yolo = true, mcpServers = [] }: StatusBarProps) {
  return (
    <Box>
      <Text dimColor>[ </Text>
      <Text color="green">{provider}</Text>
      <Text dimColor>:</Text>
      <Text color="yellow">{model}</Text>
      {yolo && (
        <>
          <Text dimColor> | </Text>
          <Text color="magenta">YOLO</Text>
        </>
      )}
      {mcpServers.length > 0 && (
        <>
          <Text dimColor> | </Text>
          <Text color="cyan">MCP:{mcpServers.length}</Text>
        </>
      )}
      <Text dimColor> ]</Text>
    </Box>
  );
}
