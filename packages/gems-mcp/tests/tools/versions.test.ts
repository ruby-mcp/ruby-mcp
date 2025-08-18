import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup.js';
import { VersionsTool } from '../../src/tools/versions.js';
import { RubyGemsClient } from '../../src/api/client.js';

describe('VersionsTool', () => {
  let versionsTool: VersionsTool;
  let client: RubyGemsClient;

  beforeEach(() => {
    client = new RubyGemsClient({
      baseUrl: 'https://rubygems.org',
      cacheEnabled: false,
    });
    versionsTool = new VersionsTool({ client });
  });

  describe('executeGetVersions', () => {
    it('should get gem versions successfully', async () => {
      const args = { gem_name: 'rails', include_prerelease: false };
      const result = await versionsTool.executeGetVersions(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('# Versions for rails');
      expect(result.content[0].text).toContain('Found 1 version');
      expect(result.content[0].text).toContain('• **8.0.2.1**');
    });

    it('should include prerelease versions when requested', async () => {
      server.use(
        http.get(
          'https://rubygems.org/api/v1/versions/prerelease-gem.json',
          () => {
            return HttpResponse.json([
              {
                authors: 'Author Name',
                built_at: '2024-12-26T18:52:12.345Z',
                created_at: '2024-12-26T18:52:12.345Z',
                downloads_count: 1000,
                metadata: {},
                number: '2.0.0.alpha',
                platform: 'ruby',
                prerelease: true,
                summary: 'A prerelease version',
                ruby_version: '>= 3.0',
              },
              {
                authors: 'Author Name',
                built_at: '2024-12-20T18:52:12.345Z',
                created_at: '2024-12-20T18:52:12.345Z',
                downloads_count: 5000,
                metadata: {},
                number: '1.0.0',
                platform: 'java',
                prerelease: false,
              },
            ]);
          }
        )
      );

      const args = { gem_name: 'prerelease-gem', include_prerelease: true };
      const result = await versionsTool.executeGetVersions(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('(including prerelease)');
      expect(result.content[0].text).toContain('2.0.0.alpha');
      expect(result.content[0].text).toContain('[PRERELEASE]');
      expect(result.content[0].text).toContain('(java)');
      expect(result.content[0].text).toContain('Summary: A prerelease version');
      expect(result.content[0].text).toContain('Ruby Version: >= 3.0');
    });

    it('should filter out prerelease versions by default', async () => {
      server.use(
        http.get('https://rubygems.org/api/v1/versions/mixed-gem.json', () => {
          return HttpResponse.json([
            {
              authors: 'Author Name',
              built_at: '2024-12-26T18:52:12.345Z',
              created_at: '2024-12-26T18:52:12.345Z',
              downloads_count: 1000,
              metadata: {},
              number: '2.0.0.alpha',
              platform: 'ruby',
              prerelease: true,
            },
            {
              authors: 'Author Name',
              built_at: '2024-12-20T18:52:12.345Z',
              created_at: '2024-12-20T18:52:12.345Z',
              downloads_count: 5000,
              metadata: {},
              number: '1.0.0',
              platform: 'ruby',
              prerelease: false,
            },
          ]);
        })
      );

      const args = { gem_name: 'mixed-gem', include_prerelease: false };
      const result = await versionsTool.executeGetVersions(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).not.toContain('2.0.0.alpha');
      expect(result.content[0].text).toContain('1.0.0');
      expect(result.content[0].text).not.toContain('[PRERELEASE]');
    });

    it('should handle no stable versions found', async () => {
      server.use(
        http.get(
          'https://rubygems.org/api/v1/versions/prerelease-only.json',
          () => {
            return HttpResponse.json([
              {
                authors: 'Author Name',
                built_at: '2024-12-26T18:52:12.345Z',
                created_at: '2024-12-26T18:52:12.345Z',
                downloads_count: 1000,
                metadata: {},
                number: '2.0.0.alpha',
                platform: 'ruby',
                prerelease: true,
              },
            ]);
          }
        )
      );

      const args = { gem_name: 'prerelease-only', include_prerelease: false };
      const result = await versionsTool.executeGetVersions(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(
        'No stable versions found for gem: prerelease-only'
      );
    });

    it('should handle validation errors', async () => {
      const args = { invalid_field: 'value' };
      const result = await versionsTool.executeGetVersions(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('should handle API errors', async () => {
      const args = { gem_name: 'error' };
      const result = await versionsTool.executeGetVersions(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting gem versions');
    });

    it('should handle unexpected errors', async () => {
      // Mock the client to throw an unexpected error
      const originalGetGemVersions = client.getGemVersions;
      client.getGemVersions = vi
        .fn()
        .mockRejectedValue(new Error('Network timeout'));

      const args = { gem_name: 'test-gem' };
      const result = await versionsTool.executeGetVersions(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Unexpected error while getting gem versions'
      );
      expect(result.content[0].text).toContain('Network timeout');

      // Restore original method
      client.getGemVersions = originalGetGemVersions;
    });
  });

  describe('executeGetLatestVersion', () => {
    it('should get latest version successfully', async () => {
      const args = { gem_name: 'rails', include_prerelease: false };
      const result = await versionsTool.executeGetLatestVersion(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain(
        '# Latest Stable Version for rails'
      );
      expect(result.content[0].text).toContain('**8.0.2.1**');
    });

    it('should include prerelease in title when requested', async () => {
      const args = { gem_name: 'rails', include_prerelease: true };
      const result = await versionsTool.executeGetLatestVersion(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('# Latest Version for rails');
      expect(result.content[0].text).not.toContain('Stable');
    });

    it('should handle prerelease filtering', async () => {
      server.use(
        http.get(
          'https://rubygems.org/api/v1/versions/prerelease-latest.json',
          () => {
            return HttpResponse.json([
              {
                authors: 'Author Name',
                built_at: '2024-12-20T18:52:12.345Z',
                created_at: '2024-12-20T18:52:12.345Z',
                downloads_count: 5000,
                metadata: {},
                number: '1.0.0',
                platform: 'ruby',
                prerelease: false,
                summary: 'Stable version',
                description: 'A stable release',
                licenses: ['MIT'],
                sha: 'abc123',
              },
            ]);
          }
        ),
        http.get(
          'https://rubygems.org/api/v1/versions/prerelease-latest/latest.json',
          () => {
            return HttpResponse.json({
              authors: 'Author Name',
              built_at: '2024-12-26T18:52:12.345Z',
              created_at: '2024-12-26T18:52:12.345Z',
              downloads_count: 1000,
              metadata: {},
              number: '2.0.0.alpha',
              platform: 'ruby',
              prerelease: true,
              rubygems_version: '3.0.0',
            });
          }
        )
      );

      const args = { gem_name: 'prerelease-latest', include_prerelease: false };
      const result = await versionsTool.executeGetLatestVersion(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('1.0.0');
      expect(result.content[0].text).not.toContain('2.0.0.alpha');
      expect(result.content[0].text).toContain(
        '- **Description:** A stable release'
      );
      expect(result.content[0].text).toContain('- **License:** MIT');
      expect(result.content[0].text).toContain('- **SHA256:** `abc123`');
    });

    it('should handle no stable versions when latest is prerelease', async () => {
      server.use(
        http.get('https://rubygems.org/api/v1/versions/no-stable.json', () => {
          return HttpResponse.json([
            {
              authors: 'Author Name',
              built_at: '2024-12-26T18:52:12.345Z',
              created_at: '2024-12-26T18:52:12.345Z',
              downloads_count: 1000,
              metadata: {},
              number: '2.0.0.alpha',
              platform: 'ruby',
              prerelease: true,
            },
          ]);
        }),
        http.get(
          'https://rubygems.org/api/v1/versions/no-stable/latest.json',
          () => {
            return HttpResponse.json({
              authors: 'Author Name',
              built_at: '2024-12-26T18:52:12.345Z',
              created_at: '2024-12-26T18:52:12.345Z',
              downloads_count: 1000,
              metadata: {},
              number: '2.0.0.alpha',
              platform: 'ruby',
              prerelease: true,
            });
          }
        )
      );

      const args = { gem_name: 'no-stable', include_prerelease: false };
      const result = await versionsTool.executeGetLatestVersion(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain(
        'No stable versions found for gem: no-stable'
      );
      expect(result.content[0].text).toContain(
        'Latest version 2.0.0.alpha is a prerelease'
      );
    });

    it('should handle validation errors', async () => {
      const args = { invalid_field: 'value' };
      const result = await versionsTool.executeGetLatestVersion(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('should handle API errors', async () => {
      const args = { gem_name: 'nonexistent' };
      const result = await versionsTool.executeGetLatestVersion(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting latest version');
    });

    it('should handle unexpected errors', async () => {
      // Mock the client to throw an unexpected error
      const originalGetLatestVersion = client.getLatestVersion;
      client.getLatestVersion = vi
        .fn()
        .mockRejectedValue(new Error('Network timeout'));

      const args = { gem_name: 'test-gem' };
      const result = await versionsTool.executeGetLatestVersion(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Unexpected error while getting latest version'
      );
      expect(result.content[0].text).toContain('Network timeout');

      // Restore original method
      client.getLatestVersion = originalGetLatestVersion;
    });

    it('should handle response with missing downloads_count field', async () => {
      // Test case that reproduces the bug where downloads_count is undefined
      server.use(
        http.get(
          'https://rubygems.org/api/v1/versions/missing-downloads.json',
          () => {
            // This simulates a version response with missing downloads_count
            return HttpResponse.json([
              {
                authors: 'Test Author',
                built_at: '2024-12-26T18:52:12.345Z',
                created_at: '2024-12-26T18:52:12.345Z',
                // downloads_count is intentionally missing
                metadata: {},
                number: '1.2.3',
                platform: 'ruby',
                prerelease: false,
                summary: 'Test gem with missing downloads',
              },
            ]);
          }
        )
      );

      const args = { gem_name: 'missing-downloads', include_prerelease: false };
      const result = await versionsTool.executeGetLatestVersion(args);

      // This should not crash even with missing downloads_count
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('1.2.3');
      expect(result.content[0].text).toContain('**Downloads:** N/A');
    });
  });

  describe('executeGetDependencies', () => {
    it('should get reverse dependencies successfully', async () => {
      const args = { gem_name: 'rails' };
      const result = await versionsTool.executeGetDependencies(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain(
        '# Reverse Dependencies for rails'
      );
      expect(result.content[0].text).toContain('3 gems depend on rails');
      expect(result.content[0].text).toContain('• activeadmin');
    });

    it('should handle singular vs plural correctly', async () => {
      server.use(
        http.get(
          'https://rubygems.org/api/v1/gems/single-dep/reverse_dependencies.json',
          () => {
            return HttpResponse.json([{ name: 'only-one-gem' }]);
          }
        )
      );

      const args = { gem_name: 'single-dep' };
      const result = await versionsTool.executeGetDependencies(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('1 gem depends on single-dep');
    });

    it('should handle no dependencies', async () => {
      const args = { gem_name: 'no-deps' };
      const result = await versionsTool.executeGetDependencies(args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe('No gems depend on no-deps.');
    });

    it('should handle validation errors', async () => {
      const args = { invalid_field: 'value' };
      const result = await versionsTool.executeGetDependencies(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('should handle API errors', async () => {
      const args = { gem_name: 'error' };
      const result = await versionsTool.executeGetDependencies(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting dependencies');
    });

    it('should handle unexpected errors', async () => {
      // Mock the client to throw an unexpected error
      const originalGetReverseDependencies = client.getReverseDependencies;
      client.getReverseDependencies = vi
        .fn()
        .mockRejectedValue(new Error('Network timeout'));

      const args = { gem_name: 'test-gem' };
      const result = await versionsTool.executeGetDependencies(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Unexpected error while getting dependencies'
      );
      expect(result.content[0].text).toContain('Network timeout');

      // Restore original method
      client.getReverseDependencies = originalGetReverseDependencies;
    });
  });

  describe('version formatting edge cases', () => {
    it('should format version with all optional fields', async () => {
      // Mock response with a version that has all optional fields
      const mockVersion = {
        number: '1.0.0',
        created_at: '2023-01-01T00:00:00.000Z',
        platform: 'ruby',
        downloads_count: 1000,
        authors: 'John Doe, Jane Smith',
        ruby_version: '>= 2.7.0',
        rubygems_version: '>= 3.0.0',
        licenses: ['MIT', 'Apache-2.0'],
      };

      const mockClient = {
        getLatestVersion: vi.fn().mockResolvedValue({
          data: mockVersion,
          success: true,
        }),
      } as unknown as RubyGemsClient;

      const tool = new VersionsTool({ client: mockClient });
      const result = await tool.executeGetLatestVersion({
        gem_name: 'full-gem',
        include_prerelease: false,
      });

      expect(result.isError).toBeUndefined();
      const content = result.content[0].text;
      expect(content).toContain('Authors:** John Doe, Jane Smith');
      expect(content).toContain('Ruby Version:** >= 2.7.0');
      expect(content).toContain('RubyGems Version:** >= 3.0.0');
      expect(content).toContain('License:** MIT, Apache-2.0');
    });

    it('should format version with minimal fields', async () => {
      // Mock response with a version that has minimal fields
      const mockVersion = {
        number: '1.0.0',
        created_at: '2023-01-01T00:00:00.000Z',
        platform: 'ruby',
        downloads_count: 1000,
        // No authors, ruby_version, rubygems_version, or licenses
      };

      const mockClient = {
        getLatestVersion: vi.fn().mockResolvedValue({
          data: mockVersion,
          success: true,
        }),
      } as unknown as RubyGemsClient;

      const tool = new VersionsTool({ client: mockClient });
      const result = await tool.executeGetLatestVersion({
        gem_name: 'minimal-gem',
        include_prerelease: false,
      });

      expect(result.isError).toBeUndefined();
      const content = result.content[0].text;
      expect(content).not.toContain('Authors:**');
      expect(content).not.toContain('Ruby Version:**');
      expect(content).not.toContain('RubyGems Version:**');
      expect(content).not.toContain('License:**');
    });

    it('should handle version formatting with empty licenses array', async () => {
      // Mock response with a version that has empty licenses array
      const mockVersion = {
        number: '1.0.0',
        created_at: '2023-01-01T00:00:00.000Z',
        platform: 'ruby',
        downloads_count: 1000,
        licenses: [], // Empty array should not show license section
      };

      const mockClient = {
        getLatestVersion: vi.fn().mockResolvedValue({
          data: mockVersion,
          success: true,
        }),
      } as unknown as RubyGemsClient;

      const tool = new VersionsTool({ client: mockClient });
      const result = await tool.executeGetLatestVersion({
        gem_name: 'empty-licenses-gem',
        include_prerelease: false,
      });

      expect(result.isError).toBeUndefined();
      const content = result.content[0].text;
      expect(content).not.toContain('License:**'); // Empty licenses should not show license
    });
  });
});
