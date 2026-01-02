import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { join } from "path";
import { CONFIG_DIR } from "../config";

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: string;
  thinking?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  provider: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const HISTORY_DIR = join(CONFIG_DIR, "history");

/**
 * Generate session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate session title from first message
 */
function generateTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New Chat";
  const content = firstUser.content.slice(0, 50);
  return content.length < firstUser.content.length ? content + "..." : content;
}

/**
 * Ensure history directory exists
 */
async function ensureHistoryDir(): Promise<void> {
  await mkdir(HISTORY_DIR, { recursive: true });
}

/**
 * Save chat session
 */
export async function saveSession(session: ChatSession): Promise<void> {
  await ensureHistoryDir();
  const filePath = join(HISTORY_DIR, `${session.id}.json`);
  await writeFile(filePath, JSON.stringify(session, null, 2));
}

/**
 * Load chat session by ID
 */
export async function loadSession(sessionId: string): Promise<ChatSession | null> {
  try {
    const filePath = join(HISTORY_DIR, `${sessionId}.json`);
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as ChatSession;
  } catch {
    return null;
  }
}

/**
 * List all chat sessions
 */
export async function listSessions(): Promise<ChatSession[]> {
  try {
    await ensureHistoryDir();
    const files = await readdir(HISTORY_DIR);
    const sessions: ChatSession[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = await readFile(join(HISTORY_DIR, file), "utf-8");
        sessions.push(JSON.parse(content));
      } catch {
        // Skip invalid files
      }
    }

    // Sort by updatedAt desc
    return sessions.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch {
    return [];
  }
}

/**
 * Delete chat session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const { unlink } = await import("fs/promises");
    const filePath = join(HISTORY_DIR, `${sessionId}.json`);
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create new chat session
 */
export function createSession(provider: string, model: string): ChatSession {
  const now = new Date().toISOString();
  return {
    id: generateSessionId(),
    title: "New Chat",
    provider,
    model,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

/**
 * Add message to session
 */
export function addMessage(
  session: ChatSession,
  role: ChatMessage["role"],
  content: string,
  thinking?: string
): ChatSession {
  const message: ChatMessage = {
    role,
    content,
    timestamp: new Date().toISOString(),
    thinking,
  };

  session.messages.push(message);
  session.updatedAt = new Date().toISOString();

  // Update title if this is the first user message
  if (role === "user" && session.messages.filter((m) => m.role === "user").length === 1) {
    session.title = generateTitle(session.messages);
  }

  return session;
}

/**
 * Clear all history
 */
export async function clearAllHistory(): Promise<void> {
  try {
    const { rm } = await import("fs/promises");
    await rm(HISTORY_DIR, { recursive: true, force: true });
    await ensureHistoryDir();
  } catch {
    // Ignore errors
  }
}
