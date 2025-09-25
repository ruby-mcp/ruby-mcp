/**
 * Utility functions for creating structured tool outputs that are easy for Claude Code to understand
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  StructuredToolOutput,
  ToolExecutionContext,
  RailsProjectInfo,
} from '../types.js';

/**
 * Create a structured tool result with both human-readable text and machine-readable JSON
 */
export function createStructuredResult(
  output: StructuredToolOutput,
  humanReadableText: string
): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: humanReadableText,
      },
      {
        type: 'text',
        text: `\n\n---\n**Structured Output (for Claude Code)**\n\`\`\`json\n${JSON.stringify(output, null, 2)}\n\`\`\``,
      },
    ],
    isError: !output.success,
  };
}

/**
 * Create a structured error result
 */
export function createStructuredError(
  action: string,
  errorType: string,
  message: string | undefined,
  context?: Partial<ToolExecutionContext> | string,
  details?: string
): CallToolResult {
  // Handle context being either an object or string (for workingDirectory)
  const contextObj =
    typeof context === 'string' ? { workingDirectory: context } : context || {};

  const errorMessage = message || 'Unknown error';

  const output: StructuredToolOutput = {
    success: false,
    action,
    summary: `Failed to execute ${action}: ${errorMessage}`,
    context: {
      workingDirectory: contextObj.workingDirectory || process.cwd(),
      timestamp: new Date().toISOString(),
      ...contextObj,
    },
    error: {
      type: errorType,
      message: errorMessage,
      details,
    },
  };

  const humanText = `Error: ${errorMessage}${details ? `\n\nDetails: ${details}` : ''}`;

  return createStructuredResult(output, humanText);
}

/**
 * Create execution context from project info and input parameters
 */
export function createExecutionContext(
  projectInfo: RailsProjectInfo,
  project?: string
): ToolExecutionContext {
  return {
    project,
    workingDirectory: projectInfo.rootPath,
    railsVersion: projectInfo.railsVersion,
    projectType: projectInfo.projectType,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate human-readable summary from structured output
 */
export function generateHumanReadableSummary(
  output: StructuredToolOutput
): string {
  if (!output.success && output.error) {
    return `❌ ${output.summary}\n\nError: ${output.error.message}${
      output.error.details ? `\n\nDetails: ${output.error.details}` : ''
    }`;
  }

  let text = `✅ ${output.summary}\n\n`;

  // Add context information
  text += `**Context:**\n`;
  text += `- Working Directory: ${output.context.workingDirectory}\n`;
  if (output.context.railsVersion) {
    text += `- Rails Version: ${output.context.railsVersion}\n`;
  }
  if (output.context.projectType) {
    text += `- Project Type: ${output.context.projectType}\n`;
  }
  if (output.context.project) {
    text += `- Project: ${output.context.project}\n`;
  }
  text += `- Executed: ${new Date(output.context.timestamp).toLocaleString()}\n`;

  return text;
}

/**
 * Format file lists for human-readable output
 */
export function formatFileList(title: string, files: string[]): string {
  if (files.length === 0) return '';

  let text = `\n**${title}:**\n`;
  for (const file of files) {
    text += `- ${file}\n`;
  }
  return text;
}

/**
 * Format generator list for human-readable output
 */
export function formatGeneratorsList(
  generators: Array<{ name: string; description: string; namespace?: string }>,
  groupedByNamespace: Record<
    string,
    Array<{ name: string; description: string; namespace?: string }>
  >
): string {
  let text = `Found ${generators.length} generators:\n\n`;

  for (const [namespace, gens] of Object.entries(groupedByNamespace)) {
    text += `**${namespace}:**\n`;
    for (const gen of gens) {
      text += `- \`${gen.name}\`: ${gen.description}\n`;
    }
    text += '\n';
  }

  return text;
}

/**
 * Format generator help for human-readable output
 */
export function formatGeneratorHelp(help: {
  name: string;
  description: string;
  usage: string;
  options: Array<{
    name: string;
    description: string;
    type: string;
    aliases?: string[];
  }>;
  arguments: Array<{ name: string; description: string; required: boolean }>;
}): string {
  let text = `**Generator: ${help.name}**\n\n`;

  if (help.description) {
    text += `${help.description}\n\n`;
  }

  if (help.usage) {
    text += `**Usage:**\n\`${help.usage}\`\n\n`;
  }

  if (help.arguments.length > 0) {
    text += `**Arguments:**\n`;
    for (const arg of help.arguments) {
      const required = arg.required ? ' (required)' : ' (optional)';
      text += `- \`${arg.name}\`${required}: ${arg.description}\n`;
    }
    text += '\n';
  }

  if (help.options.length > 0) {
    text += `**Options:**\n`;
    for (const option of help.options) {
      const aliases = option.aliases?.length
        ? ` (${option.aliases.join(', ')})`
        : '';
      text += `- \`--${option.name}\`${aliases}: ${option.description}\n`;
    }
    text += '\n';
  }

  return text;
}
