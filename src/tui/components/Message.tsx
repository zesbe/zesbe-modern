import React from "react";
import { Box, Text } from "ink";

export interface MessageProps {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp?: Date;
  elapsed?: number; // Response time in ms
}

// Parse simple markdown for Ink Text components
function parseMarkdown(content: string) {
  const lines = content.split('\n');
  const result: React.ReactElement[] = [];

  lines.forEach((line, index) => {
    if (line.trim() === '') {
      result.push(<Text key={`empty-${index}`}> </Text>);
      return;
    }

    // Handle bullet points
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      const text = line.replace(/^\s*[*-]\s+/, '');
      result.push(
        <Box key={`bullet-${index}`} marginLeft={2}>
          <Text dimColor>• </Text>
          <Text>{text}</Text>
        </Box>
      );
      return;
    }

    // Handle **bold** text
    if (line.includes('**')) {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const elements: React.ReactElement[] = [];

      parts.forEach((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          elements.push(
            <Text key={`bold-${index}-${partIndex}`} bold color="cyan">
              {part.slice(2, -2)}
            </Text>
          );
        } else if (part) {
          elements.push(
            <Text key={`normal-${index}-${partIndex}`}>{part}</Text>
          );
        }
      });

      result.push(
        <Box key={`mixed-${index}`}>
          {elements}
        </Box>
      );
      return;
    }

    // Regular line
    result.push(<Text key={`line-${index}`}>{line}</Text>);
  });

  return result;
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

  // Claude Code style separator line for user messages
  const showTopSeparator = role === "user";
  const showBottomSeparator = role === "user";

  return (
    <Box flexDirection="column" marginY={0}>
      {/* Top separator for user messages */}
      {showTopSeparator && (
        <Box>
          <Text dimColor>────────────────────────────────────────────────────────────────────────</Text>
        </Box>
      )}

      {/* Message header */}
      <Box marginTop={role === "user" ? 1 : 0}>
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

      {/* Message content with proper formatting */}
      <Box flexDirection="column" marginLeft={role === "system" ? 0 : 3} marginTop={0} marginBottom={1}>
        {role === "system" ? (
          <Box flexDirection="column">
            {parseMarkdown(content)}
          </Box>
        ) : (
          <Text>{content}</Text>
        )}
      </Box>

      {/* Bottom separator for user messages */}
      {showBottomSeparator && (
        <Box>
          <Text dimColor>────────────────────────────────────────────────────────────────────────</Text>
        </Box>
      )}
    </Box>
  );
}
