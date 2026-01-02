import type { AIProvider, ChatRequest, ChatResponse, StreamChunk, Message, ToolDefinition } from "./types.js";

interface OpenAIMessage {
  role: string;
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }[];
  tool_call_id?: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: OpenAITool[];
  tool_choice?: "auto" | "none";
}

interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: {
        index: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }[];
    };
    finish_reason: string | null;
  }[];
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: {
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }[];
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class MiniMaxProvider implements AIProvider {
  name = "MiniMax";

  constructor(
    private apiKey: string,
    private baseUrl: string = "https://api.minimax.io/v1",
    private defaultModel: string = "MiniMax-M2"
  ) {}

  private convertTools(tools?: ToolDefinition[]): OpenAITool[] | undefined {
    if (!tools || tools.length === 0) return undefined;

    // Sanitize and convert tools - ensure valid schemas
    return tools
      .filter(tool => tool.name && tool.description) // Filter out invalid tools
      .map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name.replace(/[^a-zA-Z0-9_-]/g, "_"), // Sanitize name
          description: (tool.description || tool.name).slice(0, 1000), // Limit description length
          parameters: this.sanitizeParameters(tool.parameters),
        },
      }));
  }

  private sanitizeParameters(params: Record<string, unknown>): Record<string, unknown> {
    // Ensure parameters has valid JSON Schema structure
    if (!params || typeof params !== "object") {
      return { type: "object", properties: {}, required: [] };
    }

    const sanitized: Record<string, unknown> = {
      type: params.type || "object",
    };

    // Copy properties if present
    if (params.properties && typeof params.properties === "object") {
      sanitized.properties = params.properties;
    } else {
      sanitized.properties = {};
    }

    // Copy required if present and valid
    if (Array.isArray(params.required)) {
      sanitized.required = params.required;
    } else {
      sanitized.required = [];
    }

    // Copy additionalProperties if present
    if (params.additionalProperties !== undefined) {
      sanitized.additionalProperties = params.additionalProperties;
    }

    return sanitized;
  }

  private convertMessages(messages: Message[]): OpenAIMessage[] {
    return messages.map((m) => {
      const msg: OpenAIMessage = {
        role: m.role,
        content: m.content,
      };

      // Add tool_calls for assistant messages that have them
      if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
        msg.tool_calls = m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        }));
        // When there are tool calls, content can be null
        if (!m.content) {
          msg.content = null;
        }
      }

      // Add tool_call_id for tool result messages
      if (m.role === "tool" && m.toolCallId) {
        msg.tool_call_id = m.toolCallId;
      }

      return msg;
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const body: OpenAIRequest = {
      model: request.model || this.defaultModel,
      messages: this.convertMessages(request.messages),
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
      stream: false,
    };

    if (request.tools) {
      body.tools = this.convertTools(request.tools);
      body.tool_choice = "auto";
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MiniMax API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    const choice = data.choices[0];

    return {
      id: data.id,
      model: data.model,
      content: choice.message.content || "",
      toolCalls: choice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      })),
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      finishReason:
        choice.finish_reason === "tool_calls" ? "tool_calls" : "stop",
    };
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const body: OpenAIRequest = {
      model: request.model || this.defaultModel,
      messages: this.convertMessages(request.messages),
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
      stream: true,
    };

    if (request.tools) {
      body.tools = this.convertTools(request.tools);
      body.tool_choice = "auto";
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      yield { type: "error", error: `MiniMax API error: ${response.status} - ${error}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", error: "No response body" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let toolCallsBuffer: Map<number, { id: string; name: string; args: string }> = new Map();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;

          if (trimmed.startsWith("data: ")) {
            try {
              const chunk = JSON.parse(trimmed.slice(6)) as OpenAIStreamChunk;
              const delta = chunk.choices[0]?.delta;

              if (delta?.content) {
                yield { type: "text", content: delta.content };
              }

              // Handle tool calls
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const existing = toolCallsBuffer.get(tc.index);
                  if (tc.id) {
                    toolCallsBuffer.set(tc.index, {
                      id: tc.id,
                      name: tc.function?.name || existing?.name || "",
                      args: tc.function?.arguments || "",
                    });
                  } else if (existing && tc.function?.arguments) {
                    existing.args += tc.function.arguments;
                  }
                }
              }

              if (chunk.choices[0]?.finish_reason === "tool_calls") {
                for (const [_, tc] of toolCallsBuffer) {
                  yield {
                    type: "tool_call",
                    toolCall: {
                      id: tc.id,
                      name: tc.name,
                      arguments: JSON.parse(tc.args || "{}"),
                    },
                  };
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: "done" };
  }
}
