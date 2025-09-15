/**
 * MCP tool for listing Rails generators
 */

import { validateInput } from '../utils/validation.js';
import { ListGeneratorsSchema, type ListGeneratorsInput } from '../schemas.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ProjectManager } from '../project-manager.js';
import type { RailsClient } from '../api/rails-client.js';

export interface GeneratorsToolOptions {
  client: RailsClient;
  projectManager?: ProjectManager;
}

export class GeneratorsTool {
  private client: RailsClient;
  private projectManager?: ProjectManager;

  constructor(options: GeneratorsToolOptions) {
    this.client = options.client;
    this.projectManager = options.projectManager;
  }

  async execute(args: unknown): Promise<CallToolResult> {
    // Validate input
    const validation = validateInput(ListGeneratorsSchema, args);
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

    const { project } = validation.data as ListGeneratorsInput;

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

      // List generators
      const response = await this.client.listGenerators(workingDirectory);

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing generators: ${response.error}`,
            },
          ],
          isError: true,
        };
      }

      const generators = response.data;

      if (generators.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No generators found in this Rails project.',
            },
          ],
          isError: false,
        };
      }

      // Format generators list
      let result = `Found ${generators.length} generators in Rails project:\n\n`;

      // Group by namespace
      const byNamespace: Record<string, typeof generators> = {};

      for (const generator of generators) {
        const namespace = generator.namespace || 'Rails';
        if (!byNamespace[namespace]) {
          byNamespace[namespace] = [];
        }
        byNamespace[namespace].push(generator);
      }

      // Format output
      for (const [namespace, gens] of Object.entries(byNamespace)) {
        result += `## ${namespace}\n`;
        for (const gen of gens) {
          result += `- **${gen.name}**: ${gen.description}\n`;
        }
        result += '\n';
      }

      result += `\nProject info:\n`;
      result += `- Rails version: ${projectInfo.railsVersion || 'Unknown'}\n`;
      result += `- Project type: ${projectInfo.projectType}\n`;
      result += `- Root path: ${projectInfo.rootPath}\n`;

      result += `\nTo get detailed help for a specific generator, use the \`get_generator_help\` tool with the generator name.`;

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
