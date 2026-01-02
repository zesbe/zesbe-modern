import React, { useState } from "react";
import { Box, Text, useStdout } from "ink";
import TextInput from "ink-text-input";

export interface InputProps {
  onSubmit: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export function Input({ onSubmit, placeholder = "Type a message...", isLoading = false }: InputProps) {
  const [value, setValue] = useState("");
  const { stdout } = useStdout();
  // Use terminal width minus 2 for border
  const terminalWidth = (stdout?.columns || 80) - 2;

  const handleSubmit = (val: string) => {
    if (val.trim() && !isLoading) {
      onSubmit(val.trim());
      setValue("");
    }
  };

  return (
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
  );
}
