/**
 * Changelog fetcher with multi-source support
 *
 * Fetches changelogs from various sources:
 * - Changelog URI from gem metadata
 * - GitHub releases
 * - Raw changelog files
 * - Documentation sites
 */

import type { GemDetails } from '../types.js';
import { ChangelogCache } from './cache.js';
import { RubyGemsClient } from '../api/client.js';

export interface ChangelogFetcherOptions {
  client: RubyGemsClient;
  cacheEnabled?: boolean;
  cacheTtl?: number;
  timeout?: number;
}

export interface ChangelogResult {
  success: boolean;
  content?: string;
  source?: string;
  error?: string;
}

export class ChangelogFetcher {
  private client: RubyGemsClient;
  private cache: ChangelogCache;
  private cacheEnabled: boolean;
  private timeout: number;

  constructor(options: ChangelogFetcherOptions) {
    this.client = options.client;
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cache = new ChangelogCache(options.cacheTtl);
    this.timeout = options.timeout ?? 10000;
  }

  async fetchChangelog(
    gemName: string,
    version?: string
  ): Promise<ChangelogResult> {
    // Check cache first
    const cacheKey = ChangelogCache.generateKey(gemName, version);
    if (this.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          success: true,
          content: cached.content,
          source: cached.source,
        };
      }
    }

    try {
      // Get gem details to find changelog URL
      const gemResponse = await this.client.getGemDetails(gemName);
      if (!gemResponse.success) {
        return {
          success: false,
          error: `Failed to fetch gem details: ${gemResponse.error}`,
        };
      }

      const gem = gemResponse.data;

      // Try different sources in order of preference
      const sources = this.getChangelogSources(gem, version);

      for (const source of sources) {
        const result = await this.fetchFromSource(source);
        if (result.success && result.content) {
          // Cache the successful result
          if (this.cacheEnabled) {
            this.cache.set(cacheKey, {
              content: result.content,
              source: result.source || source.url,
            });
          }

          return result;
        }
      }

      return {
        success: false,
        error: 'No changelog found from any source',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getChangelogSources(
    gem: GemDetails,
    version?: string
  ): ChangelogSource[] {
    const sources: ChangelogSource[] = [];

    // 1. Direct changelog URI from gem metadata
    if (gem.changelog_uri) {
      sources.push({
        type: 'changelog_uri',
        url: gem.changelog_uri,
        version,
      });
    }

    // 2. GitHub releases (if source is GitHub)
    if (gem.source_code_uri && this.isGitHubUrl(gem.source_code_uri)) {
      const { owner, repo } = this.parseGitHubUrl(gem.source_code_uri);
      if (owner && repo) {
        if (version) {
          // Try specific version release
          sources.push({
            type: 'github_release',
            url: `https://github.com/${owner}/${repo}/releases/tag/v${version}`,
            version,
          });
          sources.push({
            type: 'github_release',
            url: `https://github.com/${owner}/${repo}/releases/tag/${version}`,
            version,
          });
        }
        // Try latest release
        sources.push({
          type: 'github_releases',
          url: `https://github.com/${owner}/${repo}/releases`,
        });

        // Try common changelog files in repo
        const changelogFiles = [
          'CHANGELOG.md',
          'CHANGELOG',
          'HISTORY.md',
          'HISTORY',
          'CHANGES.md',
          'CHANGES',
          'NEWS.md',
          'NEWS',
        ];

        for (const file of changelogFiles) {
          sources.push({
            type: 'raw_file',
            url: `https://raw.githubusercontent.com/${owner}/${repo}/main/${file}`,
          });
          sources.push({
            type: 'raw_file',
            url: `https://raw.githubusercontent.com/${owner}/${repo}/master/${file}`,
          });
        }
      }
    }

    // 3. Documentation URI
    if (gem.documentation_uri) {
      sources.push({
        type: 'documentation',
        url: gem.documentation_uri,
      });
    }

    return sources;
  }

  private async fetchFromSource(
    source: ChangelogSource
  ): Promise<ChangelogResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(source.url, {
        method: 'GET',
        headers: {
          'User-Agent': '@ruby-mcp/gems-mcp',
          Accept: 'text/html,text/markdown,text/plain,*/*',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false };
      }

      const contentType = response.headers.get('content-type') || '';
      let content = await response.text();

      // Convert HTML to markdown if needed
      if (contentType.includes('text/html')) {
        content = this.htmlToMarkdown(content);
      }

      // Extract version-specific content if version is specified
      if (source.version && source.type !== 'raw_file') {
        content = this.extractVersionContent(content, source.version);
      }

      return {
        success: true,
        content: content.trim(),
        source: source.url,
      };
    } catch (error) {
      return { success: false };
    }
  }

  private isGitHubUrl(url: string): boolean {
    return url.includes('github.com');
  }

  private parseGitHubUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      return { owner: '', repo: '' };
    }

    let repo = match[2];
    // Remove .git suffix if present
    if (repo.endsWith('.git')) {
      repo = repo.slice(0, -4);
    }

    return { owner: match[1], repo };
  }

  private htmlToMarkdown(html: string): string {
    // Basic HTML to Markdown conversion
    let markdown = html;

    // Remove script and style tags
    markdown = markdown.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ''
    );
    markdown = markdown.replace(
      /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
      ''
    );

    // Convert headers
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n');
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n');
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n');

    // Convert links
    markdown = markdown.replace(
      /<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi,
      '[$2]($1)'
    );

    // Convert lists
    markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    markdown = markdown.replace(/<ul[^>]*>/gi, '\n');
    markdown = markdown.replace(/<\/ul>/gi, '\n');
    markdown = markdown.replace(/<ol[^>]*>/gi, '\n');
    markdown = markdown.replace(/<\/ol>/gi, '\n');

    // Convert formatting
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

    // Convert pre/code blocks
    markdown = markdown.replace(
      /<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi,
      '```\n$1\n```'
    );
    markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```');

    // Convert paragraphs
    markdown = markdown.replace(/<p[^>]*>/gi, '\n');
    markdown = markdown.replace(/<\/p>/gi, '\n');

    // Convert breaks
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n');

    // Remove remaining HTML tags
    markdown = markdown.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    markdown = markdown.replace(/&lt;/g, '<');
    markdown = markdown.replace(/&gt;/g, '>');
    markdown = markdown.replace(/&amp;/g, '&');
    markdown = markdown.replace(/&quot;/g, '"');
    markdown = markdown.replace(/&#39;/g, "'");

    // Clean up whitespace
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    markdown = markdown.trim();

    return markdown;
  }

  private extractVersionContent(content: string, version: string): string {
    // Try to extract version-specific section from changelog
    const versionPatterns = [
      new RegExp(
        `##?\\s*\\[?v?${this.escapeRegex(version)}\\]?[^\\n]*\\n([\\s\\S]*?)(?=##|$)`,
        'i'
      ),
      new RegExp(
        `^v?${this.escapeRegex(version)}[^\\n]*\\n([\\s\\S]*?)(?=^\\d+\\.\\d+|$)`,
        'im'
      ),
    ];

    for (const pattern of versionPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // If no version-specific content found, return full content
    return content;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return this.cache.getStats();
  }

  cleanupCache(): number {
    return this.cache.cleanup();
  }
}

interface ChangelogSource {
  type:
    | 'changelog_uri'
    | 'github_release'
    | 'github_releases'
    | 'raw_file'
    | 'documentation';
  url: string;
  version?: string;
}
