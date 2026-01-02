import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { listProviders, DEFAULT_PROVIDERS } from "../../config/index.js";
import { listMCPServers, toggleMCPServer, type MCPServerConfig } from "../../mcp/index.js";
import { mcpManager } from "../../mcp/client.js";

// Types for menu items
interface MenuItem {
  label: string;
  value: string;
}

// ============================================
// Provider Selection Menu
// ============================================
export interface ProviderMenuProps {
  currentProvider: string;
  onSelect: (provider: string) => void;
  onCancel: () => void;
}

export function ProviderMenu({ currentProvider, onSelect, onCancel }: ProviderMenuProps) {
  const providers = listProviders();

  const items: MenuItem[] = providers.map(p => ({
    label: `${p === currentProvider ? "● " : "  "}${DEFAULT_PROVIDERS[p].name} (${DEFAULT_PROVIDERS[p].model})`,
    value: p,
  }));

  // Add cancel option
  items.push({ label: "  ❌ Cancel", value: "__cancel__" });

  const handleSelect = (item: MenuItem) => {
    if (item.value === "__cancel__") {
      onCancel();
    } else {
      onSelect(item.value);
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>⚡ Select AI Provider:</Text>
        <Text dimColor> (↑↓ navigate, Enter select, Esc cancel)</Text>
      </Box>
      <Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="column">
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
    </Box>
  );
}

// ============================================
// Model Selection Menu (based on provider)
// ============================================
export interface ModelMenuProps {
  currentProvider: string;
  currentModel: string;
  onSelect: (model: string) => void;
  onCancel: () => void;
}

// Common models for each provider
const PROVIDER_MODELS: Record<string, string[]> = {
  minimax: ["MiniMax-M2", "MiniMax-Text-01", "abab7-chat-preview"],
  anthropic: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini"],
  google: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"],
  deepseek: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"],
  openrouter: ["anthropic/claude-sonnet-4", "openai/gpt-4o", "google/gemini-2.0-flash-exp"],
  ollama: ["llama3.2", "llama3.1", "codellama", "mistral", "phi3"],
};

export function ModelMenu({ currentProvider, currentModel, onSelect, onCancel }: ModelMenuProps) {
  const models = PROVIDER_MODELS[currentProvider] || [currentModel];

  const items: MenuItem[] = models.map(m => ({
    label: `${m === currentModel ? "● " : "  "}${m}`,
    value: m,
  }));

  // Add custom option and cancel
  items.push({ label: "  ✏️  Enter custom model...", value: "__custom__" });
  items.push({ label: "  ❌ Cancel", value: "__cancel__" });

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customModel, setCustomModel] = useState("");

  const handleSelect = (item: MenuItem) => {
    if (item.value === "__cancel__") {
      onCancel();
    } else if (item.value === "__custom__") {
      setShowCustomInput(true);
    } else {
      onSelect(item.value);
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      if (showCustomInput) {
        setShowCustomInput(false);
      } else {
        onCancel();
      }
    }
  });

  if (showCustomInput) {
    return (
      <Box flexDirection="column" marginY={1}>
        <Text color="cyan" bold>✏️ Enter custom model name:</Text>
        <Box borderStyle="round" borderColor="cyan" paddingX={1}>
          <Text color="green">Model: </Text>
          <Text>{customModel || "(type model name and press Enter)"}</Text>
        </Box>
        <Text dimColor>Press Esc to go back</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text color="yellow" bold>🤖 Select Model for {DEFAULT_PROVIDERS[currentProvider]?.name || currentProvider}:</Text>
      </Box>
      <Box borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column">
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
      <Text dimColor>↑↓ navigate • Enter select • Esc cancel</Text>
    </Box>
  );
}

// ============================================
// YOLO Mode Toggle Menu
// ============================================
export interface YoloMenuProps {
  currentYolo: boolean;
  onToggle: (enabled: boolean) => void;
  onCancel: () => void;
}

