/**
 * MCP tool for executing Rails generators
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { RailsClient } from "../api/rails-client.js";
import type { ProjectManager } from "../project-manager.js";
import { type GenerateInput, GenerateSchema } from "../schemas.js";
import type { GenerateOutput } from "../types.js";
import {
  createExecutionContext,
  createStructuredError,
  createStructuredResult,
  formatFileList,
  generateHumanReadableSummary,
} from "../utils/structured-output.js";
import { validateInput } from "../utils/validation.js";

export interface GenerateToolOptions {
  client: RailsClient;
  projectManager?: ProjectManager;
}

export class GenerateTool {
  private client: RailsClient;
  private projectManager?: ProjectManager;

  constructor(options: GenerateToolOptions) {
    this.client = options.client;
    this.projectManager = options.projectManager;
  }

  async execute(args: unknown): Promise<CallToolResult> {
    // Validate input
    const validation = validateInput(GenerateSchema, args);
    if (!validation.success) {
      return createStructuredError(
        "generate",
        "validation_error",
        validation.error
      );
    }

    const {
      generator_name,
      arguments: genArgs,
      options,
      project,
    } = validation.data as GenerateInput;

    // Resolve project path using project manager if available
    let workingDirectory: string;
    try {
      workingDirectory = this.projectManager
        ? this.projectManager.getProjectPath(project)
        : process.cwd();
    } catch (error) {
      return createStructuredError(
        "generate",
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
          "generate",
          "not_rails_project",
          `Directory ${workingDirectory} does not contain a Rails application`,
          createExecutionContext(projectInfo, project)
        );
      }

      // Execute generator
      const response = await this.client.generateFiles(
        generator_name,
        genArgs,
        options,
        workingDirectory
      );

      if (!response.success) {
        return createStructuredError(
          "generate",
          "generator_execution_error",
          `Failed to execute generator '${generator_name}': ${response.error}`,
          createExecutionContext(projectInfo, project)
        );
      }

      const result = response.data;

      if (!result.success) {
        return createStructuredError(
          "generate",
          "generator_failure",
          `Generator execution failed: ${result.error}`,
          createExecutionContext(projectInfo, project),
          result.output
        );
      }

      // Create structured output
      const output: GenerateOutput = {
        success: true,
        action: "generate",
        summary: `Successfully executed '${generator_name}' generator - ${result.filesCreated.length} files created, ${result.filesModified.length} files modified`,
        context: createExecutionContext(projectInfo, project),
        data: {
          generatorName: generator_name,
          arguments: genArgs,
          options,
          result,
          filesCreated: result.filesCreated,
          filesModified: result.filesModified,
        },
        metadata: {
          argumentCount: genArgs.length,
          optionCount: Object.keys(options).length,
          totalFilesAffected:
            result.filesCreated.length + result.filesModified.length,
          hasOutput: !!result.output,
        },
      };

      // Generate human-readable text
      let humanText = generateHumanReadableSummary(output);
      humanText += formatFileList("Files Created", result.filesCreated);
      humanText += formatFileList("Files Modified", result.filesModified);

      if (result.output) {
        humanText += `\n**Command Output:**\n\`\`\`\n${result.output}\n\`\`\`\n`;
      }

      humanText += "\n📋 **Execution Summary:**\n";
      humanText += `- Generator: \`${generator_name}\`\n`;
      humanText += `- Arguments: ${genArgs.length > 0 ? genArgs.map((a) => `\`${a}\``).join(", ") : "None"}\n`;
      humanText += `- Options: ${
        Object.keys(options).length > 0
          ? Object.keys(options)
              .map((o) => `\`--${o}\``)
              .join(", ")
          : "None"
      }\n`;

      return createStructuredResult(output, humanText);
    } catch (error) {
      return createStructuredError(
        "generate",
        "unexpected_error",
        error instanceof Error ? error.message : "Unknown error occurred",
        { workingDirectory, project }
      );
    }
  }
}
