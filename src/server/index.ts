import { Hono } from "hono";
import { cors } from "hono/cors";
import { stream } from "hono/streaming";
import { getProvider, type Message, type StreamChunk } from "../ai/index.js";
import { TOOL_DEFINITIONS, executeTools } from "../tools/index.js";
import { loadConfig, saveConfig, listProviders, DEFAULT_PROVIDERS } from "../config/index.js";

const app = new Hono();

// Enable CORS
app.use("/*", cors());

// Health check
app.get("/", (c) => {
  return c.json({
    name: "zesbe-modern",
    version: "1.0.0",
    status: "running",
  });
});

// Get current config
app.get("/config", async (c) => {
  const config = await loadConfig();
  return c.json({
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    yolo: config.yolo,
    theme: config.theme,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  });
});

// Update config
app.post("/config", async (c) => {
  const body = await c.req.json();
  await saveConfig(body);
  return c.json({ success: true });
});

// List providers
app.get("/providers", (c) => {
  const providers = Object.entries(DEFAULT_PROVIDERS).map(([key, value]) => ({
    id: key,
    name: value.name,
    model: value.model,
    baseUrl: value.baseUrl,
  }));
  return c.json(providers);
});

// Get tools
app.get("/tools", (c) => {
  return c.json(TOOL_DEFINITIONS);
});

// Chat endpoint (non-streaming)
app.post("/chat", async (c) => {
  try {
    const body = await c.req.json();
    const messages: Message[] = body.messages || [];
    const providerName = body.provider;
    const model = body.model;
    const useTools = body.tools !== false;

    const provider = await getProvider(providerName);
    const config = await loadConfig();

    const response = await provider.chat({
      messages,
      model: model || config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      tools: useTools ? TOOL_DEFINITIONS : undefined,
    });

    return c.json(response);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// Chat stream endpoint
app.post("/chat/stream", async (c) => {
  const body = await c.req.json();
  const messages: Message[] = body.messages || [];
  const providerName = body.provider;
  const model = body.model;
  const useTools = body.tools !== false;

  const provider = await getProvider(providerName);
  const config = await loadConfig();

  return stream(c, async (stream) => {
    try {
      const generator = provider.chatStream({
        messages,
        model: model || config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        tools: useTools ? TOOL_DEFINITIONS : undefined,
      });

      for await (const chunk of generator) {
        await stream.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch (error) {
      await stream.write(
        `data: ${JSON.stringify({
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })}\n\n`
      );
    }
  });
});

// Execute tool
app.post("/tools/execute", async (c) => {
  try {
    const body = await c.req.json();
    const { name, arguments: args } = body;

    const result = await executeTools([{ name, arguments: args, id: `tool_${Date.now()}` }]);
    return c.json(result[0]);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// Execute multiple tools
app.post("/tools/batch", async (c) => {
  try {
    const body = await c.req.json();
    const tools = body.tools || [];

    const results = await executeTools(tools);
    return c.json(results);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// Start server function
export function startServer(port: number = 3721): void {
  console.log(`\n🚀 zesbe-modern server running at http://localhost:${port}\n`);

  // Use @hono/node-server for Node.js compatibility
  import("@hono/node-server").then(({ serve }) => {
    serve({
      fetch: app.fetch,
      port,
    });
  });
}

// Export app for testing
export default app;

// Run if executed directly
if (import.meta.main) {
  const config = await loadConfig();
  startServer(config.serverPort);
}