export function YoloMenu({ currentYolo, onToggle, onCancel }: YoloMenuProps) {
  const items: MenuItem[] = [
    {
      label: `${currentYolo ? "● " : "  "}🚀 YOLO ON - Auto-execute all tools without confirmation`,
      value: "true"
    },
    {
      label: `${!currentYolo ? "● " : "  "}🛡️ YOLO OFF - Ask before executing tools`,
      value: "false"
    },
    { label: "  ❌ Cancel", value: "__cancel__" },
  ];

  const handleSelect = (item: MenuItem) => {
    if (item.value === "__cancel__") {
      onCancel();
    } else {
      onToggle(item.value === "true");
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text color="magenta" bold>🎮 YOLO Mode Settings:</Text>
      </Box>
      <Box borderStyle="round" borderColor="magenta" paddingX={1} flexDirection="column">
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          YOLO mode allows AI to execute file operations, commands, and tools automatically.
        </Text>
      </Box>
    </Box>
  );
}

// ============================================
// MCP Server Management Menu
// ============================================
export interface MCPMenuProps {
  onAction: (action: string, serverName?: string) => void;
  onCancel: () => void;
}

export function MCPMenu({ onAction, onCancel }: MCPMenuProps) {
  const [view, setView] = useState<"main" | "servers" | "tools">("main");
  const [servers, setServers] = useState<{ name: string; config: MCPServerConfig }[]>([]);
  const connectedServers = mcpManager.getConnectedServers();

  // Load servers on mount
  useEffect(() => {
    listMCPServers().then(setServers);
  }, []);

  useInput((input, key) => {
    if (key.escape) {
      if (view !== "main") {
        setView("main");
      } else {
        onCancel();
      }
    }
  });

  // Main menu
  if (view === "main") {
    const items: MenuItem[] = [
      { label: "📋 View Server Status", value: "status" },
      { label: "🔌 Toggle Server On/Off", value: "toggle" },
      { label: "🔄 Reconnect All Servers", value: "reconnect" },
      { label: "🛠️ View Available Tools", value: "tools" },
      { label: "❌ Cancel", value: "__cancel__" },
    ];

    const handleSelect = (item: MenuItem) => {
      if (item.value === "__cancel__") {
        onCancel();
      } else if (item.value === "toggle") {
        setView("servers");
      } else if (item.value === "tools") {
        setView("tools");
      } else {
        onAction(item.value);
      }
    };

    return (
      <Box flexDirection="column" marginY={1}>
        <Box marginBottom={1}>
          <Text color="cyan" bold>🔌 MCP Server Management</Text>
          <Text dimColor> ({connectedServers.length} connected)</Text>
        </Box>
        <Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="column">
          <SelectInput items={items} onSelect={handleSelect} />
        </Box>
      </Box>
    );
  }

  // Server toggle view
  if (view === "servers") {
    const items: MenuItem[] = servers.map(s => {
      const isConnected = connectedServers.includes(s.name);
      const status = s.config.enabled !== false
        ? (isConnected ? "🟢" : "🟡")
        : "🔴";
      return {
        label: `${status} ${s.name} - ${s.config.enabled !== false ? "Enabled" : "Disabled"}`,
        value: s.name,
      };
    });
    items.push({ label: "⬅️ Back", value: "__back__" });

    const handleSelect = (item: MenuItem) => {
      if (item.value === "__back__") {
        setView("main");
      } else {
        onAction("toggle", item.value);
      }
    };

    return (
      <Box flexDirection="column" marginY={1}>
        <Box marginBottom={1}>
          <Text color="cyan" bold>🔌 Toggle MCP Server:</Text>
        </Box>
        <Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="column">
          <SelectInput items={items} onSelect={handleSelect} />
        </Box>
        <Text dimColor>🟢 Connected • 🟡 Enabled • 🔴 Disabled</Text>
      </Box>
    );
  }

  // Tools view
  if (view === "tools") {
    const tools = mcpManager.getTools();

    return (
      <Box flexDirection="column" marginY={1}>
        <Box marginBottom={1}>
          <Text color="cyan" bold>🛠️ Available MCP Tools ({tools.length}):</Text>
        </Box>
        <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column" height={10} overflowY="hidden">
          {tools.length === 0 ? (
            <Text dimColor>No tools available. Connect MCP servers first.</Text>
          ) : (
            tools.slice(0, 8).map((tool, i) => (
              <Text key={i}>
                <Text color="green">• {tool.name}</Text>
                <Text dimColor> - {tool.description?.slice(0, 40)}...</Text>
              </Text>
            ))
          )}
          {tools.length > 8 && (
            <Text dimColor italic>... and {tools.length - 8} more</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press Esc to go back</Text>
        </Box>
      </Box>
    );
  }

  return null;
}

// ============================================
// History Menu
// ============================================
export interface HistoryMenuProps {
  sessions: Array<{ id: string; title: string; messages: number; date: Date }>;
  onSelect: (action: string, sessionId?: string) => void;
  onCancel: () => void;
}

export function HistoryMenu({ sessions, onSelect, onCancel }: HistoryMenuProps) {
  const items: MenuItem[] = [
    { label: "📜 View Recent Sessions", value: "view" },
    { label: "🗑️ Clear All History", value: "clear" },
    { label: "❌ Cancel", value: "__cancel__" },
  ];

  const handleSelect = (item: MenuItem) => {
    if (item.value === "__cancel__") {
      onCancel();
    } else {
      onSelect(item.value);
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text color="blue" bold>📜 History Management</Text>
        <Text dimColor> ({sessions.length} sessions)</Text>
      </Box>
      <Box borderStyle="round" borderColor="blue" paddingX={1} flexDirection="column">
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
    </Box>
  );
}

// ============================================
// Thinking Mode Menu
// ============================================
export interface ThinkingMenuProps {
  currentShow: boolean;
  onToggle: (show: boolean) => void;
  onCancel: () => void;
}

export function ThinkingMenu({ currentShow, onToggle, onCancel }: ThinkingMenuProps) {
  const items: MenuItem[] = [
    {
      label: `${currentShow ? "● " : "  "}💭 Show Thinking - Display AI reasoning process`,
      value: "true"
    },
    {
      label: `${!currentShow ? "● " : "  "}🔇 Hide Thinking - Only show final responses`,
      value: "false"
    },
    { label: "  ❌ Cancel", value: "__cancel__" },
  ];

  const handleSelect = (item: MenuItem) => {
    if (item.value === "__cancel__") {
      onCancel();
    } else {
      onToggle(item.value === "true");
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text color="gray" bold>💭 Thinking Display Settings:</Text>
      </Box>
      <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column">
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Some models show their reasoning in {"<think>"} tags before responding.
        </Text>
      </Box>
    </Box>
  );
}

// ============================================
// Config View
// ============================================
export interface ConfigViewProps {
  config: {
    provider: string;
    model: string;
    yolo: boolean;
    theme: string;
    maxTokens: number;
    temperature: number;
  };
  mcpServers: string[];
  onClose: () => void;
}

export function ConfigView({ config, mcpServers, onClose }: ConfigViewProps) {
  useInput((input, key) => {
    if (key.escape || key.return) {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" marginY={1}>
      <Text color="white" bold>⚙️ Current Configuration:</Text>
      <Box borderStyle="round" borderColor="white" paddingX={2} paddingY={1} flexDirection="column" marginTop={1}>
        <Text><Text color="cyan">Provider:</Text> {config.provider}</Text>
        <Text><Text color="cyan">Model:</Text> {config.model}</Text>
        <Text><Text color="cyan">YOLO Mode:</Text> {config.yolo ? <Text color="green">ON</Text> : <Text color="red">OFF</Text>}</Text>
        <Text><Text color="cyan">Theme:</Text> {config.theme}</Text>
        <Text><Text color="cyan">Max Tokens:</Text> {config.maxTokens}</Text>
        <Text><Text color="cyan">Temperature:</Text> {config.temperature}</Text>
        <Text><Text color="cyan">MCP Servers:</Text> {mcpServers.length > 0 ? mcpServers.join(", ") : "None"}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Enter or Esc to close</Text>
      </Box>
    </Box>
  );
}

// ============================================
// Skills/Tools Quick Access Menu
// ============================================
export interface SkillsMenuProps {
  onSelect: (skill: string) => void;
  onCancel: () => void;
}

export function SkillsMenu({ onSelect, onCancel }: SkillsMenuProps) {
  const items: MenuItem[] = [
    { label: "📁 Read File", value: "read_file" },
    { label: "✏️ Edit File", value: "edit_file" },
    { label: "🔍 Search Code", value: "search_code" },
    { label: "📂 List Directory", value: "list_directory" },
    { label: "🌐 Web Search", value: "web_search" },
    { label: "📊 Analyze Project", value: "analyze_project" },
    { label: "🔐 Security Audit", value: "audit_security" },
    { label: "🧪 Run Tests", value: "run_tests" },
    { label: "❌ Cancel", value: "__cancel__" },
  ];

  const handleSelect = (item: MenuItem) => {
    if (item.value === "__cancel__") {
      onCancel();
    } else {
      onSelect(item.value);
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text color="green" bold>🛠️ Quick Tools:</Text>
        <Text dimColor> (AI will help execute)</Text>
      </Box>
      <Box borderStyle="round" borderColor="green" paddingX={1} flexDirection="column">
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
    </Box>
  );
}
