import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useApp, useInput } from "ink";
import {
  Header,
  StatusLine,
  Message,
  Input,
  Spinner,
  ToolActivity,
  StreamingActivity,
  ProviderMenu,
  ModelMenu,
  YoloMenu,
  MCPMenu,
  ThinkingMenu,
  ConfigView,
  SkillsMenu,
} from "./components/index.js";
import { getProvider, type Message as AIMessage, type StreamChunk } from "../ai/index.js";
import { loadConfig, saveConfig, listProviders, DEFAULT_PROVIDERS, CODING_SYSTEM_PROMPT, type Config } from "../config/index.js";

// Types for interactive menus
type ActiveMenu = "none" | "provider" | "model" | "yolo" | "mcp" | "thinking" | "config" | "skills";
import { TOOL_DEFINITIONS, executeTools } from "../tools/index.js";
import { filterThinking, extractThinking, renderMarkdown } from "../utils/index.js";
import {
  createSession,
  addMessage,
  saveSession,
  listSessions,
  deleteSession,
  clearAllHistory,
  type ChatSession,
  type ChatMessage as HistoryMessage,
} from "../utils/history.js";
import {
  mcpManager,
  loadMCPConfig,
  listMCPServers,
  toggleMCPServer,
  removeMCPServer,
  addMCPServer,
  type MCPServerConfig,
} from "../mcp/index.js";

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: Date;
  thinking?: string;
  elapsed?: number; // Response time in ms
  toolCallId?: string; // For tool result messages - required by API
  toolCalls?: { id: string; name: string; arguments: Record<string, unknown> }[]; // For assistant messages with tool calls
  rawContent?: string; // Raw content for API (without formatting)
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

  // Interactive menu state
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>("none");

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

I'm your AI coding assistant powered by **${cfg.provider}**. I can help you with:

* Writing and editing code
* Debugging and troubleshooting
* Reading and analyzing files
* Running terminal commands (git, npm, etc)
* Searching for documentation online
* Analyzing project structure

**Current Configuration:**
Provider: **${cfg.provider}** | Model: **${cfg.model}**
YOLO mode: **${cfg.yolo ? "ON" : "OFF"}**
MCP Servers: **${connectedServers.length > 0 ? connectedServers.join(", ") : "None"}**

Type **/help** for commands or just start chatting! 💻`,
          timestamp: new Date(),
        }]);
      } catch (err) {
        // Even if MCP fails, continue with welcome
        setMessages([{
          role: "system",
          content: `**Welcome to zesbe-modern! 🚀**

I'm your AI coding assistant powered by **${cfg.provider}**. I can help you with:

* Writing and editing code
* Debugging and troubleshooting
* Reading and analyzing files
* Running terminal commands (git, npm, etc)
* Searching for documentation online
* Analyzing project structure

**Current Configuration:**
Provider: **${cfg.provider}** | Model: **${cfg.model}**
YOLO mode: **${cfg.yolo ? "ON" : "OFF"}**

