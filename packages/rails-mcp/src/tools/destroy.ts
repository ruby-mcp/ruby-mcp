/**
 * MCP tool for executing Rails destroy commands
 */

import { validateInput } from '../utils/validation.js';
import { DestroySchema, type DestroyInput } from '../schemas.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ProjectManager } from '../project-manager.js';
import type { RailsClient } from '../api/rails-client.js';

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

    try {
      // Check if this is a Rails project
      const projectInfo = await this.client.checkRailsProject(workingDirectory);

      if (!projectInfo.isRailsProject) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Not a Rails project. Directory ${workingDirectory} does not contain a Rails application.`,
            },
          ],
          isError: true,
        };
      }

      // Execute destroy command
      const response = await this.client.destroyFiles(
        generator_name,
        genArgs,
        options,
        workingDirectory
      );

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing destroy command for '${generator_name}': ${response.error}`,
            },
          ],
          isError: true,
        };
      }

      const result = response.data;

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Destroy command failed: ${result.error}\n\nOutput:\n${result.output}`,
            },
          ],
          isError: true,
        };
      }

      // Format success response
      let responseText = `# Rails destroy '${generator_name}' executed successfully!\n\n`;

      if (result.filesRemoved.length > 0) {
        responseText += `## Files Removed\n`;
        for (const file of result.filesRemoved) {
          responseText += `- ${file}\n`;
        }
        responseText += '\n';
      }

      if (result.filesModified.length > 0) {
        responseText += `## Files Modified\n`;
        for (const file of result.filesModified) {
          responseText += `- ${file}\n`;
        }
        responseText += '\n';
      }

      if (result.output) {
        responseText += `## Command Output\n\`\`\`\n${result.output}\n\`\`\`\n\n`;
      }

      responseText += `## Execution Details\n`;
      responseText += `- Generator: ${generator_name}\n`;
      responseText += `- Arguments: ${genArgs.length > 0 ? genArgs.join(', ') : 'None'}\n`;
      responseText += `- Options: ${Object.keys(options).length > 0 ? Object.keys(options).join(', ') : 'None'}\n`;
      responseText += `- Project: ${workingDirectory}\n`;
      responseText += `- Rails version: ${projectInfo.railsVersion || 'Unknown'}\n`;

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          },
        ],
        isError: true,
      };
    }
  }
}
