/**
 * Changelog fetcher for retrieving and processing gem changelogs from various sources
 */

export interface ChangelogFetchOptions {
  timeout?: number;
  userAgent?: string;
}

export interface ChangelogFetchResult {
  content: string;
  format: 'markdown' | 'html' | 'text';
  sourceType: 'github-release' | 'github-file' | 'external';
  url: string;
}

export class ChangelogFetcher {
  private timeout: number;
  private userAgent: string;

  constructor(options: ChangelogFetchOptions = {}) {
    this.timeout = options.timeout ?? 10000;
    this.userAgent = options.userAgent ?? '@ruby-mcp/gems-mcp/0.1.0';
  }

  /**
   * Fetch changelog from a URL
   */
  async fetchFromUrl(url: string): Promise<ChangelogFetchResult> {
    const urlType = this.detectUrlType(url);

    switch (urlType) {
      case 'github-release':
        return this.fetchGitHubRelease(url);
      case 'github-file':
        return this.fetchGitHubFile(url);
      default:
        return this.fetchExternal(url);
    }
  }

  /**
   * Detect the type of changelog URL
   */
  detectUrlType(url: string): 'github-release' | 'github-file' | 'external' {
    try {
      const urlObj = new URL(url);

      if (urlObj.hostname === 'github.com') {
        if (urlObj.pathname.includes('/releases/tag/')) {
          return 'github-release';
        } else if (urlObj.pathname.includes('/blob/')) {
          return 'github-file';
        }
      }
    } catch {
      // Invalid URL, treat as external
    }

    return 'external';
  }

  /**
   * Fetch changelog from GitHub releases API
   */
  private async fetchGitHubRelease(url: string): Promise<ChangelogFetchResult> {
    // Parse GitHub URL to extract owner, repo, and tag
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const owner = pathParts[1];
    const repo = pathParts[2];
    const tagIndex = pathParts.indexOf('tag');
    const tag = tagIndex !== -1 ? pathParts[tagIndex + 1] : null;

    if (!owner || !repo || !tag) {
      throw new Error(`Invalid GitHub release URL: ${url}`);
    }

    // Fetch from GitHub API
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`;
    const response = await this.makeRequest(apiUrl, {
      'Accept': 'application/vnd.github+json'
    });

    if (!response.ok) {
      // Fallback to fetching the HTML page
      return this.fetchExternal(url);
    }

    const data = await response.json();

    // Extract release content
    let content = `# ${data.name || data.tag_name}\n\n`;

    if (data.published_at) {
      content += `**Released:** ${new Date(data.published_at).toLocaleDateString()}\n\n`;
    }

    if (data.body) {
      content += data.body;
    } else {
      content += 'No release notes provided.';
    }

    return {
      content,
      format: 'markdown',
      sourceType: 'github-release',
      url
    };
  }

  /**
   * Fetch changelog from GitHub file (convert to raw URL)
   */
  private async fetchGitHubFile(url: string): Promise<ChangelogFetchResult> {
    // Convert blob URL to raw URL
    const rawUrl = this.convertToRawUrl(url);

    const response = await this.makeRequest(rawUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch changelog from ${rawUrl}: ${response.status}`);
    }

    const content = await response.text();

    return {
      content,
      format: 'markdown',
      sourceType: 'github-file',
      url
    };
  }

  /**
   * Fetch changelog from external URL
   */
  private async fetchExternal(url: string): Promise<ChangelogFetchResult> {
    const response = await this.makeRequest(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch changelog from ${url}: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const content = await response.text();

    // Determine format based on content type
    let format: 'markdown' | 'html' | 'text' = 'text';
    if (contentType.includes('text/html')) {
      format = 'html';
    } else if (contentType.includes('text/markdown') || url.endsWith('.md')) {
      format = 'markdown';
    }

    return {
      content,
      format,
      sourceType: 'external',
      url
    };
  }

  /**
   * Convert GitHub blob URL to raw content URL
   */
  private convertToRawUrl(url: string): string {
    // Convert https://github.com/owner/repo/blob/branch/path
    // to https://raw.githubusercontent.com/owner/repo/branch/path

    try {
      const urlObj = new URL(url);

      if (urlObj.hostname === 'github.com' && urlObj.pathname.includes('/blob/')) {
        const pathParts = urlObj.pathname.split('/blob/');
        const [repoPath, filePath] = pathParts;
        const repoParts = repoPath.split('/').filter(p => p);
        const owner = repoParts[0];
        const repo = repoParts[1];

        return `https://raw.githubusercontent.com/${owner}/${repo}/${filePath}`;
      }
    } catch {
      // If conversion fails, return original URL
    }

