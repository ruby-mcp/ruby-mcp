/**
 * MCP tool for executing Rails destroy commands
 */

import { validateInput } from '../utils/validation.js';
import {
  createStructuredResult,
  createStructuredError,
  createExecutionContext,
  generateHumanReadableSummary,
  formatFileList,
} from '../utils/structured-output.js';
import { DestroySchema, type DestroyInput } from '../schemas.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ProjectManager } from '../project-manager.js';
import type { RailsClient } from '../api/rails-client.js';
import type { DestroyOutput } from '../types.js';

export interface DestroyToolOptions {
  client: RailsClient;
  projectManager?: ProjectManager;
}

export class DestroyTool {
  private client: RailsClient;
  private projectManager?: ProjectManager;

  constructor(options: DestroyToolOptions) {
    this.client = options.client;
    this.projectManager = options.projectManager;
  }

  async execute(args: unknown): Promise<CallToolResult> {
    // Validate input
    const validation = validateInput(DestroySchema, args);
    if (!validation.success) {
      return createStructuredError(
        'destroy',
        'validation_error',
        validation.error
      );
    }

    const {
      generator_name,
      arguments: genArgs,
      options,
      project,
    } = validation.data as DestroyInput;

    // Resolve project path using project manager if available
    let workingDirectory: string;
    try {
      workingDirectory = this.projectManager
        ? this.projectManager.getProjectPath(project)
        : process.cwd();
    } catch (error) {
      return createStructuredError(
        'destroy',
        'project_resolution_error',
        error instanceof Error ? error.message : 'Unknown error',
        { project }
      );
    }

    try {
      // Check if this is a Rails project
      const projectInfo = await this.client.checkRailsProject(workingDirectory);

      if (!projectInfo.isRailsProject) {
        return createStructuredError(
          'destroy',
          'not_rails_project',
          `Directory ${workingDirectory} does not contain a Rails application`,
          createExecutionContext(projectInfo, project)
        );
      }

      // Execute destroy command
      const response = await this.client.destroyFiles(
        generator_name,
        genArgs,
        options,
        workingDirectory
      );

      if (!response.success) {
        return createStructuredError(
          'destroy',
          'destroyer_execution_error',
          `Failed to execute destroy command for '${generator_name}': ${response.error}`,
          createExecutionContext(projectInfo, project)
        );
      }

      const result = response.data;

      if (!result.success) {
        return createStructuredError(
          'destroy',
          'destroyer_failure',
          `Destroy command failed: ${result.error}`,
          createExecutionContext(projectInfo, project),
          result.output
        );
      }

      // Create structured output
      const output: DestroyOutput = {
        success: true,
        action: 'destroy',
        summary: `Successfully executed destroy for '${generator_name}' - ${result.filesRemoved.length} files removed, ${result.filesModified.length} files modified`,
        context: createExecutionContext(projectInfo, project),
        data: {
          generatorName: generator_name,
          arguments: genArgs,
          options,
          result,
          filesRemoved: result.filesRemoved,
          filesModified: result.filesModified,
        },
        metadata: {
          argumentCount: genArgs.length,
          optionCount: Object.keys(options).length,
          totalFilesAffected:
            result.filesRemoved.length + result.filesModified.length,
          hasOutput: !!result.output,
        },
      };

      // Generate human-readable text
      let humanText = generateHumanReadableSummary(output);
      humanText += formatFileList('Files Removed', result.filesRemoved);
      humanText += formatFileList('Files Modified', result.filesModified);

      if (result.output) {
        humanText += '\n**Command Output:**\n```\n' + result.output + '\n```\n';
      }

      humanText += '\n🗑️ **Destruction Summary:**\n';
      humanText += `- Generator: \`${generator_name}\`\n`;
      humanText += `- Arguments: ${genArgs.length > 0 ? genArgs.map((a) => `\`${a}\``).join(', ') : 'None'}\n`;
      humanText += `- Options: ${
        Object.keys(options).length > 0
          ? Object.keys(options)
              .map((o) => `\`--${o}\``)
              .join(', ')
          : 'None'
      }\n`;

      return createStructuredResult(output, humanText);
    } catch (error) {
      return createStructuredError(
        'destroy',
        'unexpected_error',
        error instanceof Error ? error.message : 'Unknown error occurred',
        { workingDirectory, project }
      );
    }
  }
}
