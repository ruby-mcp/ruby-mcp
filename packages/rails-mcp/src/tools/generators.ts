/**
 * MCP tool for listing Rails generators
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { RailsClient } from "../api/rails-client.js";
import type { ProjectManager } from "../project-manager.js";
import { type ListGeneratorsInput, ListGeneratorsSchema } from "../schemas.js";
import type { GeneratorsListOutput } from "../types.js";
import {
  createExecutionContext,
  createStructuredError,
  createStructuredResult,
  formatGeneratorsList,
  generateHumanReadableSummary,
} from "../utils/structured-output.js";
import { validateInput } from "../utils/validation.js";

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
      return createStructuredError(
        "list_generators",
        "validation_error",
        validation.error
      );
    }

    const { project } = validation.data as ListGeneratorsInput;

    // Resolve project path using project manager if available
    let workingDirectory: string;
    try {
      workingDirectory = this.projectManager
        ? this.projectManager.getProjectPath(project)
        : process.cwd();
    } catch (error) {
      return createStructuredError(
        "list_generators",
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
          "list_generators",
          "not_rails_project",
          `Directory ${workingDirectory} does not contain a Rails application`,
          createExecutionContext(projectInfo, project)
        );
      }

      // List generators
      const response = await this.client.listGenerators(workingDirectory);

      if (!response.success) {
        return createStructuredError(
          "list_generators",
          "rails_command_error",
          `Failed to list generators: ${response.error}`,
          createExecutionContext(projectInfo, project)
        );
      }

      const generators = response.data;

      // Group by namespace
      const groupedByNamespace: Record<string, typeof generators> = {};
      for (const generator of generators) {
        const namespace = generator.namespace || "Rails";
        if (!groupedByNamespace[namespace]) {
          groupedByNamespace[namespace] = [];
        }
        groupedByNamespace[namespace].push(generator);
      }

      // Create structured output
      const output: GeneratorsListOutput = {
        success: true,
        action: "list_generators",
        summary:
          generators.length === 0
            ? "No generators found in this Rails project"
            : `Successfully listed ${generators.length} generators`,
        context: createExecutionContext(projectInfo, project),
        data: {
          generators,
          totalCount: generators.length,
          groupedByNamespace,
        },
        metadata: {
          namespaces: Object.keys(groupedByNamespace),
          generatorNames: generators.map((g) => g.name),
        },
      };

      // Generate human-readable text
      let humanText = generateHumanReadableSummary(output);

      if (generators.length > 0) {
        humanText += `\n${formatGeneratorsList(generators, groupedByNamespace)}`;
        humanText +=
          "\n💡 **Tip:** Use `get_generator_help` tool with a specific generator name to get detailed usage information.";
      }

      return createStructuredResult(output, humanText);
    } catch (error) {
      return createStructuredError(
        "list_generators",
        "unexpected_error",
        error instanceof Error ? error.message : "Unknown error occurred",
        { workingDirectory, project }
      );
    }
  }
}