    return url;
  }

  /**
   * Extract version-specific section from changelog content
   */
  extractVersionSection(content: string, version?: string): string {
    if (!version) {
      return content;
    }

    // Escape the version for use in regex
    const escapedVersion = this.escapeRegex(version);

    // Common patterns for version headers
    const patterns = [
      new RegExp(`^##\\s+${escapedVersion}\\s*/.*?$`, 'mi'), // Puma format: ## 7.0.3 / 2024-11-26
      new RegExp(`^#+\\s*(?:v|Version)?\\s*${escapedVersion}\\b.*?$`, 'mi'), // ## v7.0.3 or # Version 7.0.3
      new RegExp(`^\\[${escapedVersion}\\].*?$`, 'mi'), // [7.0.3] format
      new RegExp(`^${escapedVersion}\\s*\\(.*?\\).*?$`, 'mi'), // 7.0.3 (2024-11-26) format
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (match && match.index !== undefined) {
        const startIndex = match.index;
        const headerLine = match[0];

        // Detect header level (number of # symbols, default to 2 for other formats)
        const headerMatch = headerLine.match(/^(#+)/);
        const headerLevel = headerMatch ? headerMatch[1].length : 2;

        // Look for the next header of same or higher level (same or fewer # symbols)
        // Split content into lines for easier processing
        const lines = content.split('\n');
        const startLineIndex = content.substring(0, startIndex).split('\n').length - 1;

        let endLineIndex = lines.length;

        // Look for next version header starting from the line after current version
        for (let i = startLineIndex + 1; i < lines.length; i++) {
          const line = lines[i];
          // Check if this line is a header of the same or higher level
          if (line.match(new RegExp(`^#{1,${headerLevel}}\\s+\\S`))) {
            endLineIndex = i;
            break;
          }
        }

        // Extract the lines for this version
        const versionLines = lines.slice(startLineIndex, endLineIndex);
        return versionLines.join('\n').trim();
      }
    }

    // Version not found, return full content with a note
    return `*Note: Version ${version} not found in changelog*\n\n${content}`;
  }

  /**
   * Make HTTP request with timeout and headers
   */
  private async makeRequest(url: string, additionalHeaders?: Record<string, string>): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          ...additionalHeaders
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
      }
      throw error;
    }
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Convert HTML to simplified markdown (basic conversion)
   */
  htmlToMarkdown(html: string): string {
    // This is a basic conversion - for production, consider using a proper library
    let markdown = html;

    // Remove script and style tags
    markdown = markdown.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    markdown = markdown.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Convert headers
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n');
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n');
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n');

    // Convert lists
    markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    markdown = markdown.replace(/<ul[^>]*>/gi, '\n');
    markdown = markdown.replace(/<\/ul>/gi, '\n');
    markdown = markdown.replace(/<ol[^>]*>/gi, '\n');
    markdown = markdown.replace(/<\/ol>/gi, '\n');

    // Convert paragraphs and breaks
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    markdown = markdown.replace(/<br[^>]*>/gi, '\n');

    // Convert links
    markdown = markdown.replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

    // Convert bold and italic
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

    // Convert code
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```');

    // Remove remaining HTML tags
    markdown = markdown.replace(/<[^>]+>/g, '');

    // Clean up extra whitespace
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    markdown = markdown.trim();

    return markdown;
  }
}