import React from "react";
import { Box, Text } from "ink";
import InkSpinner from "ink-spinner";

export type ActivityType =
  | "thinking"
  | "streaming"
  | "tool_call"
  | "read"
  | "write"
  | "edit"
  | "bash"
  | "search"
  | "idle";

export interface ActivityProps {
  type: ActivityType;
  detail?: string;
  isActive?: boolean;
}

const ACTIVITY_CONFIG: Record<ActivityType, { icon: string; color: string; label: string }> = {
  thinking: { icon: "●", color: "yellow", label: "Thinking" },
  streaming: { icon: "●", color: "cyan", label: "Streaming" },
  tool_call: { icon: "●", color: "magenta", label: "Tool" },
  read: { icon: "●", color: "blue", label: "Read" },
  write: { icon: "●", color: "green", label: "Write" },
  edit: { icon: "●", color: "yellow", label: "Edit" },
  bash: { icon: "●", color: "red", label: "Bash" },
  search: { icon: "●", color: "cyan", label: "Search" },
  idle: { icon: "○", color: "gray", label: "Idle" },
};

export function Activity({ type, detail, isActive = true }: ActivityProps) {
  const config = ACTIVITY_CONFIG[type];

  if (type === "idle" || !isActive) {
    return null;
  }

  return (
    <Box>
      <Text color={config.color}>
        {isActive ? <InkSpinner type="dots" /> : config.icon}
      </Text>
      <Text color={config.color} bold>
        {" "}{config.label}
      </Text>
      {detail && (
        <Text dimColor>
          ({detail})
        </Text>
      )}
    </Box>
  );
}

// Activity indicator for tool execution
export function ToolActivity({
  toolName,
  args
}: {
  toolName: string;
  args?: Record<string, unknown>;
}) {
  // Map tool names to activity types
  const typeMap: Record<string, ActivityType> = {
    read_file: "read",
    write_file: "write",
    list_directory: "read",
    run_command: "bash",
    search_files: "search",
  };

  const activityType = typeMap[toolName] || "tool_call";

  // Extract relevant detail from args
  let detail = "";
  if (args) {
    if (args.path) detail = String(args.path).split("/").pop() || "";
    else if (args.command) detail = String(args.command).slice(0, 30);
    else if (args.pattern) detail = String(args.pattern);
  }

  return (
    <Box marginY={0}>
      <Text color={ACTIVITY_CONFIG[activityType].color}>● </Text>
      <Text color={ACTIVITY_CONFIG[activityType].color} bold>
        {toolName.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
      </Text>
      {detail && (
        <Text dimColor>({detail})</Text>
      )}
    </Box>
  );
}

// Streaming activity with content preview
export function StreamingActivity({
  isThinking,
  contentLength
}: {
  isThinking: boolean;
  contentLength: number;
}) {
  return (
    <Box>
      <Text color={isThinking ? "yellow" : "cyan"}>
        <InkSpinner type="dots" />
      </Text>
      <Text color={isThinking ? "yellow" : "cyan"} bold>
        {" "}{isThinking ? "Thinking" : "Streaming"}
      </Text>
      {contentLength > 0 && (
        <Text dimColor> ({contentLength} chars)</Text>
      )}
    </Box>
  );
}
