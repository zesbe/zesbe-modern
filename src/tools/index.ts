import { readFile, writeFile, mkdir, readdir, stat } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { dirname, join, resolve } from "path";
import type { ToolDefinition, ToolResult } from "../ai/types";

const execAsync = promisify(exec);

// Tool definitions for AI - Enterprise-grade coding tools
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // ============================================
  // 🔧 GIT OPERATIONS
  // ============================================
  {
    name: "git_status",
    description: "Show the working tree status. Use to see modified, staged, and untracked files.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Repository path (default: current directory)",
        },
      },
      required: [],
    },
  },
  {
    name: "git_diff",
    description: "Show changes between commits, commit and working tree, etc. Essential for reviewing code changes before committing.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Repository path (default: current directory)",
        },
        file: {
          type: "string",
          description: "Specific file to diff (optional)",
        },
        staged: {
          type: "string",
          description: "Set to 'true' to show staged changes",
        },
      },
      required: [],
    },
  },
  {
    name: "git_log",
    description: "Show commit history. Use to understand recent changes and find specific commits.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Repository path (default: current directory)",
        },
        count: {
          type: "string",
          description: "Number of commits to show (default: 10)",
        },
        oneline: {
          type: "string",
          description: "Set to 'true' for compact one-line format",
        },
      },
      required: [],
    },
  },
  {
    name: "git_commit",
    description: "Record changes to the repository. Use after staging files with git add.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Commit message",
        },
        path: {
          type: "string",
          description: "Repository path (default: current directory)",
        },
        all: {
          type: "string",
          description: "Set to 'true' to automatically stage all modified files",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "git_branch",
    description: "List, create, or switch branches.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Action: 'list', 'create', 'switch', 'delete'",
        },
        name: {
          type: "string",
          description: "Branch name (for create/switch/delete)",
        },
        path: {
          type: "string",
          description: "Repository path (default: current directory)",
        },
      },
      required: [],
    },
  },
  {
    name: "git_stash",
    description: "Stash changes in a dirty working directory. Use to temporarily save changes without committing.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Action: 'push' (save), 'pop' (restore), 'list', 'drop', 'show'",
        },
        message: {
          type: "string",
          description: "Optional message for stash (used with 'push')",
        },
        index: {
          type: "string",
          description: "Stash index (e.g., '0', '1') for pop/drop/show",
        },
        path: {
          type: "string",
          description: "Repository path (default: current directory)",
        },
      },
      required: [],
    },
  },
  {
    name: "git_add",
    description: "Stage files for commit. Use before git_commit.",
    parameters: {
      type: "object",
      properties: {
        files: {
          type: "string",
          description: "Files to stage (space-separated, or '.' for all)",
        },
        path: {
          type: "string",
          description: "Repository path (default: current directory)",
        },
      },
      required: ["files"],
    },
  },
  {
    name: "git_reset",
    description: "Unstage files or reset to a previous state.",
    parameters: {
      type: "object",
      properties: {
        files: {
          type: "string",
          description: "Files to unstage (optional)",
        },
        mode: {
          type: "string",
          description: "Reset mode: 'soft', 'mixed' (default), 'hard'",
        },
        commit: {
          type: "string",
          description: "Commit to reset to (e.g., 'HEAD~1')",
        },
        path: {
          type: "string",
          description: "Repository path (default: current directory)",
        },
      },
      required: [],
    },
  },
  // ============================================
  // 🔒 SECURITY & AUDIT
  // ============================================
  {
    name: "audit_security",
    description: "Check for security vulnerabilities in project dependencies.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Project path (default: current directory)",
        },
        fix: {
          type: "string",
          description: "Set to 'true' to attempt automatic fixes",
        },
      },
      required: [],
    },
  },
  {
    name: "env_info",
    description: "Get system and environment information for debugging.",
    parameters: {
      type: "object",
      properties: {
        detailed: {
          type: "string",
          description: "Set to 'true' for detailed info",
        },
      },
      required: [],
    },
  },
  {
    name: "format_code",
    description: "Format code files using project's formatter (prettier, rustfmt, gofmt, black, etc.).",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File or directory to format (default: current directory)",
        },
        check: {
          type: "string",
          description: "Set to 'true' to check without modifying",
        },
      },
      required: [],
    },
  },
  // ============================================
  // 📁 FILE OPERATIONS
  // ============================================
  {
    name: "read_file",
    description: "Read the contents of a file. Use this to understand existing code before making changes.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The path to the file to read",
        },
        line_start: {
          type: "string",
          description: "Optional: Start line number to read from",
        },
        line_end: {
          type: "string",
          description: "Optional: End line number to read to",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write or overwrite a file with new content. Creates directories if needed. Use for creating new files.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The path to the file to write",
        },
        content: {
          type: "string",
          description: "The complete content to write to the file",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "Edit a file by replacing specific text. Use this for surgical code changes instead of rewriting entire files.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The path to the file to edit",
        },
        old_text: {
          type: "string",
          description: "The exact text to find and replace (must match exactly)",
        },
        new_text: {
          type: "string",
          description: "The new text to replace with",
        },
      },
      required: ["path", "old_text", "new_text"],
    },
  },
  {
    name: "list_directory",
    description: "List files and directories. Use to explore project structure.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The directory path to list (default: current directory)",
        },
        recursive: {
          type: "string",
          description: "Set to 'true' for recursive listing",
        },
      },
      required: [],
    },
  },
  {
    name: "run_command",
    description: "Execute a shell command. Use for: git, npm, running tests, building projects, etc.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The shell command to execute",
        },
        cwd: {
          type: "string",
          description: "Working directory for the command",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "search_code",
    description: "Search for text/pattern in code files. Use grep-like search to find code patterns, function definitions, imports, etc.",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Text or regex pattern to search for",
        },
        path: {
          type: "string",
          description: "Directory to search in (default: current directory)",
        },
        file_pattern: {
          type: "string",
          description: "File pattern to filter (e.g., '*.ts', '*.py')",
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "glob_files",
    description: "Find files matching a glob pattern. Use to locate files by name pattern.",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Glob pattern (e.g., '**/*.ts', 'src/**/*.js', '*.json')",
        },
        path: {
          type: "string",
          description: "Base directory to search from",
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "web_search",
    description: "Search the web for documentation, tutorials, API references, or any information. Use this to find up-to-date information about libraries, frameworks, error solutions, etc.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query (e.g., 'React useEffect cleanup', 'TypeScript generics tutorial')",
        },
        num_results: {
          type: "string",
          description: "Number of results to return (default: 5, max: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "web_fetch",
    description: "Fetch and read content from a URL. Use to read documentation pages, API references, blog posts, or any web content.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch content from",
        },
        selector: {
          type: "string",
          description: "Optional: CSS selector to extract specific content (e.g., 'article', '.main-content')",
        },
      },
      required: ["url"],
    },
  },
  // ============================================
  // 🛠️ DEVELOPMENT TOOLS
  // ============================================
  {
    name: "analyze_project",
    description: "Analyze project structure, dependencies, and configuration. Returns comprehensive project overview including tech stack, entry points, and key files.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Project root path (default: current directory)",
        },
      },
      required: [],
    },
  },
  {
    name: "package_manager",
    description: "Execute package manager commands (npm, yarn, pnpm, pip, cargo, go). Install, update, or remove dependencies.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Action: 'install', 'add', 'remove', 'update', 'list', 'outdated', 'audit'",
        },
        packages: {
          type: "string",
          description: "Package names (space-separated for multiple)",
        },
        dev: {
          type: "string",
          description: "Set to 'true' for dev dependencies",
        },
        path: {
          type: "string",
          description: "Project path (default: current directory)",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "run_tests",
    description: "Run project tests. Automatically detects test framework (jest, vitest, pytest, go test, cargo test).",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Project path (default: current directory)",
        },
        filter: {
          type: "string",
          description: "Test name filter/pattern",
        },
        watch: {
          type: "string",
          description: "Set to 'true' for watch mode",
        },
      },
      required: [],
    },
  },
  {
    name: "lint_code",
    description: "Run linter on code. Automatically detects linter (eslint, prettier, ruff, clippy).",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File or directory path",
        },
        fix: {
          type: "string",
          description: "Set to 'true' to auto-fix issues",
        },
      },
      required: [],
    },
  },
  {
    name: "build_project",
    description: "Build the project. Detects build system (npm, cargo, go, make).",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Project path (default: current directory)",
        },
        production: {
          type: "string",
          description: "Set to 'true' for production build",
        },
      },
      required: [],
    },
  },
  {
    name: "find_definition",
    description: "Find where a symbol (function, class, variable) is defined in the codebase.",
    parameters: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "The symbol name to find",
        },
        path: {
          type: "string",
          description: "Search path (default: current directory)",
        },
        type: {
          type: "string",
          description: "Symbol type: 'function', 'class', 'variable', 'interface', 'type' (optional)",
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "find_references",
    description: "Find all references/usages of a symbol in the codebase.",
    parameters: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "The symbol name to find references for",
        },
        path: {
          type: "string",
          description: "Search path (default: current directory)",
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "tree",
    description: "Display directory structure as a tree. Great for understanding project layout.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path (default: current directory)",
        },
        depth: {
          type: "string",
          description: "Maximum depth (default: 3)",
        },
        show_hidden: {
          type: "string",
          description: "Set to 'true' to show hidden files",
        },
      },
      required: [],
    },
  },
  {
    name: "diff_files",
    description: "Compare two files and show differences.",
    parameters: {
      type: "object",
      properties: {
        file1: {
          type: "string",
          description: "First file path",
        },
        file2: {
          type: "string",
          description: "Second file path",
        },
      },
      required: ["file1", "file2"],
    },
  },
  {
    name: "batch_edit",
    description: "Apply the same edit to multiple files. Useful for refactoring across codebase.",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "File glob pattern (e.g., 'src/**/*.ts')",
        },
        old_text: {
          type: "string",
          description: "Text to find and replace",
        },
        new_text: {
          type: "string",
          description: "Replacement text",
        },
        path: {
          type: "string",
          description: "Base path (default: current directory)",
        },
      },
      required: ["pattern", "old_text", "new_text"],
    },
  },
];

