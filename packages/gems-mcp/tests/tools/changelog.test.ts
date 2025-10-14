import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup.js';
import { ChangelogTool } from '../../src/tools/changelog.js';
import { RubyGemsClient } from '../../src/api/client.js';
import { ChangelogCache } from '../../src/changelog/cache.js';
import { changelogHandlers } from '../fixtures/changelog-handlers.js';
import { mockChangelogResponses } from '../fixtures/changelog-responses.js';

describe('ChangelogTool', () => {
  let changelogTool: ChangelogTool;
  let client: RubyGemsClient;
  let cache: ChangelogCache;

  beforeEach(() => {
    // Reset handlers and add changelog handlers for each test
    server.resetHandlers();
    server.use(...changelogHandlers);

    client = new RubyGemsClient({
      baseUrl: 'https://rubygems.org',
      cacheEnabled: false,
    });
    cache = new ChangelogCache();
    changelogTool = new ChangelogTool({ client, cache });
  });

  describe('GitHub Releases', () => {
    it('should fetch changelog from GitHub release page', async () => {
      const args = { gem_name: 'rails' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      expect(text).toContain('# Changelog for rails');
      expect(text).toContain('**Source:** https://github.com/rails/rails/releases/tag/v8.0.3');
      expect(text).toContain('**Current Version:** 8.0.3');
      expect(text).toContain('# v8.0.3');
      expect(text).toContain('## Active Support');
      expect(text).toContain('## Active Record');
    });

    it('should fetch specific version from GitHub release', async () => {
      const args = { gem_name: 'rails', version: '8.0.3' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('# Changelog for rails (version 8.0.3)');
      expect(text).toContain('v8.0.3');
    });
  });

  describe('GitHub Files', () => {
    it('should fetch changelog from GitHub markdown file', async () => {
      const args = { gem_name: 'puma' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('# Changelog for puma');
      expect(text).toContain('**Source:** https://github.com/puma/puma/blob/master/History.md');
      expect(text).toContain('## 7.0.4 / 2024-12-01');
      expect(text).toContain('* Bugfixes');
      expect(text).toContain('Fix compiling the native extension');
    });

    it('should extract specific version from markdown file', async () => {
      const args = { gem_name: 'puma', version: '7.0.3' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('# Changelog for puma (version 7.0.3)');
      expect(text).toContain('7.0.3');
      expect(text).toContain('Handle `Errno::EINTR`'); // Content from 7.0.3
      // The version extracted section should not contain content from other versions
      expect(text).not.toContain('Fix compiling the native extension'); // Content from 7.0.4
      expect(text).not.toContain('Revert refactoring'); // Content from 7.0.2
    });

    it('should handle Changes.md file format', async () => {
      const args = { gem_name: 'sidekiq' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('# Changelog for sidekiq');
      expect(text).toContain('## 8.0.8');
      expect(text).toContain('More internal refactoring');
    });
  });

  describe('External Changelogs', () => {
    it('should fetch and convert HTML changelog to markdown', async () => {
      const args = { gem_name: 'nokogiri' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('# Changelog for nokogiri');
      expect(text).toContain('**Source:** https://nokogiri.org/CHANGELOG.html');
      expect(text).toContain('Nokogiri Changelog');
      expect(text).toContain('v1.18.10');
      expect(text).toContain('Dependencies');
    });
  });

  describe('Summary Format', () => {
    it('should return truncated summary when format is summary', async () => {
      const args = { gem_name: 'puma', format: 'summary' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('# Changelog for puma');
      expect(text).toContain('7.0.4');
      expect(text).toContain('7.0.3');
      expect(text).toContain('7.0.2');
      expect(text).toContain('... (truncated for summary)');
      // Should not include all versions
      expect(text).not.toContain('7.0.0');
    });
  });

  describe('Caching', () => {
    it('should cache fetched changelog', async () => {
      // First call - should fetch from API
      const args = { gem_name: 'rails' };
      const result1 = await changelogTool.execute(args);
      expect(result1.isError).toBeFalsy();

      // Spy on the fetcher to verify cache is used
      const fetchSpy = vi.spyOn(client, 'getGemDetails');

      // Second call - should use cache
      const result2 = await changelogTool.execute(args);
      expect(result2.isError).toBeFalsy();
      expect(result2.content[0].text).toBe(result1.content[0].text);

      // Should not have made another API call
      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('should cache version-specific changelogs separately', async () => {
      // Fetch full changelog
      const fullResult = await changelogTool.execute({ gem_name: 'puma' });
      expect(fullResult.isError).toBeFalsy();

      // Fetch version-specific changelog
      const versionResult = await changelogTool.execute({ gem_name: 'puma', version: '7.0.3' });
      expect(versionResult.isError).toBeFalsy();

      // They should be different
      expect(versionResult.content[0].text).not.toBe(fullResult.content[0].text);
      expect(versionResult.content[0].text).toContain('version 7.0.3');
    });

    it('should provide cache statistics', () => {
      const stats = changelogTool.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('keys');
      expect(Array.isArray(stats.keys)).toBe(true);
    });

    it('should clear cache', async () => {
      // Add something to cache
      await changelogTool.execute({ gem_name: 'rails' });
      let stats = changelogTool.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      // Clear cache
      changelogTool.clearCache();
      stats = changelogTool.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle gem without changelog URL', async () => {
      const args = { gem_name: 'test-gem' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('# Changelog for test-gem');
      expect(text).toContain('No changelog URL provided');
      expect(text).toContain('You may find release information at the project homepage');
      expect(text).toContain('https://example.com');
      expect(text).toContain('Or check the source code repository');
      expect(text).toContain('https://github.com/example/test-gem');
    });

    it('should handle gem not found', async () => {
      const args = { gem_name: 'nonexistent' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting gem details');
    });

    it('should handle fetch errors for changelog URL', async () => {
      server.use(
        http.get('https://rubygems.org/api/v1/gems/error-gem.json', () => {
          return HttpResponse.json({
            name: 'error-gem',
            downloads: 100,
            version: '1.0.0',
            version_created_at: '2024-12-26T00:00:00Z',
            version_downloads: 10,
            platform: 'ruby',
            yanked: false,
            project_uri: 'https://rubygems.org/gems/error-gem',
            gem_uri: 'https://rubygems.org/downloads/error-gem-1.0.0.gem',
            changelog_uri: 'https://api.github.com/repos/error/error/releases/tags/v1.0.0',
            dependencies: {
              development: [],
              runtime: [],
            },
          });
        })
      );

      const args = { gem_name: 'error-gem' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unable to fetch changelog');
    });

    it('should handle validation errors', async () => {
      const args = { invalid_field: 'value' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('should handle empty gem name', async () => {
      const args = { gem_name: '' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Gem name cannot be empty');
    });

    it('should handle invalid gem name format', async () => {
      const args = { gem_name: 'invalid gem name!' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid gem name format');
    });

    it('should handle timeout errors', async () => {
      // Create a custom tool with very short timeout
      const shortTimeoutTool = new ChangelogTool({
        client,
        cache,
        fetcher: new (await import('../../src/changelog/fetcher.js')).ChangelogFetcher({
          timeout: 1, // 1ms timeout
        }),
      });

      server.use(
        http.get('https://rubygems.org/api/v1/gems/timeout-gem.json', () => {
          return HttpResponse.json({
            name: 'timeout-gem',
            downloads: 100,
            version: '1.0.0',
            version_created_at: '2024-12-26T00:00:00Z',
            version_downloads: 10,
            platform: 'ruby',
            yanked: false,
            project_uri: 'https://rubygems.org/gems/timeout-gem',
            gem_uri: 'https://rubygems.org/downloads/timeout-gem-1.0.0.gem',
            changelog_uri: 'https://api.github.com/repos/timeout/timeout/releases/tags/v1.0.0',
            dependencies: {
              development: [],
              runtime: [],
            },
          });
        })
      );

      const args = { gem_name: 'timeout-gem' };
      const result = await shortTimeoutTool.execute(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('timeout');
    });

    it('should handle unexpected errors gracefully', async () => {
      // Mock the client to throw an unexpected error
      const originalGetGemDetails = client.getGemDetails;
      client.getGemDetails = vi
        .fn()
        .mockRejectedValue(new Error('Unexpected internal error'));

      const args = { gem_name: 'test-gem' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected error');
      expect(result.content[0].text).toContain('Unexpected internal error');

      // Restore original method
      client.getGemDetails = originalGetGemDetails;
    });
  });

  describe('Version Extraction', () => {
    it('should handle version not found in changelog', async () => {
      const args = { gem_name: 'puma', version: '9.9.9' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('Note: Version 9.9.9 not found in changelog');
      // Should still include the full changelog
      expect(text).toContain('7.0.4');
    });

    it('should extract version with different header formats', async () => {
      server.use(
        http.get('https://rubygems.org/api/v1/gems/custom-gem.json', () => {
          return HttpResponse.json({
            name: 'custom-gem',
            downloads: 100,
            version: '2.0.0',
            version_created_at: '2024-12-26T00:00:00Z',
            version_downloads: 10,
            platform: 'ruby',
            yanked: false,
            project_uri: 'https://rubygems.org/gems/custom-gem',
            gem_uri: 'https://rubygems.org/downloads/custom-gem-2.0.0.gem',
            changelog_uri: 'https://raw.githubusercontent.com/custom/custom/main/CHANGELOG.md',
            dependencies: {
              development: [],
              runtime: [],
            },
          });
        }),
        http.get('https://raw.githubusercontent.com/custom/custom/main/CHANGELOG.md', () => {
          return new HttpResponse(
            `# Changelog

[2.0.0] - 2024-12-26
- Major release

Version 1.5.0 (2024-11-01)
- Minor update

### v1.0.0
- Initial release`,
            {
              headers: {
                'Content-Type': 'text/plain; charset=utf-8',
              },
            }
          );
        })
      );

      const result = await changelogTool.execute({ gem_name: 'custom-gem', version: '1.5.0' });
      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('1.5.0');
      expect(text).toContain('Minor update');
    });
  });

  describe('Input Validation', () => {
    it('should validate format parameter', async () => {
      const args = { gem_name: 'rails', format: 'invalid' as any };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('should default format to full', async () => {
      const args = { gem_name: 'rails' };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBeFalsy();
      // Full changelog should be returned
      const text = result.content[0].text;
      expect(text).toContain('Active Support');
      expect(text).toContain('Active Record');
      expect(text).toContain('Railties');
    });

    it('should handle very long version strings', async () => {
      const args = {
        gem_name: 'rails',
        version: 'a'.repeat(51), // Exceeds max length
      };
      const result = await changelogTool.execute(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });
  });
});