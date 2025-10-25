/**
 * MCP tool for getting help for a specific Rails generator
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { RailsClient } from "../api/rails-client.js";
import type { ProjectManager } from "../project-manager.js";
import {
  type GetGeneratorHelpInput,
  GetGeneratorHelpSchema,
} from "../schemas.js";
import type { GeneratorHelpOutput } from "../types.js";
import {
  createExecutionContext,
  createStructuredError,
  createStructuredResult,
  formatGeneratorHelp,
  generateHumanReadableSummary,
} from "../utils/structured-output.js";
import { validateInput } from "../utils/validation.js";

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
      return createStructuredError(
        "get_generator_help",
        "validation_error",
        validation.error
      );
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
      return createStructuredError(
        "get_generator_help",
        "project_resolution_error",
        error instanceof Error ? error.message : "Unknown error",
        { project }
      );
    }

    try {
      // Check if this is a Rails project
      const projectInfo = await this.client.checkRailsProject(workingDirectory);

      if (!projectInfo.isRailsProject) {
        return createStructuredError(
          "get_generator_help",
          "not_rails_project",
          `Directory ${workingDirectory} does not contain a Rails application`,
          createExecutionContext(projectInfo, project)
        );
      }

      // Get generator help
      const response = await this.client.getGeneratorHelp(
        generator_name,
        workingDirectory
      );

      if (!response.success) {
        return createStructuredError(
          "get_generator_help",
          "generator_help_error",
          `Failed to get help for generator '${generator_name}': ${response.error}`,
          createExecutionContext(projectInfo, project)
        );
      }

      const help = response.data;

      // Create structured output
      const output: GeneratorHelpOutput = {
        success: true,
        action: "get_generator_help",
        summary: `Successfully retrieved help for '${generator_name}' generator`,
        context: createExecutionContext(projectInfo, project),
        data: {
          generator: help,
          availableOptions: help.options.map((o) => o.name),
          requiredArguments: help.arguments
            .filter((a) => a.required)
            .map((a) => a.name),
        },
        metadata: {
          generatorName: generator_name,
          hasOptions: help.options.length > 0,
          hasArguments: help.arguments.length > 0,
          optionCount: help.options.length,
          argumentCount: help.arguments.length,
        },
      };

      // Generate human-readable text
      let humanText = generateHumanReadableSummary(output);
      humanText += `\n${formatGeneratorHelp(help)}`;
      humanText +=
        "\n💡 **Tip:** Use the `generate` tool to execute this generator with the specified arguments and options.";

      return createStructuredResult(output, humanText);
    } catch (error) {
      return createStructuredError(
        "get_generator_help",
        "unexpected_error",
        error instanceof Error ? error.message : "Unknown error occurred",
        { workingDirectory, project }
      );
    }
  }
}
