import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { Header, Message, Input, Spinner, ToolActivity, StreamingActivity } from "./components";
import { getProvider, type Message as AIMessage, type StreamChunk } from "../ai";
import { loadConfig, saveConfig, listProviders, DEFAULT_PROVIDERS, CODING_SYSTEM_PROMPT, type Config } from "../config";
import { TOOL_DEFINITIONS, executeTools } from "../tools";
import { filterThinking, extractThinking, renderMarkdown } from "../utils";
import {
  createSession,
  addMessage,
  saveSession,
  listSessions,
  deleteSession,
  clearAllHistory,
  type ChatSession,
  type ChatMessage as HistoryMessage,
} from "../utils/history";
import {
  mcpManager,
  loadMCPConfig,
  listMCPServers,
  toggleMCPServer,
  removeMCPServer,
  addMCPServer,
  type MCPServerConfig,
} from "../mcp";

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: Date;
  thinking?: string;
  elapsed?: number; // Response time in ms
}

interface ActivityItem {
  type: "tool" | "streaming" | "thinking";
  name?: string;
  args?: Record<string, unknown>;
  timestamp: Date;
}

export function App() {
  const { exit } = useApp();
  const [config, setConfig] = useState<Config | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [showThinking, setShowThinking] = useState(false);

  // Activity tracking
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [currentActivity, setCurrentActivity] = useState<ActivityItem | null>(null);
  const [isThinkingPhase, setIsThinkingPhase] = useState(false);

  // MCP state
  const [mcpInitialized, setMcpInitialized] = useState(false);
  const [mcpTools, setMcpTools] = useState<any[]>([]);

  // Load config and create session on mount
  useEffect(() => {
    loadConfig().then(async (cfg) => {
      setConfig(cfg);
      setSession(createSession(cfg.provider, cfg.model));

      // Initialize MCP servers in background
      try {
        await mcpManager.initialize();
        const tools = mcpManager.getTools();
        setMcpTools(tools);
        setMcpInitialized(true);
        const connectedServers = mcpManager.getConnectedServers();

        // Welcome message with MCP status
        setMessages([{
          role: "system",
          content: `**Welcome to zesbe-modern! 🚀**

Provider: **${cfg.provider}** | Model: **${cfg.model}**
YOLO mode: **${cfg.yolo ? "ON" : "OFF"}**
MCP Servers: **${connectedServers.length > 0 ? connectedServers.join(", ") : "None connected"}**

Type /help for commands, /mcp for MCP management.
Tip: Ask me to search for documentation or help with coding.`,
          timestamp: new Date(),
        }]);
      } catch (err) {
        // Even if MCP fails, continue with welcome
        setMessages([{
          role: "system",
          content: `**Welcome to zesbe-modern! 🚀**

Provider: **${cfg.provider}** | Model: **${cfg.model}**
YOLO mode: **${cfg.yolo ? "ON" : "OFF"}**

Type /help for commands, or just start chatting!
Tip: Ask me to search for documentation or help with coding.`,
          timestamp: new Date(),
        }]);
      }
    });
  }, []);

  // Handle keyboard shortcuts
  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      // Save session before exit
      if (session && session.messages.length > 0) {
        saveSession(session);
      }
      exit();
    }
  });

  // Add activity to list
  const addActivity = useCallback((activity: ActivityItem) => {
    setActivities((prev) => [...prev.slice(-9), activity]); // Keep last 10
    setCurrentActivity(activity);
  }, []);

  // Handle slash commands
  const handleCommand = useCallback(
    async (cmd: string, args: string[]): Promise<boolean> => {
      if (!config) return false;

      switch (cmd) {
        case "exit":
        case "quit":
        case "q":
          if (session && session.messages.length > 0) {
            await saveSession(session);
          }
          exit();
          return true;

        case "clear":
          setMessages([]);
          setActivities([]);
          setSession(createSession(config.provider, config.model));
          return true;

        case "help":
          setMessages((prev) => [
            ...prev,
            {
              role: "system",
              content: `**📚 Available Commands:**

**General:**
• /exit, /quit, /q - Exit the app
• /clear - Clear chat & start new session
• /help - Show this help

**🔧 Coding:**
• /plan <task> - Generate a coding plan
• /tools - List all 25+ tools

**🔍 Research:**
• /search <query> - Quick web search

**⚙️ Provider & Model:**
• /provider - Show current provider
• /provider list - List all providers
• /provider set <name> - Switch provider
• /model - Show current model
• /model set <name> - Switch model

**🔌 MCP (Model Context Protocol):**
• /mcp - List MCP servers & status
• /mcp tools - List all MCP tools
• /mcp toggle <name> - Enable/disable server
• /mcp reconnect - Reconnect all servers
• /mcp add <name> - Add new server (shows instructions)
• /mcp remove <name> - Remove server

**📜 History:**
• /history - List saved sessions
• /history clear - Delete all history

**🎛️ Settings:**
• /yolo - Toggle YOLO mode (auto-execute tools)
• /thinking - Toggle thinking display
• /config - Show current config

**🛠️ Available AI Tools:**
• **Git:** git_status, git_diff, git_log, git_commit, git_branch, git_stash, git_add, git_reset
• **Files:** read_file, write_file, edit_file, list_directory, search_code, glob_files
• **Dev:** analyze_project, package_manager, run_tests, lint_code, build_project, format_code
• **Security:** audit_security, env_info
• **Code Nav:** find_definition, find_references, tree, diff_files, batch_edit
• **Web:** web_search, web_fetch
• **MCP:** Tools from connected MCP servers (use /mcp tools to list)

**💡 Tips:**
• Ask AI to "search for X documentation" for web lookup
• Use YOLO mode for hands-free tool execution
• Say "analyze this project" for project overview
• Say "check security" for vulnerability scan
• MCP servers extend AI capabilities with more tools`,
              timestamp: new Date(),
            },
          ]);
          return true;

        case "provider":
          if (args[0] === "list") {
            const providers = listProviders()
              .map((p) => `• ${p} - ${DEFAULT_PROVIDERS[p].model}`)
              .join("\n");
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `**Available Providers:**\n\n${providers}`,
                timestamp: new Date(),
              },
            ]);
          } else if (args[0] === "set" && args[1]) {
            const newProvider = args[1].toLowerCase();
            if (!DEFAULT_PROVIDERS[newProvider]) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `Unknown provider: ${newProvider}\nUse /provider list to see available providers.`,
                  timestamp: new Date(),
                },
              ]);
            } else {
              const newConfig = {
                ...config,
                provider: newProvider,
                model: DEFAULT_PROVIDERS[newProvider].model,
                baseUrl: DEFAULT_PROVIDERS[newProvider].baseUrl,
              };
              await saveConfig(newConfig);
              setConfig(newConfig);
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `Switched to **${DEFAULT_PROVIDERS[newProvider].name}** (${DEFAULT_PROVIDERS[newProvider].model})`,
                  timestamp: new Date(),
                },
              ]);
            }
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `Current provider: **${config.provider}**\n\nUse /provider list or /provider set <name>`,
                timestamp: new Date(),
              },
            ]);
          }
          return true;

        case "model":
          if (args[0] === "set" && args[1]) {
            const newModel = args.slice(1).join(" ");
            const newConfig = { ...config, model: newModel };
            await saveConfig(newConfig);
            setConfig(newConfig);
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `Model changed to: **${newModel}**`,
                timestamp: new Date(),
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `Current model: **${config.model}**\n\nUse /model set <name> to change`,
                timestamp: new Date(),
              },
            ]);
          }
          return true;

        case "yolo":
          const newYolo = !config.yolo;
          const newConfig = { ...config, yolo: newYolo };
          await saveConfig(newConfig);
          setConfig(newConfig);
          setMessages((prev) => [
            ...prev,
            {
              role: "system",
              content: `YOLO mode: **${newYolo ? "ENABLED" : "DISABLED"}**`,
              timestamp: new Date(),
            },
          ]);
          return true;

        case "thinking":
          setShowThinking(!showThinking);
          setMessages((prev) => [
            ...prev,
            {
              role: "system",
              content: `Thinking display: **${!showThinking ? "SHOWN" : "HIDDEN"}**`,
              timestamp: new Date(),
            },
          ]);
          return true;

        case "history":
          if (args[0] === "clear") {
            await clearAllHistory();
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: "All history cleared.",
                timestamp: new Date(),
              },
            ]);
          } else {
            const sessions = await listSessions();
            if (sessions.length === 0) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: "No saved sessions.",
                  timestamp: new Date(),
                },
              ]);
            } else {
              const list = sessions
                .slice(0, 10)
                .map((s, i) => `${i + 1}. ${s.title} (${s.messages.length} msgs)`)
                .join("\n");
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `**Recent Sessions:**\n\n${list}`,
                  timestamp: new Date(),
                },
              ]);
            }
          }
          return true;

        case "config":
          setMessages((prev) => [
            ...prev,
            {
              role: "system",
              content: `**Current Config:**

• Provider: ${config.provider}
• Model: ${config.model}
• YOLO: ${config.yolo ? "enabled" : "disabled"}
• Theme: ${config.theme}
• Max Tokens: ${config.maxTokens}
• Temperature: ${config.temperature}`,
              timestamp: new Date(),
            },
          ]);
          return true;

        case "mcp":
          // MCP server management
          const subCmd = args[0]?.toLowerCase();

          if (!subCmd || subCmd === "list" || subCmd === "status") {
            // List all MCP servers with their status
            const servers = await listMCPServers();
            const connectedServers = mcpManager.getConnectedServers();

            if (servers.length === 0) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `**🔌 MCP Servers:**

No MCP servers configured.

Use /mcp add <name> to add a server.`,
                  timestamp: new Date(),
                },
              ]);
            } else {
              const serverList = servers.map((s) => {
                const isConnected = connectedServers.includes(s.name);
                const status = s.config.enabled !== false
                  ? (isConnected ? "🟢 Connected" : "🟡 Enabled")
                  : "🔴 Disabled";
                const toolCount = mcpManager.getServerInfo(s.name)?.tools || 0;
                return `• **${s.name}** - ${status}${toolCount ? ` (${toolCount} tools)` : ""}`;
              }).join("\n");

              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `**🔌 MCP Servers:**

${serverList}

**Commands:**
• /mcp toggle <name> - Enable/disable server
• /mcp reconnect - Reconnect all servers
• /mcp tools - List all MCP tools
• /mcp add <name> - Add new server
• /mcp remove <name> - Remove server`,
                  timestamp: new Date(),
                },
              ]);
            }
            return true;
          } else if (subCmd === "toggle" && args[1]) {
            const serverName = args[1];
            const newStatus = await toggleMCPServer(serverName);
            if (newStatus === null) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `MCP server not found: ${serverName}`,
                  timestamp: new Date(),
                },
              ]);
            } else {
              // Disconnect/reconnect as needed
              if (!newStatus) {
                await mcpManager.disconnectServer(serverName);
              }
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `MCP server **${serverName}** ${newStatus ? "enabled" : "disabled"}.\n\nUse /mcp reconnect to apply changes.`,
                  timestamp: new Date(),
                },
              ]);
            }
            return true;
          } else if (subCmd === "reconnect") {
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: "🔄 Reconnecting MCP servers...",
                timestamp: new Date(),
              },
            ]);

            await mcpManager.disconnectAll();
            await mcpManager.initialize();
            const tools = mcpManager.getTools();
            setMcpTools(tools);
            const connected = mcpManager.getConnectedServers();

            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `✅ MCP reconnected!\n\nConnected: ${connected.length > 0 ? connected.join(", ") : "None"}\nTools available: ${tools.length}`,
                timestamp: new Date(),
              },
            ]);
            return true;
          } else if (subCmd === "tools") {
            const tools = mcpManager.getTools();
            if (tools.length === 0) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: "No MCP tools available. Use /mcp reconnect to connect servers.",
                  timestamp: new Date(),
                },
              ]);
            } else {
              const toolList = tools.map((t) => `• **${t.name}** - ${t.description}`).join("\n");
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `**🛠️ MCP Tools (${tools.length}):**\n\n${toolList}`,
                  timestamp: new Date(),
                },
              ]);
            }
            return true;
          } else if (subCmd === "remove" && args[1]) {
            const serverName = args[1];
            const removed = await removeMCPServer(serverName);
            if (removed) {
              await mcpManager.disconnectServer(serverName);
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `MCP server **${serverName}** removed.`,
                  timestamp: new Date(),
                },
              ]);
            } else {
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `MCP server not found: ${serverName}`,
                  timestamp: new Date(),
                },
              ]);
            }
            return true;
          } else if (subCmd === "add" && args[1]) {
            // Interactive add is complex, provide instructions
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `**Add MCP Server:**

To add a new MCP server, edit the config file:
~/.zesbe-modern/mcp.json

Example format:
\`\`\`json
{
  "mcpServers": {
    "your-server": {
      "command": "npx",
      "args": ["-y", "@your/mcp-server"],
      "env": { "API_KEY": "your-key" },
      "enabled": true
    }
  }
}
\`\`\`

Then run /mcp reconnect to apply.`,
                timestamp: new Date(),
              },
            ]);
            return true;
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `Unknown MCP command: ${subCmd}\n\nUse /mcp to see available commands.`,
                timestamp: new Date(),
              },
            ]);
            return true;
          }

        case "plan":
          // Generate a coding plan request
          const planTask = args.join(" ") || "this project";
          setMessages((prev) => [
            ...prev,
            {
              role: "user",
              content: `Create a detailed coding plan for: ${planTask}

Please include:
1. **Goal**: What we're trying to achieve
2. **Current State**: Analyze the existing codebase
3. **Steps**: Numbered list of implementation steps
4. **Files to Create/Modify**: List all files that need changes
5. **Dependencies**: Any packages or tools needed
6. **Testing**: How to verify the implementation
7. **Risks**: Potential issues and how to mitigate them`,
              timestamp: new Date(),
            },
          ]);
          return false; // Let it continue to send to AI

        case "tools":
          setMessages((prev) => [
            ...prev,
            {
              role: "system",
              content: `**Available Tools:**

**📁 File Operations:**
• **read_file** - Read file contents (with optional line range)
• **write_file** - Create or overwrite files
• **edit_file** - Find and replace text in files
• **list_directory** - List files and folders
• **search_code** - Search code patterns (grep-like)
• **glob_files** - Find files by pattern

**⚙️ System:**
• **run_command** - Execute shell commands

**🌐 Web & Research:**
• **web_search** - Search the internet for docs, tutorials, solutions
• **web_fetch** - Fetch content from any URL

Use YOLO mode (/yolo) to enable automatic tool execution.`,
              timestamp: new Date(),
            },
          ]);
          return true;

        case "search":
          // Quick web search
          const searchQuery = args.join(" ");
          if (!searchQuery) {
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: "Usage: /search <query>\nExample: /search React hooks tutorial",
                timestamp: new Date(),
              },
            ]);
            return true;
          }
          setMessages((prev) => [
            ...prev,
            {
              role: "user",
              content: `Search the web for: "${searchQuery}" and give me the top results with brief descriptions.`,
              timestamp: new Date(),
            },
          ]);
          return false; // Continue to send to AI

        default:
          return false;
      }
    },
    [config, exit, session, showThinking]
  );

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!config || !session) return;

      // Check for commands
      if (text.startsWith("/")) {
        const [cmd, ...args] = text.slice(1).split(" ");
        const handled = await handleCommand(cmd.toLowerCase(), args);
        if (handled) return;

        // Unknown command
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: `Unknown command: /${cmd}\nType /help for available commands.`,
            timestamp: new Date(),
          },
        ]);
        return;
      }

      // Add user message
      const userMsg: ChatMessage = {
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      addMessage(session, "user", text);

      setIsLoading(true);
      setStreamingText("");
      setError(null);
      setIsThinkingPhase(true);
      setCurrentActivity({ type: "thinking", timestamp: new Date() });

      const startTime = Date.now();

      try {
        const provider = await getProvider();

        // Build initial message history with system prompt
        let aiMessages: AIMessage[] = [
          { role: "system", content: CODING_SYSTEM_PROMPT },
          ...messages.map((m) => ({
            role: m.role === "tool" ? "assistant" : m.role,
            content: m.content,
          } as AIMessage)),
        ];
        aiMessages.push({ role: "user", content: text });

        // Tool calling loop - continue until we get a text response without tool calls
        let maxIterations = 10; // Prevent infinite loops
        let iteration = 0;

        while (iteration < maxIterations) {
          iteration++;

          // Stream response
          let fullText = "";
          let hasToolCalls = false;
          const toolResults: { id: string; name: string; output: string }[] = [];

          // Combine built-in tools with MCP tools
          const allTools = config.yolo
            ? [...TOOL_DEFINITIONS, ...mcpTools]
            : undefined;

          const generator = provider.chatStream({
            messages: aiMessages,
            model: config.model,
            maxTokens: config.maxTokens,
            temperature: config.temperature,
            tools: allTools,
          });

          for await (const chunk of generator) {
            if (chunk.type === "text" && chunk.content) {
              fullText += chunk.content;

              // Detect if we're in thinking phase
              const hasThinkingStart = fullText.includes("<think>");
              const hasThinkingEnd = fullText.includes("</think>");

              if (hasThinkingStart && !hasThinkingEnd) {
                setIsThinkingPhase(true);
                setCurrentActivity({ type: "thinking", timestamp: new Date() });
              } else if (hasThinkingEnd) {
                setIsThinkingPhase(false);
                setCurrentActivity({ type: "streaming", timestamp: new Date() });
              }

              // Show filtered text while streaming
              setStreamingText(filterThinking(fullText));
            } else if (chunk.type === "tool_call" && chunk.toolCall && config.yolo) {
              hasToolCalls = true;

              // Add tool activity indicator
              const toolActivity: ActivityItem = {
                type: "tool",
                name: chunk.toolCall.name,
                args: chunk.toolCall.arguments,
                timestamp: new Date(),
              };
              addActivity(toolActivity);

              let toolOutput: string;

              // Check if it's an MCP tool (prefixed with mcp_)
              if (chunk.toolCall.name.startsWith("mcp_")) {
                // Execute via MCP manager
                toolOutput = await mcpManager.callTool(
                  chunk.toolCall.name,
                  chunk.toolCall.arguments
                );
              } else {
                // Execute built-in tool
                const result = await executeTools([
                  {
                    name: chunk.toolCall.name,
                    arguments: chunk.toolCall.arguments,
                    id: chunk.toolCall.id,
                  },
                ]);
                toolOutput = result[0].success
                  ? result[0].output || "(no output)"
                  : `Error: ${result[0].error}`;
              }

              toolResults.push({
                id: chunk.toolCall.id,
                name: chunk.toolCall.name,
                output: toolOutput,
              });

              // Add tool result to UI messages
              setMessages((prev) => [
                ...prev,
                {
                  role: "tool",
                  content: `**[${chunk.toolCall!.name}]**\n\`\`\`\n${toolOutput}\n\`\`\``,
                  timestamp: new Date(),
                },
              ]);
              addMessage(session, "tool", toolOutput || "");
            } else if (chunk.type === "error" && chunk.error) {
              setError(chunk.error);
              break;
            }
          }

          // If we had tool calls, add the results and continue the loop
          if (hasToolCalls && toolResults.length > 0) {
            // Add assistant message with tool_calls to history
            aiMessages.push({
              role: "assistant",
              content: fullText || "",
              toolCalls: toolResults.map((t) => ({
                id: t.id,
                name: t.name,
                arguments: {}, // Arguments were already used
              })),
            });

            // Add tool results to history with proper tool_call_id
            for (const toolResult of toolResults) {
              aiMessages.push({
                role: "tool",
                content: toolResult.output,
                toolCallId: toolResult.id,
              });
            }

            // Reset streaming text and continue loop
            setStreamingText("");
            setIsThinkingPhase(true);
            setCurrentActivity({ type: "thinking", timestamp: new Date() });
            continue;
          }

          // No tool calls - we have the final response
          if (fullText) {
            const thinking = extractThinking(fullText);
            const filtered = filterThinking(fullText);
            const elapsed = Date.now() - startTime;

            if (filtered) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: filtered,
                  timestamp: new Date(),
                  thinking: thinking || undefined,
                  elapsed,
                },
              ]);
              addMessage(session, "assistant", filtered, thinking || undefined);
            }

            // Auto-save session
            await saveSession(session);
          }

          // Exit the loop
          break;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
        setStreamingText("");
        setCurrentActivity(null);
        setIsThinkingPhase(false);
      }
    },
    [config, messages, session, handleCommand, addActivity]
  );

  if (!config) {
    return (
      <Box padding={1}>
        <Spinner text="Loading config..." />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Header provider={config.provider} model={config.model} yolo={config.yolo} mcpServers={mcpManager.getConnectedServers()} />

      <Box flexDirection="column" flexGrow={1} paddingX={1} overflowY="hidden">
        {messages.map((msg, i) => (
          <Box key={i} flexDirection="column">
            <Message
              role={msg.role}
              content={renderMarkdown(msg.content)}
              timestamp={msg.timestamp}
              elapsed={msg.elapsed}
            />
            {showThinking && msg.thinking && (
              <Box marginLeft={4} marginBottom={1}>
                <Text dimColor italic>
                  💭 {msg.thinking.slice(0, 200)}
                  {msg.thinking.length > 200 ? "..." : ""}
                </Text>
              </Box>
            )}
          </Box>
        ))}

        {/* Activity indicators during loading */}
        {isLoading && (
          <Box flexDirection="column" marginY={1}>
            {/* Show recent tool activities */}
            {activities.slice(-3).map((activity, i) => {
              if (activity.type === "tool" && activity.name) {
                return (
                  <Box key={i} marginLeft={2}>
                    <Text color="green">✓ </Text>
                    <Text dimColor>
                      {activity.name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                    {activity.args?.path ? (
                      <Text dimColor> ({String(activity.args.path).split("/").pop()})</Text>
                    ) : null}
                  </Box>
                );
              }
              return null;
            })}

            {/* Current activity */}
            {currentActivity && (
              <Box marginLeft={2}>
                {currentActivity.type === "tool" && currentActivity.name ? (
                  <ToolActivity toolName={currentActivity.name} args={currentActivity.args} />
                ) : (
                  <StreamingActivity
                    isThinking={isThinkingPhase}
                    contentLength={streamingText.length}
                  />
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Streaming text preview */}
        {isLoading && streamingText && (
          <Message
            role="assistant"
            content={renderMarkdown(streamingText)}
            timestamp={new Date()}
          />
        )}

        {error && (
          <Box marginY={1}>
            <Text color="red">Error: {error}</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Input
          onSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder="Ask me anything... (type /help for commands)"
        />
      </Box>
    </Box>
  );
}
