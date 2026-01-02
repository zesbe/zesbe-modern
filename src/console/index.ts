#!/usr/bin/env node
import readline from 'readline';
import chalk from 'chalk';
import { loadConfig } from '../config/index.js';
import { getProvider, type Message as AIMessage } from '../ai/index.js';
import { TOOL_DEFINITIONS } from '../tools/index.js';
import { SLASH_COMMANDS } from '../tui/components/CommandMenu.js';

interface ConsoleSession {
  messages: AIMessage[];
  rl: readline.Interface;
}

export async function startConsole() {
  const config = await loadConfig();

  console.log(chalk.cyan('\n╭─────────────────────────────────────────────╮'));
  console.log(chalk.cyan('│') + chalk.bold.white('          🤖 zesbe-modern Console           ') + chalk.cyan('│'));
  console.log(chalk.cyan('│') + chalk.gray('         Stable Console Interface           ') + chalk.cyan('│'));
  console.log(chalk.cyan('╰─────────────────────────────────────────────╯\n'));

  console.log(chalk.gray(`Provider: ${chalk.yellow(config.provider)} | Model: ${chalk.yellow(config.model)}`));
  console.log(chalk.gray(`YOLO Mode: ${config.yolo ? chalk.green('ON') : chalk.red('OFF')}`));
  console.log(chalk.gray('Type /help for commands, /exit to quit\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('❯ '),
  });

  const session: ConsoleSession = {
    messages: [],
    rl
  };

  rl.prompt();

  rl.on('line', async (input) => {
    const trimmed = input.trim();

    if (!trimmed) {
      rl.prompt();
      return;
    }

    try {
      await handleInput(session, trimmed);
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.gray('\nGoodbye! 👋'));
    process.exit(0);
  });
}

async function handleInput(session: ConsoleSession, input: string) {
  // Handle slash commands
  if (input.startsWith('/')) {
    await handleSlashCommand(session, input);
    return;
  }

  // Handle regular chat
  await handleChatMessage(session, input);
}

async function handleSlashCommand(session: ConsoleSession, command: string) {
  const [cmd, ...args] = command.slice(1).split(' ');

  switch (cmd) {
    case 'help':
      showHelp();
      break;

    case 'exit':
    case 'quit':
    case 'q':
      console.log(chalk.gray('Goodbye! 👋'));
      process.exit(0);
      break;

    case 'clear':
      console.clear();
      session.messages = [];
      console.log(chalk.green('✅ Conversation history cleared'));
      break;

    case 'history':
      showHistory(session);
      break;

    case 'provider':
      const config = await loadConfig();
      console.log(chalk.yellow(`Current provider: ${config.provider} (${config.model})`));
      break;

    case 'config':
      await showConfig();
      break;

    case 'tools':
      await showTools();
      break;

    default:
      console.log(chalk.red(`Unknown command: /${cmd}`));
      console.log(chalk.gray('Type /help for available commands'));
  }
}

async function handleChatMessage(session: ConsoleSession, input: string) {
  const config = await loadConfig();

  // Add user message
  session.messages.push({ role: 'user', content: input });

  console.log(chalk.gray('─'.repeat(50)));
  console.log(`${chalk.blue('You:')} ${input}`);
  console.log(chalk.gray('─'.repeat(50)));

  try {
    const provider = await getProvider();

    console.log(chalk.green('🤖 AI: ') + chalk.gray('Thinking...'));

    // Use the same way as TUI App does
    const response = await provider.chat({
      messages: session.messages,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    });

    console.log(chalk.green('🤖 AI: ') + response.content);
    session.messages.push({ role: 'assistant', content: response.content });

  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }

  console.log(chalk.gray('─'.repeat(50)));
}

function showHelp() {
  console.log(chalk.cyan('\n📚 Available Commands:\n'));

  // Group commands by category
  const grouped = SLASH_COMMANDS.reduce((acc: Record<string, typeof SLASH_COMMANDS>, cmd) => {
    const category = cmd.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(cmd);
    return acc;
  }, {});

  Object.entries(grouped).forEach(([category, commands]) => {
    console.log(chalk.yellow(`${category}:`));
    commands.forEach(cmd => {
      console.log(`  ${chalk.green(`/${cmd.name.padEnd(15)}`)} - ${cmd.description}`);
    });
    console.log();
  });
}

function showHistory(session: ConsoleSession) {
  if (session.messages.length === 0) {
    console.log(chalk.gray('No conversation history yet.'));
    return;
  }

  console.log(chalk.cyan('\n📜 Conversation History:\n'));
  session.messages.forEach((msg, i) => {
    const role = msg.role === 'user' ? chalk.blue('You') : chalk.green('AI');
    const content = typeof msg.content === 'string' ? msg.content : 'Complex message';
    console.log(`${i + 1}. ${role}: ${content.slice(0, 100)}${content.length > 100 ? '...' : ''}`);
  });
  console.log();
}

async function showConfig() {
  const config = await loadConfig();
  console.log(chalk.cyan('\n⚙️  Current Configuration:\n'));
  console.log(`  Provider:    ${chalk.yellow(config.provider)}`);
  console.log(`  Model:       ${chalk.yellow(config.model)}`);
  console.log(`  Base URL:    ${chalk.gray(config.baseUrl || '(default)')}`);
  console.log(`  YOLO:        ${config.yolo ? chalk.green('enabled') : chalk.red('disabled')}`);
  console.log(`  Theme:       ${chalk.gray(config.theme)}`);
  console.log(`  Max Tokens:  ${chalk.gray(config.maxTokens)}`);
  console.log(`  Temperature: ${chalk.gray(config.temperature)}`);
  console.log(`  Server Port: ${chalk.gray(config.serverPort)}\n`);
}

async function showTools() {
  try {
    const tools = TOOL_DEFINITIONS;
    console.log(chalk.cyan(`\n🛠️  Available Tools (${Object.keys(tools).length}):\n`));

    Object.entries(tools).forEach(([name, tool]) => {
      const description = (tool as any).description || 'No description available';
      console.log(`  ${chalk.green(name.padEnd(20))} - ${description.slice(0, 80)}${description.length > 80 ? '...' : ''}`);
    });
    console.log();
  } catch (error) {
    console.error(chalk.red(`Error loading tools: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}