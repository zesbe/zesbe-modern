import type { AIProvider, ChatRequest, StreamChunk } from "./types";
import { MiniMaxProvider } from "./minimax";
import { loadConfig, DEFAULT_PROVIDERS } from "../config";

// Provider registry
const providers: Map<string, AIProvider> = new Map();

// Create provider instance
export function createProvider(
  name: string,
  apiKey: string,
  baseUrl?: string,
  model?: string
): AIProvider {
  const providerConfig = DEFAULT_PROVIDERS[name];
  if (!providerConfig) {
    throw new Error(`Unknown provider: ${name}`);
  }

  const finalBaseUrl = baseUrl || providerConfig.baseUrl;
  const finalModel = model || providerConfig.model;

  switch (name) {
    case "minimax":
      return new MiniMaxProvider(apiKey, finalBaseUrl, finalModel);
    // All providers use OpenAI-compatible API through MiniMax provider
    case "openai":
    case "groq":
    case "deepseek":
    case "openrouter":
    case "ollama":
      return new MiniMaxProvider(apiKey, finalBaseUrl, finalModel);
    default:
      // Default to OpenAI-compatible
      return new MiniMaxProvider(apiKey, finalBaseUrl, finalModel);
  }
}

// Get or create provider
export async function getProvider(name?: string): Promise<AIProvider> {
  const config = await loadConfig();
  const providerName = name || config.provider;

  if (providers.has(providerName)) {
    return providers.get(providerName)!;
  }

  const apiKey = config.apiKey || "";
  const provider = createProvider(
    providerName,
    apiKey,
    config.baseUrl,
    config.model
  );

  providers.set(providerName, provider);
  return provider;
}

// Clear cached providers
export function clearProviders(): void {
  providers.clear();
}

// Re-export types
export * from "./types";
export { MiniMaxProvider } from "./minimax";
