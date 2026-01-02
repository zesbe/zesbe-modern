import React from "react";
import { Box, Text } from "ink";

export interface HeaderProps {
  provider: string;
  model: string;
}

// Header with ASCII logo
export function Header({ provider, model }: HeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* ASCII Logo */}
      <Box justifyContent="center">
        <Text color="cyan" bold>
{`
 ███████╗███████╗███████╗██████╗ ███████╗
 ╚══███╔╝██╔════╝██╔════╝██╔══██╗██╔════╝
   ███╔╝ █████╗  ███████╗██████╔╝█████╗
  ███╔╝  ██╔══╝  ╚════██║██╔══██╗██╔══╝
 ███████╗███████╗███████║██████╔╝███████╗
 ╚══════╝╚══════╝╚══════╝╚═════╝ ╚══════╝`}
        </Text>
      </Box>

      {/* Subtitle */}
      <Box justifyContent="center">
        <Text dimColor>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
      </Box>
      <Box justifyContent="center">
        <Text color="white" bold>zesbe</Text>
        <Text dimColor> • Modern AI CLI</Text>
      </Box>
      <Box justifyContent="center" marginBottom={1}>
        <Text dimColor>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
      </Box>
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
