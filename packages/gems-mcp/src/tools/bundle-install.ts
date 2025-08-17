/**
 * MCP tool for running bundle install in project directories
 */

import { spawn } from 'child_process';
import { validateInput } from '../utils/validation.js';
import { BundleInstallSchema, type BundleInstallInput } from '../schemas.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ProjectManager } from '../project-manager.js';

export class BundleInstallTool {
  private projectManager?: ProjectManager;

  constructor(options?: { projectManager?: ProjectManager }) {
    this.projectManager = options?.projectManager;
  }

  async execute(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(BundleInstallSchema, args);
    if (!validation.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${validation.error}`,
          },
        ],
        isError: true,
      };
    }

    const { project, deployment, without, gemfile, clean, frozen, quiet } =
      validation.data as BundleInstallInput;

    // Resolve project path using project manager if available
    let workingDirectory: string;
    try {
      workingDirectory = this.projectManager
        ? this.projectManager.getProjectPath(project)
        : process.cwd();
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    // Build bundle install command arguments
    const bundleArgs = ['install'];

    if (deployment) {
      bundleArgs.push('--deployment');
    }

    if (without && without.length > 0) {
      bundleArgs.push('--without', without.join(','));
    }

    if (gemfile) {
      bundleArgs.push('--gemfile', gemfile);
    }

    if (clean) {
      bundleArgs.push('--clean');
    }

    if (frozen) {
      bundleArgs.push('--frozen');
    }

    if (quiet) {
      bundleArgs.push('--quiet');
    }

    try {
      const result = await this.runBundleCommand(bundleArgs, workingDirectory);

      if (result.success) {
        const projectInfo = project ? ` in project '${project}'` : '';
        const optionsInfo = this.formatOptions({
          deployment,
          without,
          gemfile,
          clean,
          frozen,
          quiet,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Successfully ran bundle install${projectInfo}${optionsInfo}\n\nOutput:\n${result.output}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Bundle install failed${project ? ` in project '${project}'` : ''}\n\nError:\n${result.error}`,
            },
          ],
          isError: true,
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Unexpected error running bundle install: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private formatOptions(options: {
    deployment?: boolean;
    without?: string[];
    gemfile?: string;
    clean?: boolean;
    frozen?: boolean;
    quiet?: boolean;
  }): string {
    const activeOptions: string[] = [];

    if (options.deployment) activeOptions.push('deployment mode');
    if (options.without && options.without.length > 0) {
      activeOptions.push(`without groups: ${options.without.join(', ')}`);
    }
    if (options.gemfile)
      activeOptions.push(`using Gemfile: ${options.gemfile}`);
    if (options.clean) activeOptions.push('with cleanup');
    if (options.frozen) activeOptions.push('frozen mode');
    if (options.quiet) activeOptions.push('quiet mode');

    return activeOptions.length > 0 ? ` (${activeOptions.join(', ')})` : '';
  }

  private runBundleCommand(
    args: string[],
    cwd: string
  ): Promise<{ success: boolean; output: string; error: string }> {
    return new Promise((resolve) => {
      const bundleProcess = spawn('bundle', args, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      bundleProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      bundleProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      bundleProcess.on('close', (code) => {
        const success = code === 0;
        const output = stdout.trim();
        const error = stderr.trim();

        resolve({
          success,
          output:
            output || (success ? 'Bundle install completed successfully.' : ''),
          error:
            error ||
            (success ? '' : `Bundle install failed with exit code ${code}`),
        });
      });

      bundleProcess.on('error', (error) => {
        resolve({
          success: false,
          output: '',
          error: `Failed to start bundle command: ${error.message}`,
        });
      });
    });
  }
}