Type **/help** for commands or just start chatting! 💻`,
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
      // Exit commands should always work, even without config
      switch (cmd) {
        case "exit":
        case "q":
          if (session && session.messages.length > 0) {
            await saveSession(session);
          }
          exit();
          process.exit(0); // Force exit if Ink doesn't close
          return true;
      }

      // Other commands need config
      if (!config) return false;

      switch (cmd) {

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
• /exit, /q - Exit the app
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
          if (args[0] === "set" && args[1]) {
            // Direct set with argument
            const newProvider = args[1].toLowerCase();
            if (!DEFAULT_PROVIDERS[newProvider]) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `Unknown provider: ${newProvider}\nUse /provider to see available providers.`,
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
                  content: `✅ Switched to **${DEFAULT_PROVIDERS[newProvider].name}** (${DEFAULT_PROVIDERS[newProvider].model})`,
                  timestamp: new Date(),
                },
              ]);
            }
          } else {
            // Show interactive menu
            setActiveMenu("provider");
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
                content: `✅ Model changed to: **${newModel}**`,
                timestamp: new Date(),
              },
            ]);
          } else {
            // Show interactive menu
            setActiveMenu("model");
          }
          return true;

        case "yolo":
          // Show interactive menu instead of direct toggle
          setActiveMenu("yolo");
          return true;

        case "thinking":
          // Show interactive menu
          setActiveMenu("thinking");
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
          // Show interactive config view
          setActiveMenu("config");
          return true;

        case "mcp":
          // MCP server management - show interactive menu
          const subCmd = args[0]?.toLowerCase();

          // Handle specific subcommands
          if (subCmd === "reconnect") {
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
          }

          // Show interactive menu for other operations
          setActiveMenu("mcp");
          return true;

        case "skills":
        case "tools":
          // Show interactive skills menu
          setActiveMenu("skills");
          return true;

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
          ...messages
            .filter((m) => m.role !== "system") // Skip system messages (like welcome)
            .map((m) => {
              const msg: AIMessage = {
                role: m.role,
                content: m.rawContent || m.content, // Use raw content for API
              };
              // Add toolCallId for tool messages - required by MiniMax API
              if (m.role === "tool" && m.toolCallId) {
                msg.toolCallId = m.toolCallId;
              }
              // Add toolCalls for assistant messages
              if (m.role === "assistant" && m.toolCalls) {
                msg.toolCalls = m.toolCalls;
              }
              return msg;
            }),
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
          const toolResults: { id: string; name: string; output: string; arguments: Record<string, unknown> }[] = [];

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
                arguments: chunk.toolCall.arguments, // Store arguments for history
              });

              // Add tool result to UI messages with toolCallId for API
              setMessages((prev) => [
                ...prev,
                {
                  role: "tool",
                  content: `**[${chunk.toolCall!.name}]**\n\`\`\`\n${toolOutput}\n\`\`\``,
                  rawContent: toolOutput, // Raw content for API
                  toolCallId: chunk.toolCall!.id, // Required for MiniMax API
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
            // Build toolCalls array with actual arguments
            const toolCallsForHistory = toolResults.map((t) => ({
              id: t.id,
              name: t.name,
              arguments: t.arguments, // Use actual arguments, not empty
            }));

            // Add assistant message with tool_calls to aiMessages for current loop
            aiMessages.push({
              role: "assistant",
              content: fullText || "",
              toolCalls: toolCallsForHistory,
            });

            // Also store in UI messages for subsequent chat sessions
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: fullText || "(calling tools...)",
                rawContent: fullText || "",
                toolCalls: toolCallsForHistory,
                timestamp: new Date(),
              },
            ]);

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
                  rawContent: filtered, // Raw content same as filtered (no thinking tags)
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
      <Header provider={config.provider} model={config.model} />

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

      {/* Interactive Menus */}
      {activeMenu === "provider" && config && (
        <ProviderMenu
          currentProvider={config.provider}
          onSelect={async (provider) => {
            const newConfig = {
              ...config,
              provider,
              model: DEFAULT_PROVIDERS[provider].model,
              baseUrl: DEFAULT_PROVIDERS[provider].baseUrl,
            };
            await saveConfig(newConfig);
            setConfig(newConfig);
            setActiveMenu("none");
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `✅ Switched to **${DEFAULT_PROVIDERS[provider].name}** (${DEFAULT_PROVIDERS[provider].model})`,
                timestamp: new Date(),
              },
            ]);
          }}
          onCancel={() => setActiveMenu("none")}
        />
      )}

      {activeMenu === "model" && config && (
        <ModelMenu
          currentProvider={config.provider}
          currentModel={config.model}
          onSelect={async (model) => {
            const newConfig = { ...config, model };
            await saveConfig(newConfig);
            setConfig(newConfig);
            setActiveMenu("none");
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `✅ Model changed to: **${model}**`,
                timestamp: new Date(),
              },
            ]);
          }}
          onCancel={() => setActiveMenu("none")}
        />
      )}

      {activeMenu === "yolo" && config && (
        <YoloMenu
          currentYolo={config.yolo}
          onToggle={async (enabled) => {
            const newConfig = { ...config, yolo: enabled };
            await saveConfig(newConfig);
            setConfig(newConfig);
            setActiveMenu("none");
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `✅ YOLO mode: **${enabled ? "ENABLED 🚀" : "DISABLED 🛡️"}**`,
                timestamp: new Date(),
              },
            ]);
          }}
          onCancel={() => setActiveMenu("none")}
        />
      )}

      {activeMenu === "mcp" && (
        <MCPMenu
          onAction={async (action, serverName) => {
            if (action === "status") {
              // Show status message
              const servers = await listMCPServers();
              const connected = mcpManager.getConnectedServers();
              const serverList = servers.map((s: { name: string; config: { enabled?: boolean } }) => {
                const isConnected = connected.includes(s.name);
                const status = s.config.enabled !== false
                  ? (isConnected ? "🟢" : "🟡")
                  : "🔴";
                return `${status} ${s.name}`;
              }).join("\n");
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `**🔌 MCP Status:**\n\n${serverList || "No servers configured"}`,
                  timestamp: new Date(),
                },
              ]);
              setActiveMenu("none");
            } else if (action === "toggle" && serverName) {
              const newStatus = await toggleMCPServer(serverName);
              if (newStatus !== null) {
                if (!newStatus) {
                  await mcpManager.disconnectServer(serverName);
                }
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "system",
                    content: `✅ MCP server **${serverName}** ${newStatus ? "enabled" : "disabled"}`,
                    timestamp: new Date(),
                  },
                ]);
              }
              setActiveMenu("none");
            } else if (action === "reconnect") {
              setActiveMenu("none");
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
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  content: `✅ Reconnected! ${tools.length} tools available`,
                  timestamp: new Date(),
                },
              ]);
            } else if (action === "tools") {
              setActiveMenu("none");
            }
          }}
          onCancel={() => setActiveMenu("none")}
        />
      )}

      {activeMenu === "thinking" && (
        <ThinkingMenu
          currentShow={showThinking}
          onToggle={(show) => {
            setShowThinking(show);
            setActiveMenu("none");
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `✅ Thinking display: **${show ? "SHOWN 💭" : "HIDDEN 🔇"}**`,
                timestamp: new Date(),
              },
            ]);
          }}
          onCancel={() => setActiveMenu("none")}
        />
      )}

      {activeMenu === "config" && config && (
        <ConfigView
          config={{
            provider: config.provider,
            model: config.model,
            yolo: config.yolo,
            theme: config.theme,
            maxTokens: config.maxTokens,
            temperature: config.temperature,
          }}
          mcpServers={mcpManager.getConnectedServers()}
          onClose={() => setActiveMenu("none")}
        />
      )}

      {activeMenu === "skills" && (
        <SkillsMenu
          onSelect={(skill) => {
            setActiveMenu("none");
            // Generate a prompt for the selected skill
            const skillPrompts: Record<string, string> = {
              read_file: "Please read the file and show me its contents. What file would you like me to read?",
              edit_file: "I'll help you edit a file. What changes would you like to make?",
              search_code: "I'll search through the codebase. What are you looking for?",
              list_directory: "I'll list the directory contents. Which directory?",
              web_search: "I'll search the web for you. What would you like me to find?",
              analyze_project: "I'll analyze this project and provide an overview of its structure, dependencies, and purpose.",
              audit_security: "I'll run a security audit on this project to check for vulnerabilities.",
              run_tests: "I'll run the tests for this project and report the results.",
            };
            const prompt = skillPrompts[skill] || `I'll help you with ${skill}.`;
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `🛠️ **${skill.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}**\n\n${prompt}`,
                timestamp: new Date(),
              },
            ]);
          }}
          onCancel={() => setActiveMenu("none")}
        />
      )}

      <Box marginTop={1}>
        <Input
          onSubmit={handleSubmit}
          isLoading={isLoading || activeMenu !== "none"}
          placeholder={activeMenu !== "none" ? "Menu active - use arrows/Enter/Esc" : "Ask me anything... (type /help for commands)"}
        />
      </Box>

      {/* Status bar at bottom */}
      <StatusLine
        provider={config.provider}
        model={config.model}
        yolo={config.yolo}
        mcpServers={mcpManager.getConnectedServers()}
      />
    </Box>
  );
}
