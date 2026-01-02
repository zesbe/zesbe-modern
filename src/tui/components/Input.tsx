import React, { useState, useMemo } from "react";
import { Box, Text, useStdout, useInput } from "ink";
import TextInput from "ink-text-input";
import { SLASH_COMMANDS } from "./CommandMenu";

export interface InputProps {
  onSubmit: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export function Input({ onSubmit, placeholder = "Type a message...", isLoading = false }: InputProps) {
  const [value, setValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { stdout } = useStdout();
  // Use terminal width minus 2 for border
  const terminalWidth = (stdout?.columns || 80) - 2;

  // Check if showing command menu
  const showingMenu = value.startsWith("/") && !isLoading;
  const filter = showingMenu ? value.slice(1) : "";

  // Filter commands based on input
  const filteredCommands = useMemo(() => {
    if (!showingMenu) return [];
    return SLASH_COMMANDS.filter(cmd =>
      cmd.name.toLowerCase().startsWith(filter.toLowerCase()) ||
      cmd.description.toLowerCase().includes(filter.toLowerCase())
    ).slice(0, 10);
  }, [showingMenu, filter]);

  // Handle keyboard for menu navigation
  useInput((input, key) => {
    if (!showingMenu || filteredCommands.length === 0) return;

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
    } else if (key.tab) {
      // Tab to autocomplete
      if (filteredCommands[selectedIndex]) {
        setValue("/" + filteredCommands[selectedIndex].name);
      }
    }
  }, { isActive: showingMenu });

  // Reset selection when filter changes
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  const handleSubmit = (val: string) => {
    if (val.trim() && !isLoading) {
      // If showing menu and Enter pressed, use selected command
      if (showingMenu && filteredCommands.length > 0 && val === "/" + filter) {
        const selectedCmd = filteredCommands[selectedIndex];
        if (selectedCmd) {
          // Check if command needs arguments
          if (selectedCmd.name.includes(" ")) {
            // Multi-word command, submit as-is
            onSubmit("/" + selectedCmd.name);
          } else {
            // Single command, might need args
            onSubmit("/" + selectedCmd.name);
          }
          setValue("");
          return;
        }
      }
      onSubmit(val.trim());
      setValue("");
    }
  };

  return (
    <Box flexDirection="column">
      {/* Command Menu */}
      {showingMenu && filteredCommands.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {/* Top separator */}
          <Text dimColor>{"─".repeat(Math.min(terminalWidth - 2, 75))}</Text>

          {/* Commands list */}
          {filteredCommands.map((cmd, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Box key={cmd.name} paddingLeft={2}>
                <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
                  {isSelected ? "❯ " : "  "}
                </Text>
                <Box width={22}>
                  <Text color={isSelected ? "cyan" : "green"} bold>
                    /{cmd.name}
                  </Text>
                </Box>
                <Text dimColor={!isSelected}>
                  {cmd.description}
                </Text>
                {cmd.category && cmd.category === "MCP" && (
                  <Text color="magenta" dimColor={!isSelected}> (MCP)</Text>
                )}
              </Box>
            );
          })}

          {filteredCommands.length < SLASH_COMMANDS.length && filter && (
            <Box paddingLeft={4}>
              <Text dimColor italic>
                {SLASH_COMMANDS.length - filteredCommands.length} more commands hidden (keep typing to filter)
              </Text>
            </Box>
          )}

          {/* Bottom separator */}
          <Text dimColor>{"─".repeat(Math.min(terminalWidth - 2, 75))}</Text>
        </Box>
      )}

      {/* Input box */}
      <Box
        borderStyle="round"
        borderColor={isLoading ? "gray" : "cyan"}
        paddingX={1}
        width={terminalWidth}
      >
        <Text color={isLoading ? "gray" : "cyan"}>{"❯ "}</Text>
        <Box flexGrow={1}>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder={isLoading ? "Waiting for response..." : placeholder}
          />
        </Box>
      </Box>

      {/* Hint when showing menu */}
      {showingMenu && filteredCommands.length > 0 && (
        <Box paddingLeft={2}>
          <Text dimColor>
            ↑↓ navigate • Enter select • Tab autocomplete
          </Text>
        </Box>
      )}
    </Box>
  );
}
