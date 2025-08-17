/**
 * MCP tool for searching gems on RubyGems.org
 */

import { RubyGemsClient } from '../api/client.js';
import { validateInput } from '../utils/validation.js';
import { SearchGemsSchema, type SearchGemsInput } from '../schemas.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface SearchToolOptions {
  client: RubyGemsClient;
}

export class SearchTool {
  private client: RubyGemsClient;

  constructor(options: SearchToolOptions) {
    this.client = options.client;
  }

  async execute(args: unknown): Promise<CallToolResult> {
    // Validate input
    const validation = validateInput(SearchGemsSchema, args);
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

    const { query, limit } = validation.data as SearchGemsInput;

    try {
      // Search for gems
      const response = await this.client.searchGems(query, limit);

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching for gems: ${response.error}`,
            },
          ],
          isError: true,
        };
      }

      const gems = response.data;

      if (gems.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No gems found matching query: "${query}"`,
            },
          ],
        };
      }

      // Format results
      const formattedResults = gems
        .map((gem) => {
          const authors = gem.authors ? ` by ${gem.authors}` : '';
          const description = gem.info ? `\n  ${gem.info}` : '';
          const licenses =
            gem.licenses && gem.licenses.length > 0
              ? `\n  License: ${gem.licenses.join(', ')}`
              : '';
          const downloads = `\n  Downloads: ${gem.downloads.toLocaleString()}`;
          const version = `\n  Latest: ${gem.version}`;
          const homepage = gem.homepage_uri
            ? `\n  Homepage: ${gem.homepage_uri}`
            : '';

          return `• ${gem.name}${authors}${description}${version}${downloads}${licenses}${homepage}`;
        })
        .join('\n\n');

      const summary = `Found ${gems.length} gem${gems.length === 1 ? '' : 's'} matching "${query}":`;

      return {
        content: [
          {
            type: 'text',
            text: `${summary}\n\n${formattedResults}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Unexpected error while searching for gems: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
}
