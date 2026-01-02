import React from "react";
import { Box, Text } from "ink";

export interface MessageProps {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp?: Date;
  elapsed?: number; // Response time in ms
}

export function Message({ role, content, timestamp, elapsed }: MessageProps) {
  const roleLabels = {
    user: "You",
    assistant: "AI",
    system: "System",
    tool: "Tool",
  };

  const roleIcons = {
    user: "👤",
    assistant: "🤖",
    system: "ℹ️",
    tool: "🔧",
  };

  const label = roleLabels[role];
  const icon = roleIcons[role];
  const time = timestamp ? new Date(timestamp).toLocaleTimeString() : "";

  // Format elapsed time
  const formatElapsed = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Box flexDirection="column" marginY={0}>
      <Box>
        <Text>{icon} </Text>
        <Text bold color={role === "user" ? "cyan" : role === "assistant" ? "green" : role === "tool" ? "magenta" : "yellow"}>
          {label}
        </Text>
        {time && (
          <Text dimColor> {time}</Text>
        )}
        {elapsed !== undefined && elapsed > 0 && (
          <Text dimColor color="gray"> ({formatElapsed(elapsed)})</Text>
        )}
      </Box>
      <Box marginLeft={3}>
        <Text>{content}</Text>
      </Box>
    </Box>
  );
}
