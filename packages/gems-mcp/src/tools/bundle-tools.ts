/**
 * MCP tools for bundle commands: check, show, audit, and clean
 */

import { spawn } from "node:child_process";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ProjectManager } from "../project-manager.js";
import {
  type BundleAuditInput,
  BundleAuditSchema,
  type BundleCheckInput,
  BundleCheckSchema,
  type BundleCleanInput,
  BundleCleanSchema,
  type BundleShowInput,
  BundleShowSchema,
} from "../schemas.js";
import { validateInput } from "../utils/validation.js";

export class BundleToolsManager {
  private projectManager?: ProjectManager;

  constructor(options?: { projectManager?: ProjectManager }) {
    this.projectManager = options?.projectManager;
  }

  async executeCheck(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(BundleCheckSchema, args);
    if (!validation.success) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${validation.error}`,
          },
        ],
        isError: true,
      };
    }

    const { project, gemfile } = validation.data as BundleCheckInput;

    let workingDirectory: string;
    try {
      workingDirectory = this.projectManager
        ? this.projectManager.getProjectPath(project)
        : process.cwd();
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }

    const bundleArgs = ["check"];
    if (gemfile) {
      bundleArgs.push("--gemfile", gemfile);
    }

    try {
      const result = await this.runBundleCommand(bundleArgs, workingDirectory);
      const projectInfo = project ? ` in project '${project}'` : "";

      if (result.success) {
        return {
          content: [
            {
              type: "text",
              text: `Bundle check passed${projectInfo}\n\n${result.output}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Bundle check failed${projectInfo}\n\n${result.error}`,
          },
        ],
        isError: true,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Unexpected error running bundle check: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }

  async executeShow(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(BundleShowSchema, args);
    if (!validation.success) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${validation.error}`,
          },
        ],
        isError: true,
      };
    }

    const { gem_name, project, paths, outdated } =
      validation.data as BundleShowInput;

    let workingDirectory: string;
    try {
      workingDirectory = this.projectManager
        ? this.projectManager.getProjectPath(project)
        : process.cwd();
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }

    const bundleArgs = ["show"];

    if (gem_name) {
      bundleArgs.push(gem_name);
    }

    if (paths) {
      bundleArgs.push("--paths");
    }

    if (outdated) {
      bundleArgs.push("--outdated");
    }

    try {
      const result = await this.runBundleCommand(bundleArgs, workingDirectory);
      const projectInfo = project ? ` in project '${project}'` : "";
      const gemInfo = gem_name ? ` for gem '${gem_name}'` : "";

      if (result.success) {
        return {
          content: [
            {
              type: "text",
              text: `Bundle show${gemInfo}${projectInfo}\n\n${result.output}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Bundle show failed${gemInfo}${projectInfo}\n\n${result.error}`,
          },
        ],
        isError: true,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Unexpected error running bundle show: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }

  async executeAudit(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(BundleAuditSchema, args);
    if (!validation.success) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${validation.error}`,
          },
        ],
        isError: true,
      };
    }

    const { project, update, verbose, format, gemfile_lock } =
      validation.data as BundleAuditInput;

    let workingDirectory: string;
    try {
      workingDirectory = this.projectManager
        ? this.projectManager.getProjectPath(project)
        : process.cwd();
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }

    const bundleArgs = ["audit"];

    if (update) {
      bundleArgs.push("--update");
    }

    if (verbose) {
      bundleArgs.push("--verbose");
    }

    if (format === "json") {
      bundleArgs.push("--format", "json");
    }

    if (gemfile_lock) {
      bundleArgs.push("--gemfile-lock", gemfile_lock);
    }

    try {
      const result = await this.runBundleCommand(bundleArgs, workingDirectory);
      const projectInfo = project ? ` in project '${project}'` : "";

      if (result.success) {
        const output = result.output || "No vulnerabilities found";
        return {
          content: [
            {
              type: "text",
              text: `Bundle audit completed${projectInfo}\n\n${output}`,
            },
          ],
        };
      }
      // bundle-audit may exit with non-zero when vulnerabilities are found
      // Check if it's actually an error or just vulnerabilities found
      const hasOutput = result.output || result.error;
      if (hasOutput) {
        return {
          content: [
            {
              type: "text",
              text: `Bundle audit found issues${projectInfo}\n\n${result.error || result.output}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Bundle audit failed${projectInfo}\n\nError: bundle-audit command not found or failed to execute. Make sure the bundler-audit gem is installed.`,
          },
        ],
        isError: true,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Unexpected error running bundle audit: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }

  async executeClean(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(BundleCleanSchema, args);
    if (!validation.success) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${validation.error}`,
          },
        ],
        isError: true,
      };
    }

    const { project, dry_run, force } = validation.data as BundleCleanInput;

    let workingDirectory: string;
    try {
      workingDirectory = this.projectManager
        ? this.projectManager.getProjectPath(project)
        : process.cwd();
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }

    const bundleArgs = ["clean"];

    if (dry_run) {
      bundleArgs.push("--dry-run");
    }

    if (force) {
      bundleArgs.push("--force");
    }

    try {
      const result = await this.runBundleCommand(bundleArgs, workingDirectory);
      const projectInfo = project ? ` in project '${project}'` : "";
      const actionInfo = dry_run ? " (dry run)" : "";

      if (result.success) {
        return {
          content: [
            {
              type: "text",
              text: `Bundle clean completed${actionInfo}${projectInfo}\n\n${result.output}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Bundle clean failed${actionInfo}${projectInfo}\n\n${result.error}`,
          },
        ],
        isError: true,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Unexpected error running bundle clean: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }

  private runBundleCommand(
    args: string[],
    cwd: string
  ): Promise<{ success: boolean; output: string; error: string }> {
    return new Promise((resolve) => {
      const bundleProcess = spawn("bundle", args, {
        cwd,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
      });

      let stdout = "";
      let stderr = "";

      bundleProcess.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      bundleProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      bundleProcess.on("close", (code) => {
        const success = code === 0;
        const output = stdout.trim();
        const error = stderr.trim();

        resolve({
          success,
          output,
          error:
            error || (!success ? `Command failed with exit code ${code}` : ""),
        });
      });

      bundleProcess.on("error", (error) => {
        resolve({
          success: false,
          output: "",
          error: `Failed to start bundle command: ${error.message}`,
        });
      });
    });
  }
}
