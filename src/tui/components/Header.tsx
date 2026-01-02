import React from "react";
import { Box, Text, useStdout } from "ink";

export interface HeaderProps {
  provider: string;
  model: string;
  yolo?: boolean;
  mcpServers?: string[];
}

export function Header({ provider, model, yolo = true, mcpServers = [] }: HeaderProps) {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;
  const boxWidth = Math.min(terminalWidth - 4, 100);

  // ASCII Art Logo
  const logo = `
 ███████╗███████╗███████╗██████╗ ███████╗
 ╚══███╔╝██╔════╝██╔════╝██╔══██╗██╔════╝
   ███╔╝ █████╗  ███████╗██████╔╝█████╗
  ███╔╝  ██╔══╝  ╚════██║██╔══██╗██╔══╝
 ███████╗███████╗███████║██████╔╝███████╗
 ╚══════╝╚══════╝╚══════╝╚═════╝ ╚══════╝`;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Logo */}
      <Box justifyContent="center">
        <Text color="cyan" bold>
          {logo}
        </Text>
      </Box>

      {/* Subtitle */}
      <Box justifyContent="center" marginTop={0}>
        <Text dimColor>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
      </Box>
      <Box justifyContent="center">
        <Text color="white" bold>
          Modern AI CLI
        </Text>
        <Text dimColor> • </Text>
        <Text color="cyan">Powered by MCP</Text>
      </Box>
      <Box justifyContent="center" marginBottom={1}>
        <Text dimColor>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
      </Box>

      {/* Status Bar */}
      <Box
        borderStyle="round"
        borderColor="gray"
        paddingX={2}
        paddingY={0}
        justifyContent="space-between"
        width={boxWidth}
      >
        <Box>
          <Text color="green" bold>⚡ </Text>
          <Text color="green">{provider}</Text>
          <Text dimColor> → </Text>
          <Text color="yellow">{model}</Text>
        </Box>
        <Box>
          {yolo && (
            <>
              <Text color="magenta" bold>🚀 YOLO</Text>
              <Text dimColor> │ </Text>
            </>
          )}
          <Text color="cyan">🔌 MCP: </Text>
          <Text color={mcpServers.length > 0 ? "green" : "gray"}>
            {mcpServers.length > 0 ? mcpServers.length + " servers" : "none"}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
