import React from "react";
import { Box, Text } from "ink";
import InkSpinner from "ink-spinner";

export interface SpinnerProps {
  text?: string;
}

export function Spinner({ text = "Thinking..." }: SpinnerProps) {
  return (
    <Box>
      <Text color="cyan">
        <InkSpinner type="dots" />
      </Text>
      <Text dimColor> {text}</Text>
    </Box>
  );
}