// Tool implementations
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const toolCallId = `tool_${Date.now()}`;

  try {
    let output: string;

    switch (name) {
      case "read_file": {
        const path = resolve(args.path as string);
        const content = await readFile(path, "utf-8");
        const lines = content.split("\n");

        // Support line range
        const lineStart = args.line_start ? parseInt(args.line_start as string, 10) - 1 : 0;
        const lineEnd = args.line_end ? parseInt(args.line_end as string, 10) : lines.length;

        const selectedLines = lines.slice(lineStart, lineEnd);
        // Add line numbers
        output = selectedLines
          .map((line, i) => `${String(lineStart + i + 1).padStart(4)} │ ${line}`)
          .join("\n");
        break;
      }

      case "write_file": {
        const path = resolve(args.path as string);
        const content = args.content as string;
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content, "utf-8");
        output = `Successfully wrote ${content.length} bytes to ${path}`;
        break;
      }

      case "edit_file": {
        const path = resolve(args.path as string);
        const oldText = args.old_text as string;
        const newText = args.new_text as string;

        const content = await readFile(path, "utf-8");
        if (!content.includes(oldText)) {
          return {
            toolCallId,
            success: false,
            error: `Text not found in file. Make sure old_text matches exactly.`,
          };
        }

        const newContent = content.replace(oldText, newText);
        await writeFile(path, newContent, "utf-8");
        output = `Successfully edited ${path}\nReplaced ${oldText.length} chars with ${newText.length} chars`;
        break;
      }

      case "list_directory": {
        const dirPath = resolve((args.path as string) || ".");
        const recursive = args.recursive === "true";

        if (recursive) {
          // Recursive listing using find, excluding common large directories
          const { stdout } = await execAsync(
            `find "${dirPath}" -maxdepth 4 \\( -name "node_modules" -o -name ".git" -o -name "dist" -o -name "build" -o -name ".cache" -o -name "__pycache__" \\) -prune -o -print 2>/dev/null | head -80`,
            { timeout: 10000 }
          );
          output = stdout || "No files found";
        } else {
          const entries = await readdir(dirPath, { withFileTypes: true });
          const formatted = entries.map((e) => {
            const type = e.isDirectory() ? "[DIR]" : "[FILE]";
            return `${type} ${e.name}`;
          });
          output = formatted.join("\n");
        }
        break;
      }

      case "run_command": {
        const command = args.command as string;
        const cwd = (args.cwd as string) || process.cwd();
        const { stdout, stderr } = await execAsync(command, {
          cwd,
          timeout: 30000,
          maxBuffer: 1024 * 1024,
        });
        output = stdout || stderr || "(no output)";
        break;
      }

      case "search_code": {
        const pattern = args.pattern as string;
        const searchPath = resolve((args.path as string) || ".");
        const filePattern = args.file_pattern as string;

        // Build grep command
        let cmd = `grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" --include="*.go" --include="*.rs" --include="*.java" --include="*.json" --include="*.md"`;

        if (filePattern) {
          cmd = `grep -rn --include="${filePattern}"`;
        }

        cmd += ` "${pattern}" "${searchPath}" 2>/dev/null | head -50`;

        const { stdout } = await execAsync(cmd, { timeout: 15000 });
        output = stdout || "No matches found";
        break;
      }

      case "glob_files": {
        const pattern = args.pattern as string;
        const basePath = resolve((args.path as string) || ".");

        // Use find with pattern matching
        const { stdout } = await execAsync(
          `find "${basePath}" -type f -name "${pattern.replace(/\*\*/g, '*')}" 2>/dev/null | head -100`,
          { timeout: 10000 }
        );
        output = stdout || "No files found";
        break;
      }

      case "web_search": {
        const query = encodeURIComponent(args.query as string);
        const numResults = Math.min(parseInt(args.num_results as string) || 5, 10);

        try {
          // Use DuckDuckGo HTML for search
          const { stdout } = await execAsync(
            `curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "https://html.duckduckgo.com/html/?q=${query}"`,
            { timeout: 15000, maxBuffer: 1024 * 1024 }
          );

          // Parse search results - look for organic results
          const results: string[] = [];
          const regex = /<a rel="nofollow" class="result__a" href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
          let match;
          let count = 0;

          while ((match = regex.exec(stdout)) !== null && count < numResults) {
            let url = match[1];
            const title = match[2].trim();

            // Extract actual URL from DuckDuckGo redirect
            const uddgMatch = url.match(/uddg=([^&]*)/);
            if (uddgMatch) {
              url = decodeURIComponent(uddgMatch[1]);
            }

            // Skip ads and DuckDuckGo tracking links
            if (
              url.includes("duckduckgo.com") ||
              url.includes("ad_provider") ||
              url.includes("ad_domain") ||
              url.includes("/y.js") ||
              url.includes("bing.com/aclick") ||
              url.includes("click_metadata")
            ) {
              continue;
            }

            // Clean up URL - remove tracking params
            try {
              const cleanUrl = new URL(url);
              cleanUrl.searchParams.delete("utm_source");
              cleanUrl.searchParams.delete("utm_medium");
              cleanUrl.searchParams.delete("utm_campaign");
              url = cleanUrl.toString();
            } catch {}

            results.push(`${count + 1}. **${title}**\n   ${url}`);
            count++;
          }

          if (results.length === 0) {
            output = "No organic search results found. The query might be too broad or DDG is returning only ads. Try a more specific query or use web_fetch with a known URL.";
          } else {
            output = `🔍 Search results for "${args.query}":\n\n${results.join("\n\n")}`;
          }
        } catch (e) {
          output = `Search failed: ${e instanceof Error ? e.message : 'Check your internet connection.'}`;
        }
        break;
      }

      case "web_fetch": {
        const url = args.url as string;

        try {
          // Fetch with curl, convert HTML to readable text
          const { stdout } = await execAsync(
            `curl -s -L -A "Mozilla/5.0" --max-time 10 "${url}" | sed 's/<script[^>]*>.*<\\/script>//g' | sed 's/<style[^>]*>.*<\\/style>//g' | sed 's/<[^>]*>//g' | sed 's/&nbsp;/ /g' | sed 's/&amp;/\\&/g' | sed 's/&lt;/</g' | sed 's/&gt;/>/g' | tr -s ' \\n' | head -200`,
            { timeout: 20000, maxBuffer: 2 * 1024 * 1024 }
          );

          if (!stdout.trim()) {
            output = "Could not fetch content from URL. The page might be JavaScript-rendered.";
          } else {
            // Clean up and truncate
            const cleaned = stdout
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0)
              .join('\n')
              .slice(0, 8000);
            output = `Content from ${url}:\n\n${cleaned}`;
          }
        } catch (e) {
          output = `Failed to fetch URL: ${e instanceof Error ? e.message : 'Unknown error'}`;
        }
        break;
      }

      // ============================================
      // GIT OPERATIONS
      // ============================================
      case "git_status": {
        const gitPath = resolve((args.path as string) || ".");
        const { stdout } = await execAsync(`cd "${gitPath}" && git status --short --branch`, { timeout: 10000 });
        output = stdout || "No changes";
        break;
      }

      case "git_diff": {
        const gitPath = resolve((args.path as string) || ".");
        const file = args.file ? ` -- "${args.file}"` : "";
        const staged = args.staged === "true" ? " --staged" : "";
        const { stdout } = await execAsync(`cd "${gitPath}" && git diff${staged}${file}`, { timeout: 15000, maxBuffer: 2 * 1024 * 1024 });
        output = stdout || "No differences";
        break;
      }

      case "git_log": {
        const gitPath = resolve((args.path as string) || ".");
        const count = parseInt(args.count as string) || 10;
        const format = args.oneline === "true" ? "--oneline" : "--pretty=format:'%h %s (%cr) <%an>'";
        const { stdout } = await execAsync(`cd "${gitPath}" && git log -${count} ${format}`, { timeout: 10000 });
        output = stdout || "No commits";
        break;
      }

      case "git_commit": {
        const gitPath = resolve((args.path as string) || ".");
        const message = args.message as string;
        const all = args.all === "true" ? "-a " : "";
        const { stdout } = await execAsync(`cd "${gitPath}" && git commit ${all}-m "${message.replace(/"/g, '\\"')}"`, { timeout: 15000 });
        output = stdout || "Committed";
        break;
      }

      case "git_branch": {
        const gitPath = resolve((args.path as string) || ".");
        const action = (args.action as string) || "list";
        const branchName = args.name as string;

        switch (action) {
          case "list":
            const { stdout: listOut } = await execAsync(`cd "${gitPath}" && git branch -a`, { timeout: 10000 });
            output = listOut || "No branches";
            break;
          case "create":
            const { stdout: createOut } = await execAsync(`cd "${gitPath}" && git branch "${branchName}"`, { timeout: 10000 });
            output = createOut || `Created branch: ${branchName}`;
            break;
          case "switch":
            const { stdout: switchOut } = await execAsync(`cd "${gitPath}" && git checkout "${branchName}"`, { timeout: 10000 });
            output = switchOut || `Switched to: ${branchName}`;
            break;
          case "delete":
            const { stdout: deleteOut } = await execAsync(`cd "${gitPath}" && git branch -d "${branchName}"`, { timeout: 10000 });
            output = deleteOut || `Deleted branch: ${branchName}`;
            break;
          default:
            output = `Unknown action: ${action}`;
        }
        break;
      }

      case "git_stash": {
        const gitPath = resolve((args.path as string) || ".");
        const action = (args.action as string) || "list";
        const message = args.message as string;
        const index = args.index || "0";

        switch (action) {
          case "push":
            const msgFlag = message ? ` -m "${message.replace(/"/g, '\\"')}"` : "";
            const { stdout: pushOut } = await execAsync(`cd "${gitPath}" && git stash push${msgFlag}`, { timeout: 10000 });
            output = pushOut || "Changes stashed";
            break;
          case "pop":
            const { stdout: popOut } = await execAsync(`cd "${gitPath}" && git stash pop stash@{${index}}`, { timeout: 10000 });
            output = popOut || "Stash applied and dropped";
            break;
          case "list":
            const { stdout: listOut } = await execAsync(`cd "${gitPath}" && git stash list`, { timeout: 10000 });
            output = listOut || "No stashes";
            break;
          case "drop":
            const { stdout: dropOut } = await execAsync(`cd "${gitPath}" && git stash drop stash@{${index}}`, { timeout: 10000 });
            output = dropOut || `Dropped stash@{${index}}`;
            break;
          case "show":
            const { stdout: showOut } = await execAsync(`cd "${gitPath}" && git stash show -p stash@{${index}}`, { timeout: 10000 });
            output = showOut || "Empty stash";
            break;
          default:
            output = `Unknown stash action: ${action}`;
        }
        break;
      }

      case "git_add": {
        const gitPath = resolve((args.path as string) || ".");
        const files = args.files as string;
        const { stdout, stderr } = await execAsync(`cd "${gitPath}" && git add ${files}`, { timeout: 10000 });
        output = stdout || stderr || `Staged: ${files}`;
        break;
      }

      case "git_reset": {
        const gitPath = resolve((args.path as string) || ".");
        const files = args.files as string;
        const mode = args.mode as string;
        const commit = args.commit as string;

        if (files) {
          // Unstage specific files
          const { stdout } = await execAsync(`cd "${gitPath}" && git reset HEAD -- ${files}`, { timeout: 10000 });
          output = stdout || `Unstaged: ${files}`;
        } else if (commit) {
          // Reset to specific commit
          const resetMode = mode ? `--${mode}` : "--mixed";
          const { stdout } = await execAsync(`cd "${gitPath}" && git reset ${resetMode} ${commit}`, { timeout: 10000 });
          output = stdout || `Reset to ${commit}`;
        } else {
          // Unstage all
          const { stdout } = await execAsync(`cd "${gitPath}" && git reset HEAD`, { timeout: 10000 });
          output = stdout || "Unstaged all changes";
        }
        break;
      }

      // ============================================
      // SECURITY & AUDIT
      // ============================================
      case "audit_security": {
        const projectPath = resolve((args.path as string) || ".");
        const fix = args.fix === "true";

        // Detect project type and run appropriate audit
        let cmd = "";
        try {
          await stat(join(projectPath, "package.json"));
          cmd = fix ? "npm audit fix" : "npm audit";
        } catch {
          try {
            await stat(join(projectPath, "Cargo.toml"));
            cmd = "cargo audit";
          } catch {
            try {
              await stat(join(projectPath, "requirements.txt"));
              cmd = "pip-audit";
            } catch {
              try {
                await stat(join(projectPath, "go.mod"));
                cmd = "govulncheck ./...";
              } catch {}
            }
          }
        }

        if (!cmd) {
          output = "Could not detect project type for security audit";
        } else {
          try {
            const { stdout, stderr } = await execAsync(`cd "${projectPath}" && ${cmd}`, { timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
            output = stdout || stderr || "Audit completed with no issues";
          } catch (e: any) {
            // npm audit exits with non-zero if vulnerabilities found
            output = e.stdout || e.stderr || e.message;
          }
        }
        break;
      }

      case "env_info": {
        const detailed = args.detailed === "true";
        const info: string[] = ["🖥️ **Environment Info**\n"];

        // Basic info
        info.push(`**Platform:** ${process.platform}`);
        info.push(`**Architecture:** ${process.arch}`);
        info.push(`**Node.js:** ${process.version}`);
        info.push(`**CWD:** ${process.cwd()}`);
        info.push(`**User:** ${process.env.USER || process.env.USERNAME || "unknown"}`);
        info.push(`**Shell:** ${process.env.SHELL || "unknown"}`);

        if (detailed) {
          // Get tool versions
          const tools = [
            { name: "npm", cmd: "npm --version" },
            { name: "git", cmd: "git --version" },
            { name: "python", cmd: "python3 --version 2>&1 || python --version" },
            { name: "go", cmd: "go version" },
            { name: "cargo", cmd: "cargo --version" },
          ];

          for (const tool of tools) {
            try {
              const { stdout } = await execAsync(tool.cmd, { timeout: 5000 });
              info.push(`**${tool.name}:** ${stdout.trim()}`);
            } catch {}
          }

          // Memory info
          const mem = process.memoryUsage();
          info.push(`**Memory (Heap):** ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`);
        }

        output = info.join("\n");
        break;
      }

      case "format_code": {
        const formatPath = resolve((args.path as string) || ".");
        const checkOnly = args.check === "true";

        // Detect formatter
        let cmd = "";
        try {
          const pkg = JSON.parse(await readFile(join(formatPath, "package.json"), "utf-8"));
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          if (deps.prettier) {
            cmd = checkOnly ? "npx prettier --check ." : "npx prettier --write .";
          } else if (deps.biome) {
            cmd = checkOnly ? "npx biome check ." : "npx biome format --write .";
          }
        } catch {}

        if (!cmd) {
          try {
            await stat(join(formatPath, "Cargo.toml"));
            cmd = checkOnly ? "cargo fmt -- --check" : "cargo fmt";
          } catch {}
        }

        if (!cmd) {
          try {
            await stat(join(formatPath, "go.mod"));
            const goFiles = (args.path as string) || ".";
            cmd = checkOnly ? `gofmt -l ${goFiles}` : `gofmt -w ${goFiles}`;
          } catch {}
        }

        if (!cmd) {
          try {
            await stat(join(formatPath, "pyproject.toml"));
            cmd = checkOnly ? "black --check ." : "black .";
          } catch {}
        }

        if (!cmd) {
          output = "Could not detect code formatter. Install prettier, rustfmt, gofmt, or black.";
        } else {
          try {
            const { stdout, stderr } = await execAsync(`cd "${formatPath}" && ${cmd}`, { timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
            output = stdout || stderr || "Formatting completed";
          } catch (e: any) {
            output = e.stdout || e.stderr || e.message;
          }
        }
        break;
      }

      // ============================================
      // DEVELOPMENT TOOLS
      // ============================================
      case "analyze_project": {
        const projectPath = resolve((args.path as string) || ".");
        const analysis: string[] = ["📊 **Project Analysis**\n"];

        // Check for package.json (Node.js)
        try {
          const pkgContent = await readFile(join(projectPath, "package.json"), "utf-8");
          const pkg = JSON.parse(pkgContent);
          analysis.push(`**Tech Stack:** Node.js / ${pkg.type === "module" ? "ESM" : "CommonJS"}`);
          analysis.push(`**Name:** ${pkg.name || "unnamed"}`);
          analysis.push(`**Version:** ${pkg.version || "0.0.0"}`);
          if (pkg.scripts) {
            analysis.push(`**Scripts:** ${Object.keys(pkg.scripts).join(", ")}`);
          }
          const deps = Object.keys(pkg.dependencies || {}).length;
          const devDeps = Object.keys(pkg.devDependencies || {}).length;
          analysis.push(`**Dependencies:** ${deps} prod, ${devDeps} dev`);

          // Detect frameworks
          const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
          const frameworks: string[] = [];
          if (allDeps.react) frameworks.push("React");
          if (allDeps.vue) frameworks.push("Vue");
          if (allDeps.next) frameworks.push("Next.js");
          if (allDeps.express) frameworks.push("Express");
          if (allDeps.hono) frameworks.push("Hono");
          if (allDeps.typescript) frameworks.push("TypeScript");
          if (frameworks.length) analysis.push(`**Frameworks:** ${frameworks.join(", ")}`);
        } catch {}

        // Check for Cargo.toml (Rust)
        try {
          await stat(join(projectPath, "Cargo.toml"));
          analysis.push(`**Tech Stack:** Rust`);
        } catch {}

        // Check for go.mod (Go)
        try {
          const goMod = await readFile(join(projectPath, "go.mod"), "utf-8");
          const modMatch = goMod.match(/module\s+(\S+)/);
          analysis.push(`**Tech Stack:** Go`);
          if (modMatch) analysis.push(`**Module:** ${modMatch[1]}`);
        } catch {}

        // Check for pyproject.toml or requirements.txt (Python)
        try {
          await stat(join(projectPath, "pyproject.toml"));
          analysis.push(`**Tech Stack:** Python (pyproject.toml)`);
        } catch {
          try {
            await stat(join(projectPath, "requirements.txt"));
            analysis.push(`**Tech Stack:** Python (requirements.txt)`);
          } catch {}
        }

        // List key directories
        try {
          const entries = await readdir(projectPath, { withFileTypes: true });
          const dirs = entries.filter(e => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules")
            .map(e => e.name);
          if (dirs.length) analysis.push(`**Directories:** ${dirs.join(", ")}`);
        } catch {}

        output = analysis.length > 1 ? analysis.join("\n") : "Could not analyze project";
        break;
      }

      case "package_manager": {
        const projectPath = resolve((args.path as string) || ".");
        const action = args.action as string;
        const packages = args.packages as string || "";
        const isDev = args.dev === "true";

        // Detect package manager
        let pm = "npm";
        try {
          await stat(join(projectPath, "pnpm-lock.yaml"));
          pm = "pnpm";
        } catch {
          try {
            await stat(join(projectPath, "yarn.lock"));
            pm = "yarn";
          } catch {
            try {
              await stat(join(projectPath, "Cargo.toml"));
              pm = "cargo";
            } catch {
              try {
                await stat(join(projectPath, "go.mod"));
                pm = "go";
              } catch {
                try {
                  await stat(join(projectPath, "requirements.txt"));
                  pm = "pip";
                } catch {}
              }
            }
          }
        }

        let cmd = "";
        switch (pm) {
          case "npm":
          case "pnpm":
          case "yarn":
            const devFlag = isDev ? (pm === "yarn" ? " --dev" : " -D") : "";
            switch (action) {
              case "install": cmd = `${pm} install`; break;
              case "add": cmd = `${pm} ${pm === "yarn" ? "add" : "install"} ${packages}${devFlag}`; break;
              case "remove": cmd = `${pm} ${pm === "yarn" ? "remove" : "uninstall"} ${packages}`; break;
              case "update": cmd = `${pm} update ${packages}`; break;
              case "list": cmd = `${pm} list --depth=0`; break;
              case "outdated": cmd = `${pm} outdated`; break;
              case "audit": cmd = `${pm} audit`; break;
            }
            break;
          case "cargo":
            switch (action) {
              case "add": cmd = `cargo add ${packages}${isDev ? " --dev" : ""}`; break;
              case "remove": cmd = `cargo remove ${packages}`; break;
              case "update": cmd = `cargo update`; break;
            }
            break;
          case "pip":
            switch (action) {
              case "install": cmd = `pip install -r requirements.txt`; break;
              case "add": cmd = `pip install ${packages}`; break;
              case "remove": cmd = `pip uninstall -y ${packages}`; break;
              case "list": cmd = `pip list`; break;
              case "outdated": cmd = `pip list --outdated`; break;
            }
            break;
          case "go":
            switch (action) {
              case "install": cmd = `go mod download`; break;
              case "add": cmd = `go get ${packages}`; break;
              case "update": cmd = `go get -u ${packages || "./..."}`; break;
            }
            break;
        }

        if (!cmd) {
          output = `Unknown action '${action}' for ${pm}`;
        } else {
          const { stdout, stderr } = await execAsync(`cd "${projectPath}" && ${cmd}`, { timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
          output = stdout || stderr || `${action} completed`;
        }
        break;
      }

      case "run_tests": {
        const projectPath = resolve((args.path as string) || ".");
        const filter = args.filter ? ` ${args.filter}` : "";

        // Detect test framework
        let cmd = "";
        try {
          const pkg = JSON.parse(await readFile(join(projectPath, "package.json"), "utf-8"));
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          if (deps.vitest) cmd = `npx vitest run${filter}`;
          else if (deps.jest) cmd = `npx jest${filter}`;
          else if (pkg.scripts?.test) cmd = `npm test`;
        } catch {}

        if (!cmd) {
          try {
            await stat(join(projectPath, "Cargo.toml"));
            cmd = `cargo test${filter}`;
          } catch {}
        }

        if (!cmd) {
          try {
            await stat(join(projectPath, "go.mod"));
            cmd = `go test ./...${filter}`;
          } catch {}
        }

        if (!cmd) {
          try {
            await stat(join(projectPath, "pytest.ini"));
            cmd = `pytest${filter}`;
          } catch {
            try {
              await stat(join(projectPath, "pyproject.toml"));
              cmd = `pytest${filter}`;
            } catch {}
          }
        }

        if (!cmd) {
          output = "Could not detect test framework";
        } else {
          const { stdout, stderr } = await execAsync(`cd "${projectPath}" && ${cmd}`, { timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
          output = stdout || stderr || "Tests completed";
        }
        break;
      }

      case "lint_code": {
        const lintPath = resolve((args.path as string) || ".");
        const fix = args.fix === "true" ? " --fix" : "";

        // Detect linter
        let cmd = "";
        try {
          const pkg = JSON.parse(await readFile(join(lintPath, "package.json"), "utf-8"));
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          if (deps.eslint) cmd = `npx eslint .${fix}`;
          else if (deps.biome) cmd = `npx biome check .${fix ? " --apply" : ""}`;
        } catch {}

        if (!cmd) {
          try {
            await stat(join(lintPath, "Cargo.toml"));
            cmd = `cargo clippy`;
          } catch {}
        }

        if (!cmd) {
          try {
            await stat(join(lintPath, "pyproject.toml"));
            cmd = `ruff check .${fix}`;
          } catch {}
        }

        if (!cmd) {
          output = "Could not detect linter";
        } else {
          const { stdout, stderr } = await execAsync(`cd "${lintPath}" && ${cmd}`, { timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
          output = stdout || stderr || "Lint completed";
        }
        break;
      }

      case "build_project": {
        const buildPath = resolve((args.path as string) || ".");
        const prod = args.production === "true";

        let cmd = "";
        try {
          const pkg = JSON.parse(await readFile(join(buildPath, "package.json"), "utf-8"));
          if (pkg.scripts?.build) cmd = `npm run build`;
        } catch {}

        if (!cmd) {
          try {
            await stat(join(buildPath, "Cargo.toml"));
            cmd = prod ? `cargo build --release` : `cargo build`;
          } catch {}
        }

        if (!cmd) {
          try {
            await stat(join(buildPath, "go.mod"));
            cmd = `go build ./...`;
          } catch {}
        }

        if (!cmd) {
          try {
            await stat(join(buildPath, "Makefile"));
            cmd = `make`;
          } catch {}
        }

        if (!cmd) {
          output = "Could not detect build system";
        } else {
          const { stdout, stderr } = await execAsync(`cd "${buildPath}" && ${cmd}`, { timeout: 180000, maxBuffer: 2 * 1024 * 1024 });
          output = stdout || stderr || "Build completed";
        }
        break;
      }

      case "find_definition": {
        const symbol = args.symbol as string;
        const searchPath = resolve((args.path as string) || ".");
        const symbolType = args.type as string;

        // Build regex patterns for different symbol types
        let patterns: string[] = [];
        if (!symbolType || symbolType === "function") {
          patterns.push(`(function\\s+${symbol}|const\\s+${symbol}\\s*=|${symbol}\\s*=\\s*function|${symbol}\\s*=\\s*\\(|def\\s+${symbol}|fn\\s+${symbol}|func\\s+${symbol})`);
        }
        if (!symbolType || symbolType === "class") {
          patterns.push(`(class\\s+${symbol}|struct\\s+${symbol}|type\\s+${symbol}\\s+struct)`);
        }
        if (!symbolType || symbolType === "interface") {
          patterns.push(`(interface\\s+${symbol}|type\\s+${symbol}\\s+interface)`);
        }
        if (!symbolType || symbolType === "type") {
          patterns.push(`(type\\s+${symbol}\\s*=)`);
        }

        const pattern = patterns.join("|");
        const { stdout } = await execAsync(
          `grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" --include="*.go" --include="*.rs" -E "${pattern}" "${searchPath}" 2>/dev/null | head -20`,
          { timeout: 15000 }
        );
        output = stdout || `No definition found for: ${symbol}`;
        break;
      }

      case "find_references": {
        const symbol = args.symbol as string;
        const searchPath = resolve((args.path as string) || ".");

        const { stdout } = await execAsync(
          `grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" --include="*.go" --include="*.rs" "\\b${symbol}\\b" "${searchPath}" 2>/dev/null | head -50`,
          { timeout: 15000 }
        );
        output = stdout || `No references found for: ${symbol}`;
        break;
      }

      case "tree": {
        const treePath = resolve((args.path as string) || ".");
        const depth = parseInt(args.depth as string) || 3;
        const showHidden = args.show_hidden === "true" ? "" : " -I 'node_modules|.git|dist|build|__pycache__|.cache'";

        // Try native tree command first, fallback to find
        try {
          const { stdout } = await execAsync(`tree -L ${depth}${showHidden} "${treePath}" 2>/dev/null || find "${treePath}" -maxdepth ${depth} -type f -o -type d 2>/dev/null | head -100`, { timeout: 10000 });
          output = stdout;
        } catch {
          output = "Could not generate tree view";
        }
        break;
      }

      case "diff_files": {
        const file1 = resolve(args.file1 as string);
        const file2 = resolve(args.file2 as string);

        const { stdout } = await execAsync(`diff -u "${file1}" "${file2}" 2>/dev/null || true`, { timeout: 10000 });
        output = stdout || "Files are identical";
        break;
      }

      case "batch_edit": {
        const pattern = args.pattern as string;
        const oldText = args.old_text as string;
        const newText = args.new_text as string;
        const basePath = resolve((args.path as string) || ".");

        // Find matching files
        const { stdout: filesOut } = await execAsync(
          `find "${basePath}" -type f -name "${pattern.replace(/\*\*/g, '*')}" ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null`,
          { timeout: 10000 }
        );

        const files = filesOut.split('\n').filter(f => f.trim());
        let edited = 0;

        for (const file of files) {
          try {
            const content = await readFile(file, "utf-8");
            if (content.includes(oldText)) {
              const newContent = content.split(oldText).join(newText);
              await writeFile(file, newContent, "utf-8");
              edited++;
            }
          } catch {}
        }

        output = `Batch edit complete: ${edited} files modified out of ${files.length} matched`;
        break;
      }

      default:
        return {
          toolCallId,
          success: false,
          error: `Unknown tool: ${name}`,
        };
    }

    return {
      toolCallId,
      success: true,
      output,
    };
  } catch (error) {
    return {
      toolCallId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Execute multiple tools
export async function executeTools(
  tools: { name: string; arguments: Record<string, unknown>; id: string }[]
): Promise<ToolResult[]> {
  const results = await Promise.all(
    tools.map(async (tool) => {
      const result = await executeTool(tool.name, tool.arguments);
      result.toolCallId = tool.id;
      return result;
    })
  );
  return results;
}

// Get tool by name
export function getTool(name: string): ToolDefinition | undefined {
  return TOOL_DEFINITIONS.find((t) => t.name === name);
}
