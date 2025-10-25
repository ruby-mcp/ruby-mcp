import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup.js';
import { ChangelogFetcher } from '../../src/changelog/fetcher.js';
import { RubyGemsClient } from '../../src/api/client.js';

describe('ChangelogFetcher', () => {
  let fetcher: ChangelogFetcher;
  let client: RubyGemsClient;

  beforeEach(() => {
    client = new RubyGemsClient({
      baseUrl: 'https://rubygems.org',
      cacheEnabled: false,
    });
    fetcher = new ChangelogFetcher({
      client,
      cacheEnabled: false,
      timeout: 5000,
    });
  });

  describe('fetchChangelog with changelog_uri', () => {
    it('should fetch from changelog_uri when available', async () => {
      server.use(
        http.get('https://rubygems.org/api/v1/gems/test-gem.json', () => {
          return HttpResponse.json({
            name: 'test-gem',
            downloads: 1000,
            version: '1.0.0',
            version_created_at: '2024-12-26T18:52:12.345Z',
            version_downloads: 100,
            platform: 'ruby',
            yanked: false,
            project_uri: 'https://rubygems.org/gems/test-gem',
            gem_uri: 'https://rubygems.org/downloads/test-gem-1.0.0.gem',
            changelog_uri: 'https://example.com/changelog.md',
          });
        }),
        http.get('https://example.com/changelog.md', () => {
          return new HttpResponse(
            '# Changelog\n\n## 1.0.0\n- Initial release',
            {
              headers: { 'Content-Type': 'text/markdown' },
            }
          );
        })
      );

      const result = await fetcher.fetchChangelog('test-gem');

      expect(result.success).toBe(true);
      expect(result.content).toContain('# Changelog');
      expect(result.content).toContain('## 1.0.0');
      expect(result.content).toContain('- Initial release');
      expect(result.source).toBe('https://example.com/changelog.md');
    });

    it('should extract version-specific content when version is specified', async () => {
      server.use(
        http.get('https://rubygems.org/api/v1/gems/versioned-gem.json', () => {
          return HttpResponse.json({
            name: 'versioned-gem',
            downloads: 5000,
            version: '2.0.0',
            version_created_at: '2024-12-26T18:52:12.345Z',
            version_downloads: 500,
            platform: 'ruby',
            yanked: false,
            project_uri: 'https://rubygems.org/gems/versioned-gem',
            gem_uri: 'https://rubygems.org/downloads/versioned-gem-2.0.0.gem',
            changelog_uri: 'https://example.com/CHANGELOG.md',
          });
        }),
        http.get('https://example.com/CHANGELOG.md', () => {
          return new HttpResponse(
            '# Changelog\n\n## 2.0.0\n- New features\n\n## 1.0.0\n- Initial release',
            {
              headers: { 'Content-Type': 'text/markdown' },
            }
          );
        })
      );

      const result = await fetcher.fetchChangelog('versioned-gem', '2.0.0');

      expect(result.success).toBe(true);
      expect(result.content).toContain('New features');
      expect(result.content).not.toContain('Initial release');
    });
  });

  describe('fetchChangelog from GitHub', () => {
    it('should fetch from GitHub release when no changelog_uri', async () => {
      server.use(
        http.get('https://rubygems.org/api/v1/gems/github-gem.json', () => {
          return HttpResponse.json({
            name: 'github-gem',
            downloads: 2000,
            version: '1.5.0',
            version_created_at: '2024-12-26T18:52:12.345Z',
            version_downloads: 200,
            platform: 'ruby',
            yanked: false,
            project_uri: 'https://rubygems.org/gems/github-gem',
            gem_uri: 'https://rubygems.org/downloads/github-gem-1.5.0.gem',
            source_code_uri: 'https://github.com/example/github-gem',
          });
        }),
        http.get(
          'https://github.com/example/github-gem/releases/tag/v1.5.0',
          () => {
            return new HttpResponse(
              '<html><body><h1>v1.5.0</h1><p>Release notes for <strong>1.5.0</strong></p></body></html>',
              {
                headers: { 'Content-Type': 'text/html' },
              }
            );
          }
        )
      );

      const result = await fetcher.fetchChangelog('github-gem', '1.5.0');

      expect(result.success).toBe(true);
      // Version extraction removes the header and returns only the content
      expect(result.content).toContain('Release notes for **1.5.0**');
    });

    it('should fetch from raw CHANGELOG.md when release not available', async () => {
      server.use(
        http.get('https://rubygems.org/api/v1/gems/changelog-gem.json', () => {
          return HttpResponse.json({
            name: 'changelog-gem',
            downloads: 3000,
            version: '2.1.0',
            version_created_at: '2024-12-26T18:52:12.345Z',
            version_downloads: 300,
            platform: 'ruby',
            yanked: false,
            project_uri: 'https://rubygems.org/gems/changelog-gem',
            gem_uri: 'https://rubygems.org/downloads/changelog-gem-2.1.0.gem',
            source_code_uri: 'https://github.com/example/changelog-gem',
          });
        }),
        http.get(
          'https://github.com/example/changelog-gem/releases/tag/v2.1.0',
          () => {
            return new HttpResponse(null, { status: 404 });
          }
        ),
        http.get(
          'https://github.com/example/changelog-gem/releases/tag/2.1.0',
          () => {
            return new HttpResponse(null, { status: 404 });
          }
        ),
        http.get('https://github.com/example/changelog-gem/releases', () => {
          return new HttpResponse(null, { status: 404 });
        }),
        http.get(
          'https://raw.githubusercontent.com/example/changelog-gem/main/CHANGELOG.md',
          () => {
            return new HttpResponse('# Changelog\n\n## v2.1.0\n- Bug fixes', {
              headers: { 'Content-Type': 'text/plain' },
            });
          }
        )
      );

      const result = await fetcher.fetchChangelog('changelog-gem');

      expect(result.success).toBe(true);
      expect(result.content).toContain('# Changelog');
      expect(result.content).toContain('## v2.1.0');
    });

    it('should try master branch when main branch fails', async () => {
      server.use(
        http.get('https://rubygems.org/api/v1/gems/master-gem.json', () => {
          return HttpResponse.json({
            name: 'master-gem',
            downloads: 1500,
            version: '1.0.0',
            version_created_at: '2024-12-26T18:52:12.345Z',
            version_downloads: 150,
            platform: 'ruby',
            yanked: false,
            project_uri: 'https://rubygems.org/gems/master-gem',
            gem_uri: 'https://rubygems.org/downloads/master-gem-1.0.0.gem',
            source_code_uri: 'https://github.com/example/master-gem',
          });
        }),
        http.get(
          'https://github.com/example/master-gem/releases/tag/v1.0.0',
          () => {
            return new HttpResponse(null, { status: 404 });
          }
        ),
        http.get(
          'https://github.com/example/master-gem/releases/tag/1.0.0',
          () => {
            return new HttpResponse(null, { status: 404 });
          }
        ),
        http.get('https://github.com/example/master-gem/releases', () => {
          return new HttpResponse(null, { status: 404 });
        }),
        http.get(
          'https://raw.githubusercontent.com/example/master-gem/main/CHANGELOG.md',
          () => {
            return new HttpResponse(null, { status: 404 });
          }
        ),
        http.get(
          'https://raw.githubusercontent.com/example/master-gem/master/CHANGELOG.md',
          () => {
            return new HttpResponse('# Changelog from master\n\n## 1.0.0', {
              headers: { 'Content-Type': 'text/plain' },
            });
          }
        )
      );

      const result = await fetcher.fetchChangelog('master-gem');

      expect(result.success).toBe(true);
      expect(result.content).toContain('Changelog from master');
    });
  });

  describe('HTML to markdown conversion', () => {
    it('should convert HTML to markdown', async () => {
      server.use(
        http.get('https://rubygems.org/api/v1/gems/html-gem.json', () => {
          return HttpResponse.json({
            name: 'html-gem',
            downloads: 1000,
            version: '1.0.0',
            version_created_at: '2024-12-26T18:52:12.345Z',
            version_downloads: 100,
            platform: 'ruby',
            yanked: false,
            project_uri: 'https://rubygems.org/gems/html-gem',
            gem_uri: 'https://rubygems.org/downloads/html-gem-1.0.0.gem',
            changelog_uri: 'https://example.com/changelog.html',
          });
        }),
        http.get('https://example.com/changelog.html', () => {
          return new HttpResponse(
            `<html>
              <body>
                <h1>Changelog</h1>
                <h2>Version 1.0.0</h2>
                <ul>
                  <li>Feature <strong>one</strong></li>
                  <li>Feature <em>two</em></li>
                </ul>
                <p>Links: <a href="https://example.com">Homepage</a></p>
                <pre><code>gem install test</code></pre>
              </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html' },
            }
          );
        })
      );

      const result = await fetcher.fetchChangelog('html-gem');

      expect(result.success).toBe(true);
      expect(result.content).toContain('# Changelog');
      expect(result.content).toContain('## Version 1.0.0');
      expect(result.content).toContain('Feature **one**');
      expect(result.content).toContain('Feature *two*');
      expect(result.content).toContain('[Homepage](https://example.com)');
      expect(result.content).toContain('```');
      expect(result.content).toContain('gem install test');
    });
  });

  describe('error handling', () => {
    it('should return error when gem details fetch fails', async () => {
      server.use(
        http.get('https://rubygems.org/api/v1/gems/nonexistent.json', () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      const result = await fetcher.fetchChangelog('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when no changelog found from any source', async () => {
      server.use(
        http.get('https://rubygems.org/api/v1/gems/no-changelog.json', () => {
          return HttpResponse.json({
            name: 'no-changelog',
            downloads: 100,
            version: '1.0.0',
            version_created_at: '2024-12-26T18:52:12.345Z',
            version_downloads: 10,
            platform: 'ruby',
            yanked: false,
            project_uri: 'https://rubygems.org/gems/no-changelog',
            gem_uri: 'https://rubygems.org/downloads/no-changelog-1.0.0.gem',
          });
        })
      );

      const result = await fetcher.fetchChangelog('no-changelog');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No changelog found');
    });
  });

  describe('caching', () => {
    it('should use cache when enabled', async () => {
      const cachedFetcher = new ChangelogFetcher({
        client,
        cacheEnabled: true,
        cacheTtl: 60000,
      });

      let fetchCount = 0;

      server.use(
        http.get('https://rubygems.org/api/v1/gems/cached-gem.json', () => {
          return HttpResponse.json({
            name: 'cached-gem',
            downloads: 1000,
            version: '1.0.0',
            version_created_at: '2024-12-26T18:52:12.345Z',
            version_downloads: 100,
            platform: 'ruby',
            yanked: false,
            project_uri: 'https://rubygems.org/gems/cached-gem',
            gem_uri: 'https://rubygems.org/downloads/cached-gem-1.0.0.gem',
            changelog_uri: 'https://example.com/changelog.md',
          });
        }),
        http.get('https://example.com/changelog.md', () => {
          fetchCount++;
          return new HttpResponse('# Changelog\n\n## 1.0.0', {
            headers: { 'Content-Type': 'text/markdown' },
          });
        })
      );

      // First fetch
      const result1 = await cachedFetcher.fetchChangelog('cached-gem');
      expect(result1.success).toBe(true);
      expect(fetchCount).toBe(1);

      // Second fetch should use cache
      const result2 = await cachedFetcher.fetchChangelog('cached-gem');
      expect(result2.success).toBe(true);
      expect(fetchCount).toBe(1); // Should not increment

      // Clear cache
      cachedFetcher.clearCache();
      expect(cachedFetcher.getCacheStats().size).toBe(0);
    });

    it('should provide cache statistics', () => {
      const cachedFetcher = new ChangelogFetcher({
        client,
        cacheEnabled: true,
      });

      const stats = cachedFetcher.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should cleanup expired cache entries', () => {
      const cachedFetcher = new ChangelogFetcher({
        client,
        cacheEnabled: true,
      });

      const cleanedCount = cachedFetcher.cleanupCache();
      expect(cleanedCount).toBe(0);
    });
  });

  describe('GitHub URL parsing', () => {
    it('should handle GitHub URLs with .git suffix', async () => {
      server.use(
        http.get('https://rubygems.org/api/v1/gems/git-suffix-gem.json', () => {
          return HttpResponse.json({
            name: 'git-suffix-gem',
            downloads: 1000,
            version: '1.0.0',
            version_created_at: '2024-12-26T18:52:12.345Z',
            version_downloads: 100,
            platform: 'ruby',
            yanked: false,
            project_uri: 'https://rubygems.org/gems/git-suffix-gem',
            gem_uri: 'https://rubygems.org/downloads/git-suffix-gem-1.0.0.gem',
            source_code_uri: 'https://github.com/example/git-suffix-gem.git',
          });
        }),
        http.get(
          'https://raw.githubusercontent.com/example/git-suffix-gem/main/CHANGELOG.md',
          () => {
            return new HttpResponse('# Changelog\n\n## 1.0.0', {
              headers: { 'Content-Type': 'text/plain' },
            });
          }
        )
      );

      const result = await fetcher.fetchChangelog('git-suffix-gem');

      expect(result.success).toBe(true);
      expect(result.source).toContain('git-suffix-gem');
      // Ensure the .git suffix was removed from the repo name in the URL path
      expect(result.source).toContain(
        '/example/git-suffix-gem/main/CHANGELOG.md'
      );
      expect(result.source).not.toContain('/git-suffix-gem.git/');
    });
  });
});
