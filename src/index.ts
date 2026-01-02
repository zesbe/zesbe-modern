#!/usr/bin/env bun
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import chalk from "chalk";
import { startTUI } from "./tui/index.js";
import { startServer } from "./server/index.js";
import { loadConfig, saveConfig, listProviders, DEFAULT_PROVIDERS } from "./config/index.js";

// Simple banner like Claude Code
const banner = "";

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName("zesbe")
    .usage("$0 [command] [options]")
    .command("$0", "Start interactive chat", {}, async () => {
      console.log(banner);
      await startTUI();
    })
    .command("server", "Start the backend server", {
      port: {
        alias: "p",
        type: "number",
        default: 3721,
        description: "Server port",
      },
    }, async (argv) => {
      console.log(banner);
      const config = await loadConfig();
      startServer(argv.port || config.serverPort);
    })
    .command("config", "View or edit configuration", {
      set: {
        alias: "s",
        type: "string",
        description: "Set a config value (key=value)",
      },
      list: {
        alias: "l",
        type: "boolean",
        description: "List all config values",
      },
    }, async (argv) => {
      const config = await loadConfig();

      if (argv.list) {
        console.log(chalk.cyan("\nCurrent configuration:\n"));
        console.log(`  Provider:    ${chalk.yellow(config.provider)}`);
        console.log(`  Model:       ${chalk.yellow(config.model)}`);
        console.log(`  Base URL:    ${chalk.gray(config.baseUrl || "(default)")}`);
        console.log(`  YOLO:        ${config.yolo ? chalk.green("enabled") : chalk.red("disabled")}`);
        console.log(`  Theme:       ${chalk.gray(config.theme)}`);
        console.log(`  Max Tokens:  ${chalk.gray(config.maxTokens)}`);
        console.log(`  Temperature: ${chalk.gray(config.temperature)}`);
        console.log(`  Server Port: ${chalk.gray(config.serverPort)}`);
        console.log();
        return;
      }

      if (argv.set) {
        const [key, value] = argv.set.split("=");
        if (!key || !value) {
          console.error(chalk.red("Invalid format. Use: key=value"));
          process.exit(1);
        }

        const updates: Record<string, unknown> = {};
        switch (key) {
          case "provider":
            if (!DEFAULT_PROVIDERS[value]) {
              console.error(chalk.red(`Unknown provider: ${value}`));
              console.log(chalk.gray(`Available: ${listProviders().join(", ")}`));
              process.exit(1);
            }
            updates.provider = value;
            updates.model = DEFAULT_PROVIDERS[value].model;
            updates.baseUrl = DEFAULT_PROVIDERS[value].baseUrl;
            break;
          case "model":
            updates.model = value;
            break;
          case "yolo":
            updates.yolo = value === "true" || value === "1";
            break;
          case "theme":
            updates.theme = value;
            break;
          case "maxTokens":
            updates.maxTokens = parseInt(value, 10);
            break;
          case "temperature":
            updates.temperature = parseFloat(value);
            break;
          case "serverPort":
            updates.serverPort = parseInt(value, 10);
            break;
          default:
            console.error(chalk.red(`Unknown config key: ${key}`));
            process.exit(1);
        }

        await saveConfig({ ...config, ...updates });
        console.log(chalk.green(`Updated ${key} to ${value}`));
        return;
      }

      // Default: show config
      console.log(chalk.cyan("\nCurrent configuration:\n"));
      console.log(`  Provider:    ${chalk.yellow(config.provider)}`);
      console.log(`  Model:       ${chalk.yellow(config.model)}`);
      console.log();
    })
    .command("providers", "List available providers", {}, () => {
      console.log(chalk.cyan("\nAvailable providers:\n"));
      for (const [key, provider] of Object.entries(DEFAULT_PROVIDERS)) {
        console.log(`  ${chalk.yellow(key.padEnd(12))} ${chalk.gray(provider.name)} - ${chalk.white(provider.model)}`);
      }
      console.log();
    })
    .option("provider", {
      alias: "P",
      type: "string",
      description: "Override provider for this session",
    })
    .option("model", {
      alias: "m",
      type: "string",
      description: "Override model for this session",
    })
    .option("yolo", {
      alias: "y",
      type: "boolean",
      description: "Enable YOLO mode (auto-execute tools)",
    })
    .help()
    .version("1.0.0")
    .parse();
}

main().catch((err) => {
  console.error(chalk.red("Error:"), err.message);
  process.exit(1);
});
