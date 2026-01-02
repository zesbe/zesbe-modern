import { Marked } from "marked";
import { markedTerminal } from "marked-terminal";
import chalk from "chalk";

// Configure marked for terminal output
const marked = new Marked();
marked.use(markedTerminal({
  code: chalk.yellow,
  blockquote: chalk.gray.italic,
  html: chalk.gray,
  heading: chalk.green.bold,
  firstHeading: chalk.cyan.bold,
  hr: chalk.gray,
  listitem: chalk.white,
  table: chalk.white,
  paragraph: chalk.white,
  strong: chalk.bold,
  em: chalk.italic,
  codespan: chalk.yellow,
  del: chalk.gray.strikethrough,
  link: chalk.blue.underline,
  href: chalk.blue,
}));

/**
 * Filter out thinking tags from AI response
 * Removes <think>...</think> blocks
 */
export function filterThinking(text: string): string {
  // Remove <think>...</think> blocks (including multiline)
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

/**
 * Extract thinking content from AI response
 */
export function extractThinking(text: string): string | null {
  const match = text.match(/<think>([\s\S]*?)<\/think>/i);
  return match ? match[1].trim() : null;
}

/**
 * Render markdown to terminal-friendly format
 */
export function renderMarkdown(text: string): string {
  try {
    // Filter thinking first
    const filtered = filterThinking(text);
    // Render markdown
    const rendered = marked.parse(filtered);
    return typeof rendered === "string" ? rendered.trim() : filtered;
  } catch {
    return filterThinking(text);
  }
}

/**
 * Format timestamp
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
