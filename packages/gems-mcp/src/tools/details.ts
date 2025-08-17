/**
 * MCP tool for getting detailed gem information
 */

import { RubyGemsClient } from '../api/client.js';
import { validateInput } from '../utils/validation.js';
import { GemDetailsSchema, type GemDetailsInput } from '../schemas.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface DetailsToolOptions {
  client: RubyGemsClient;
}

export class DetailsTool {
  private client: RubyGemsClient;

  constructor(options: DetailsToolOptions) {
    this.client = options.client;
  }

  async execute(args: unknown): Promise<CallToolResult> {
    // Validate input
    const validation = validateInput(GemDetailsSchema, args);
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

    const { gem_name } = validation.data as GemDetailsInput;

    try {
      // Get gem details
      const response = await this.client.getGemDetails(gem_name);

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting gem details: ${response.error}`,
            },
          ],
          isError: true,
        };
      }

      const gem = response.data;

      // Format gem details
      let details = `# ${gem.name}\n\n`;

      if (gem.info) {
        details += `**Description:** ${gem.info}\n\n`;
      }

      details += `**Current Version:** ${gem.version}\n`;
      details += `**Released:** ${new Date(gem.version_created_at).toLocaleDateString()}\n`;
      details += `**Platform:** ${gem.platform}\n`;

      if (gem.authors) {
        details += `**Authors:** ${gem.authors}\n`;
      }

      details += `**Total Downloads:** ${gem.downloads.toLocaleString()}\n`;
      details += `**Version Downloads:** ${gem.version_downloads.toLocaleString()}\n`;

      if (gem.licenses && gem.licenses.length > 0) {
        details += `**License:** ${gem.licenses.join(', ')}\n`;
      }

      details += `**Yanked:** ${gem.yanked ? 'Yes' : 'No'}\n\n`;

      // Links section
      details += `## Links\n`;
      details += `- **RubyGems:** ${gem.project_uri}\n`;
      details += `- **Download:** ${gem.gem_uri}\n`;

      if (gem.homepage_uri) {
        details += `- **Homepage:** ${gem.homepage_uri}\n`;
      }
      if (gem.documentation_uri) {
        details += `- **Documentation:** ${gem.documentation_uri}\n`;
      }
      if (gem.source_code_uri) {
        details += `- **Source Code:** ${gem.source_code_uri}\n`;
      }
      if (gem.bug_tracker_uri) {
        details += `- **Bug Tracker:** ${gem.bug_tracker_uri}\n`;
      }
      if (gem.changelog_uri) {
        details += `- **Changelog:** ${gem.changelog_uri}\n`;
      }
      if (gem.funding_uri) {
        details += `- **Funding:** ${gem.funding_uri}\n`;
      }
      if (gem.wiki_uri) {
        details += `- **Wiki:** ${gem.wiki_uri}\n`;
      }
      if (gem.mailing_list_uri) {
        details += `- **Mailing List:** ${gem.mailing_list_uri}\n`;
      }

      // Dependencies section
      if (gem.dependencies) {
        if (gem.dependencies.runtime.length > 0) {
          details += `\n## Runtime Dependencies\n`;
          gem.dependencies.runtime.forEach((dep) => {
            details += `- ${dep.name} ${dep.requirements}\n`;
          });
        }

        if (gem.dependencies.development.length > 0) {
          details += `\n## Development Dependencies\n`;
          gem.dependencies.development.forEach((dep) => {
            details += `- ${dep.name} ${dep.requirements}\n`;
          });
        }
      }

      // Metadata section
      if (gem.metadata && Object.keys(gem.metadata).length > 0) {
        details += `\n## Metadata\n`;
        Object.entries(gem.metadata).forEach(([key, value]) => {
          details += `- **${key}:** ${value}\n`;
        });
      }

      if (gem.sha) {
        details += `\n**SHA256:** \`${gem.sha}\``;
      }

      return {
        content: [
          {
            type: 'text',
            text: details,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Unexpected error while getting gem details: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
}
