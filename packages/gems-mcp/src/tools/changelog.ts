/**
 * MCP tool for fetching and formatting gem changelogs
 */

import { RubyGemsClient } from '../api/client.js';
import { ChangelogFetcher } from '../changelog/fetcher.js';
import { ChangelogCache } from '../changelog/cache.js';
import { validateInput } from '../utils/validation.js';
import { GemChangelogSchema, type GemChangelogInput } from '../schemas.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface ChangelogToolOptions {
  client: RubyGemsClient;
  cache?: ChangelogCache;
  fetcher?: ChangelogFetcher;
}

export class ChangelogTool {
  private client: RubyGemsClient;
  private cache: ChangelogCache;
  private fetcher: ChangelogFetcher;

  constructor(options: ChangelogToolOptions) {
    this.client = options.client;
    this.cache = options.cache || new ChangelogCache();
    this.fetcher = options.fetcher || new ChangelogFetcher();
  }

  async execute(args: unknown): Promise<CallToolResult> {
    // Validate input
    const validation = validateInput(GemChangelogSchema, args);
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

    const { gem_name, version, format } = validation.data as GemChangelogInput;

    try {
      // Check cache first
      const cachedChangelog = this.cache.getChangelog(gem_name, version, format);
      if (cachedChangelog) {
        return {
          content: [
            {
              type: 'text',
              text: cachedChangelog,
            },
          ],
        };
      }

      // Get gem details to find changelog URL
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

      if (!gem.changelog_uri) {
        // Fallback message if no changelog URL is provided
        let fallbackMessage = `# Changelog for ${gem.name}\n\n`;
        fallbackMessage += `No changelog URL provided for this gem.\n\n`;

        if (gem.homepage_uri) {
          fallbackMessage += `You may find release information at the project homepage:\n`;
          fallbackMessage += `${gem.homepage_uri}\n\n`;
        }

        if (gem.source_code_uri) {
          fallbackMessage += `Or check the source code repository:\n`;
          fallbackMessage += `${gem.source_code_uri}\n`;
        }

        return {
          content: [
            {
              type: 'text',
              text: fallbackMessage,
            },
          ],
        };
      }

      // Fetch the changelog
      const fetchResult = await this.fetcher.fetchFromUrl(gem.changelog_uri);

      // Process the content based on format
      let processedContent = fetchResult.content;

      // Convert HTML to markdown if needed
      if (fetchResult.format === 'html') {
        processedContent = this.fetcher.htmlToMarkdown(processedContent);
      }

      // Extract version-specific section if requested
      if (version) {
        processedContent = this.fetcher.extractVersionSection(processedContent, version);
      }

      // Format the final output
      let formattedChangelog = `# Changelog for ${gem.name}`;

      if (version) {
        formattedChangelog += ` (version ${version})`;
      }

      formattedChangelog += `\n\n`;
      formattedChangelog += `**Source:** ${gem.changelog_uri}\n`;
      formattedChangelog += `**Current Version:** ${gem.version}\n\n`;
      formattedChangelog += `---\n\n`;

      // Apply format if specified
      if (format === 'summary') {
        // Extract first few versions or lines for summary
        const lines = processedContent.split('\n');
        const summaryLines: string[] = [];
        let versionCount = 0;
        const maxVersions = 3;

        for (const line of lines) {
          summaryLines.push(line);

          // Count version headers
          if (/^#{1,3}\s*(?:v|Version)?\s*\d+\.\d+/i.test(line)) {
            versionCount++;
            if (versionCount >= maxVersions) {
              summaryLines.push('\n*... (truncated for summary)*');
              break;
            }
          }
        }

        processedContent = summaryLines.join('\n');
      }

      formattedChangelog += processedContent;

      // Cache the result
      this.cache.setChangelog(gem_name, formattedChangelog, version, format);

      return {
        content: [
          {
            type: 'text',
            text: formattedChangelog,
          },
        ],
      };

    } catch (error) {
      // Check if it's a known error type
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Request timed out while fetching changelog for ${gem_name}`,
              },
            ],
            isError: true,
          };
        }

        if (error.message.includes('Failed to fetch')) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Unable to fetch changelog from the provided URL. ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

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

  /**
   * Clear the changelog cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return this.cache.getStats();
  }
}