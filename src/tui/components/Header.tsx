import React from "react";
import { Box, Text } from "ink";

export interface HeaderProps {
  provider: string;
  model: string;
  yolo?: boolean;
}

export function Header({ provider, model, yolo = true }: HeaderProps) {
  return (
    <Box
      borderStyle="single"
      borderColor="cyan"
      paddingX={2}
      justifyContent="space-between"
    >
      <Box>
        <Text bold color="cyan">
          zesbe
        </Text>
        <Text dimColor> modern</Text>
      </Box>
      <Box>
        <Text color="green">{provider}</Text>
        <Text dimColor> / </Text>
        <Text color="yellow">{model}</Text>
        {yolo && (
          <>
            <Text dimColor> | </Text>
            <Text color="magenta">YOLO</Text>
          </>
        )}
      </Box>
    </Box>
  );
}
