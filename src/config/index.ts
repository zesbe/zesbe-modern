import { z } from "zod";
import { homedir } from "os";
import { join } from "path";

// Provider schema
const ProviderSchema = z.object({
  name: z.string(),
  baseUrl: z.string().url(),
  model: z.string(),
  apiKey: z.string().optional(),
});

export type Provider = z.infer<typeof ProviderSchema>;

// Config schema
const ConfigSchema = z.object({
  provider: z.string().default("minimax"),
  model: z.string().default("MiniMax-M2"),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  yolo: z.boolean().default(true),
  theme: z.enum(["dark", "light"]).default("dark"),
  serverPort: z.number().default(3721),
  maxTokens: z.number().default(4096),
  temperature: z.number().default(0.7),
});

export type Config = z.infer<typeof ConfigSchema>;

// Default providers - MiniMax first!
export const DEFAULT_PROVIDERS: Record<string, Provider> = {
  minimax: {
    name: "MiniMax",
    baseUrl: "https://api.minimax.io/v1",
    model: "MiniMax-M2",
  },
  anthropic: {
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-20250514",
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o",
  },
  google: {
    name: "Google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.0-flash",
  },
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "anthropic/claude-sonnet-4",
  },
  ollama: {
    name: "Ollama",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.2",
  },
};

// Config paths
export const CONFIG_DIR = join(homedir(), ".zesbe-modern");
export const CONFIG_PATH = join(CONFIG_DIR, "config.json");

// Load API key from env or file
async function loadApiKey(provider: string): Promise<string | undefined> {
  const envKey = `${provider.toUpperCase()}_API_KEY`;
  if (process.env[envKey]) {
    return process.env[envKey];
  }

  try {
    const { readFile } = await import("fs/promises");
    const keyPath = join(homedir(), `.${provider}_api_key`);
    const content = await readFile(keyPath, "utf-8");
    return content.trim();
  } catch {
    return undefined;
  }
}

// Load config
export async function loadConfig(): Promise<Config> {
  let config: Partial<Config> = {};

  try {
    const { readFile, access } = await import("fs/promises");
    await access(CONFIG_PATH);
    const content = await readFile(CONFIG_PATH, "utf-8");
    config = JSON.parse(content);
  } catch {
    // Use defaults
  }

  const parsed = ConfigSchema.parse(config);

  // Load API key if not set
  if (!parsed.apiKey) {
    parsed.apiKey = await loadApiKey(parsed.provider);
  }

  // Set base URL from provider if not set
  if (!parsed.baseUrl && DEFAULT_PROVIDERS[parsed.provider]) {
    parsed.baseUrl = DEFAULT_PROVIDERS[parsed.provider].baseUrl;
  }

  return parsed;
}

// Save config
export async function saveConfig(config: Partial<Config>): Promise<void> {
  const { mkdir, writeFile } = await import("fs/promises");
  await mkdir(CONFIG_DIR, { recursive: true });

  // Don't save API key
  const toSave = { ...config };
  delete toSave.apiKey;

  await writeFile(CONFIG_PATH, JSON.stringify(toSave, null, 2));
}

// Get provider config
export function getProvider(name: string): Provider | undefined {
  return DEFAULT_PROVIDERS[name];
}

// List providers
export function listProviders(): string[] {
  return Object.keys(DEFAULT_PROVIDERS);
}

// Coding-focused system prompt
export const CODING_SYSTEM_PROMPT = `You are an expert AI coding assistant. Your role is to help developers write, debug, and improve code.

## Capabilities
You have access to powerful tools:

### File Operations
- **read_file**: Read file contents with optional line ranges
- **write_file**: Create new files or overwrite existing ones
- **edit_file**: Make surgical edits by finding and replacing specific text
- **list_directory**: Explore project structure
- **glob_files**: Find files by name pattern
- **search_code**: Search for patterns across codebase

### System
- **run_command**: Execute shell commands (git, npm, tests, builds)

### Web & Research
- **web_search**: Search the internet for documentation, tutorials, solutions
- **web_fetch**: Fetch and read content from any URL

## Guidelines
1. **Research First**: If unsure about a library/API, use web_search to find documentation
2. **Understand Code**: Always read relevant files before making changes
3. **Minimal Changes**: Use edit_file for small changes instead of rewriting entire files
4. **Explain Changes**: Briefly explain what you're doing and why
5. **Verify Results**: After changes, verify they work (run tests, check syntax)
6. **Best Practices**: Follow language-specific conventions and best practices
7. **Security**: Never expose secrets, credentials, or sensitive data

## Response Style
- Be concise and direct
- Use code blocks with language tags
- When showing diffs, use \`-\` for removed lines and \`+\` for added lines
- Ask clarifying questions if requirements are ambiguous

## When Writing Code
- Write clean, readable, well-documented code
- Handle errors gracefully
- Consider edge cases
- Add appropriate comments for complex logic
- Follow existing code style in the project

## When Researching
- Use web_search to find the latest documentation
- Use web_fetch to read specific documentation pages
- Always verify information from multiple sources if possible`;

// Short system prompt for non-coding conversations
export const GENERAL_SYSTEM_PROMPT = `You are a helpful AI assistant with access to coding tools. You can read, write, and edit files, run commands, and help with any task.`;
