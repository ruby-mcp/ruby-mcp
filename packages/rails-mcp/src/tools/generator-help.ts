/**
 * MCP tool for getting help for a specific Rails generator
 */

import { validateInput } from '../utils/validation.js';
import {
  GetGeneratorHelpSchema,
  type GetGeneratorHelpInput,
} from '../schemas.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ProjectManager } from '../project-manager.js';
import type { RailsClient } from '../api/rails-client.js';

export interface GeneratorHelpToolOptions {
  client: RailsClient;
  projectManager?: ProjectManager;
}

export class GeneratorHelpTool {
  private client: RailsClient;
  private projectManager?: ProjectManager;

  constructor(options: GeneratorHelpToolOptions) {
    this.client = options.client;
    this.projectManager = options.projectManager;
  }

  async execute(args: unknown): Promise<CallToolResult> {
    // Validate input
    const validation = validateInput(GetGeneratorHelpSchema, args);
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

    const { generator_name, project } =
      validation.data as GetGeneratorHelpInput;

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

      // Get generator help
      const response = await this.client.getGeneratorHelp(
        generator_name,
        workingDirectory
      );

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting help for generator '${generator_name}': ${response.error}`,
            },
          ],
          isError: true,
        };
      }

      const help = response.data;

      // Format help output
      let result = `# ${help.name} Generator\n\n`;

      if (help.description) {
        result += `${help.description}\n\n`;
      }

      if (help.usage) {
        result += `## Usage\n\`\`\`\n${help.usage}\n\`\`\`\n\n`;
      }

      if (help.arguments && help.arguments.length > 0) {
        result += `## Arguments\n`;
        for (const arg of help.arguments) {
          result += `- **${arg.name}** (${arg.type}${arg.required ? ', required' : ', optional'}): ${arg.description}\n`;
        }
        result += '\n';
      }

      if (help.options && help.options.length > 0) {
        result += `## Options\n`;
        for (const option of help.options) {
          const aliases =
            option.aliases && option.aliases.length > 0
              ? ` (${option.aliases.join(', ')})`
              : '';
          const defaultValue =
            option.default !== undefined ? ` [default: ${option.default}]` : '';
          result += `- **--${option.name}**${aliases} (${option.type}${option.required ? ', required' : ''}): ${option.description}${defaultValue}\n`;
        }
        result += '\n';
      }

      result += `## Project Info\n`;
      result += `- Rails version: ${projectInfo.railsVersion || 'Unknown'}\n`;
      result += `- Project type: ${projectInfo.projectType}\n`;
      result += `- Root path: ${projectInfo.rootPath}\n\n`;

      result += `To execute this generator, use the \`generate\` tool with the generator name and appropriate arguments and options.`;

      return {
        content: [
          {
            type: 'text',
            text: result,
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
