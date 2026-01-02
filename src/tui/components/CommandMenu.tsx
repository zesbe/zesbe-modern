import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";

export interface CommandItem {
  name: string;
  description: string;
  category?: string;
}

export interface CommandMenuProps {
  commands: CommandItem[];
  filter: string;
  onSelect: (command: string) => void;
  onCancel: () => void;
  visible: boolean;
}

// Define all available commands
export const SLASH_COMMANDS: CommandItem[] = [
  // General
  { name: "help", description: "Show all available commands", category: "General" },
  { name: "clear", description: "Clear conversation history", category: "General" },
  { name: "exit", description: "Exit the application", category: "General" },

  // Coding
  { name: "plan", description: "Generate a coding plan for a task", category: "Coding" },
  { name: "tools", description: "List all available AI tools", category: "Coding" },

  // Research
  { name: "search", description: "Quick web search", category: "Research" },

  // Provider & Model
  { name: "provider", description: "Show/change AI provider", category: "Provider" },
  { name: "provider list", description: "List all available providers", category: "Provider" },
  { name: "provider set", description: "Switch to a different provider", category: "Provider" },
  { name: "model", description: "Show current model", category: "Model" },
  { name: "model set", description: "Change the AI model", category: "Model" },

  // MCP
  { name: "mcp", description: "List MCP servers & status", category: "MCP" },
  { name: "mcp tools", description: "List all MCP tools", category: "MCP" },
  { name: "mcp toggle", description: "Enable/disable MCP server", category: "MCP" },
  { name: "mcp reconnect", description: "Reconnect all MCP servers", category: "MCP" },
  { name: "mcp add", description: "Add new MCP server", category: "MCP" },
  { name: "mcp remove", description: "Remove MCP server", category: "MCP" },

  // History
  { name: "history", description: "List saved sessions", category: "History" },
  { name: "history clear", description: "Delete all history", category: "History" },

  // Settings
  { name: "yolo", description: "Toggle YOLO mode (auto-execute tools)", category: "Settings" },
  { name: "thinking", description: "Toggle thinking display", category: "Settings" },
  { name: "config", description: "Show current configuration", category: "Settings" },
];

export function CommandMenu({ commands, filter, onSelect, onCancel, visible }: CommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter commands based on input
  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().startsWith(filter.toLowerCase()) ||
    cmd.description.toLowerCase().includes(filter.toLowerCase())
  );

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Handle keyboard input
  useInput((input, key) => {
    if (!visible) return;

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
    } else if (key.return && filteredCommands.length > 0) {
      onSelect(filteredCommands[selectedIndex].name);
    } else if (key.escape) {
      onCancel();
    }
  }, { isActive: visible });

  if (!visible || filteredCommands.length === 0) {
    return null;
  }

  // Show max 8 commands
  const visibleCommands = filteredCommands.slice(0, 8);
  const hasMore = filteredCommands.length > 8;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Separator line */}
      <Text dimColor>{"─".repeat(75)}</Text>

      {/* Commands list */}
      {visibleCommands.map((cmd, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={cmd.name} paddingLeft={2}>
            <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
              {isSelected ? "❯ " : "  "}
            </Text>
            <Box width={20}>
              <Text color={isSelected ? "cyan" : "green"} bold>
                /{cmd.name}
              </Text>
            </Box>
            <Text dimColor={!isSelected}>
              {cmd.description}
            </Text>
          </Box>
        );
      })}

      {hasMore && (
        <Box paddingLeft={4}>
          <Text dimColor italic>
            ... and {filteredCommands.length - 8} more (keep typing to filter)
          </Text>
        </Box>
      )}

      {/* Bottom separator */}
      <Text dimColor>{"─".repeat(75)}</Text>
    </Box>
  );
}
