/**
 * MCP tool for fetching gem changelogs
 */

import { ChangelogFetcher } from '../changelog/fetcher.js';
import { validateInput } from '../utils/validation.js';
import { ChangelogSchema, type ChangelogInput } from '../schemas.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface ChangelogToolOptions {
  fetcher: ChangelogFetcher;
}

export class ChangelogTool {
  private fetcher: ChangelogFetcher;

  constructor(options: ChangelogToolOptions) {
    this.fetcher = options.fetcher;
  }

  async execute(args: unknown): Promise<CallToolResult> {
    // Validate input
    const validation = validateInput(ChangelogSchema, args);
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

    const { gem_name, version } = validation.data as ChangelogInput;

    try {
      // Fetch changelog
      const result = await this.fetcher.fetchChangelog(gem_name, version);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching changelog: ${result.error}`,
            },
          ],
          isError: true,
        };
      }

      // Format response
      let response = `# Changelog for ${gem_name}`;
      if (version) {
        response += ` v${version}`;
      }
      response += '\n\n';

      if (result.source) {
        response += `**Source:** ${result.source}\n\n`;
      }

      response += '---\n\n';
      response += result.content;

      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Unexpected error while fetching changelog: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
}
