import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup.js';
import { SearchTool } from '../../src/tools/search.js';
import { RubyGemsClient } from '../../src/api/client.js';

describe('SearchTool', () => {
  let searchTool: SearchTool;
  let client: RubyGemsClient;

  beforeEach(() => {
    client = new RubyGemsClient({
      baseUrl: 'https://rubygems.org',
      cacheEnabled: false,
    });
    searchTool = new SearchTool({ client });
  });

  it('should search for gems successfully', async () => {
    const args = { query: 'rails', limit: 10 };
    const result = await searchTool.execute(args);

    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Found 1 gem matching "rails"');
    expect(result.content[0].text).toContain(
      'rails by David Heinemeier Hansson'
    );
  });

  it('should handle gems with no licenses', async () => {
    server.use(
      http.get('https://rubygems.org/api/v1/search.json', ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get('query');

        if (query === 'no-license') {
          return HttpResponse.json([
            {
              name: 'no-license-gem',
              downloads: 1000,
              version: '1.0.0',
              version_created_at: '2024-12-26T18:52:12.345Z',
              version_downloads: 100,
              platform: 'ruby',
              authors: 'Test Author',
              info: 'A gem without licenses',
              licenses: [], // Empty licenses array
              metadata: {},
              yanked: false,
              sha: 'abc123',
              project_uri: 'https://rubygems.org/gems/no-license-gem',
              gem_uri:
                'https://rubygems.org/downloads/no-license-gem-1.0.0.gem',
              homepage_uri: 'https://example.com',
            },
          ]);
        }

        return HttpResponse.json([]);
      })
    );

    const args = { query: 'no-license', limit: 10 };
    const result = await searchTool.execute(args);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('no-license-gem');
    expect(result.content[0].text).not.toContain('License:');
  });

  it('should handle exactly 1 gem result (singular)', async () => {
    // This tests the branch where gems.length === 1
    const args = { query: 'rails', limit: 10 };
    const result = await searchTool.execute(args);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Found 1 gem matching');
    expect(result.content[0].text).not.toContain('gems matching');
  });

  it('should handle non-Error exceptions', async () => {
    // Mock the client to throw a non-Error exception
    const badClient = {
      searchGems: vi.fn().mockRejectedValue('string error'),
    };
    const badTool = new SearchTool({ client: badClient as any });

    const result = await badTool.execute({ query: 'test' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unexpected error');
    expect(result.content[0].text).toContain('Unknown error');
  });

  it('should handle gems with null/undefined licenses', async () => {
    server.use(
      http.get('https://rubygems.org/api/v1/search.json', ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get('query');

        if (query === 'null-license') {
          return HttpResponse.json([
            {
              name: 'null-license-gem',
              downloads: 1000,
              version: '1.0.0',
              version_created_at: '2024-12-26T18:52:12.345Z',
              version_downloads: 100,
              platform: 'ruby',
              authors: 'Test Author',
              info: 'A gem with null licenses',
              licenses: null, // null licenses
              metadata: {},
              yanked: false,
              sha: 'abc123',
              project_uri: 'https://rubygems.org/gems/null-license-gem',
              gem_uri:
                'https://rubygems.org/downloads/null-license-gem-1.0.0.gem',
              homepage_uri: 'https://example.com',
            },
          ]);
        }

        return HttpResponse.json([]);
      })
    );

    const args = { query: 'null-license', limit: 10 };
    const result = await searchTool.execute(args);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('null-license-gem');
    expect(result.content[0].text).not.toContain('License:');
  });

  it('should handle unexpected errors', async () => {
    // Mock the client to throw an unexpected error
    const originalSearchGems = client.searchGems;
    client.searchGems = vi.fn().mockRejectedValue(new Error('Network timeout'));

    const args = { query: 'test-gem', limit: 10 };
    const result = await searchTool.execute(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      'Unexpected error while searching for gems'
    );
    expect(result.content[0].text).toContain('Network timeout');

    // Restore original method
    client.searchGems = originalSearchGems;
  });

  it('should handle empty search results', async () => {
    const args = { query: 'nonexistent', limit: 10 };
    const result = await searchTool.execute(args);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toBe(
      'No gems found matching query: "nonexistent"'
    );
  });

  it('should handle API errors', async () => {
    const args = { query: 'error', limit: 10 };
    const result = await searchTool.execute(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error searching for gems');
  });

  it('should validate empty query', async () => {
    const args = { query: '', limit: 10 };
    const result = await searchTool.execute(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Query cannot be empty');
  });

  it('should validate limit parameter', async () => {
    const args = { query: 'rails', limit: 101 };
    const result = await searchTool.execute(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error:');
  });

  it('should handle gems with minimal metadata', async () => {
    server.use(
      http.get('https://rubygems.org/api/v1/search.json', ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get('query');

        if (query === 'minimal') {
          return HttpResponse.json([
            {
              name: 'minimal-gem',
              downloads: 500,
              version: '1.0.0',
              version_created_at: '2024-12-26T18:52:12.345Z',
              version_downloads: 50,
              platform: 'ruby',
              // Missing authors (null/undefined)
              authors: null,
              // Missing info (null/undefined)
              info: null,
              licenses: ['MIT'],
              metadata: {},
              yanked: false,
              sha: 'def456',
              project_uri: 'https://rubygems.org/gems/minimal-gem',
              gem_uri: 'https://rubygems.org/downloads/minimal-gem-1.0.0.gem',
              // Missing homepage_uri
            },
          ]);
        }

        return HttpResponse.json([]);
      })
    );

    const args = { query: 'minimal', limit: 10 };
    const result = await searchTool.execute(args);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('minimal-gem');
    expect(result.content[0].text).not.toContain(' by '); // no authors
    expect(result.content[0].text).not.toContain('\n  A '); // no description
    expect(result.content[0].text).not.toContain('Homepage:'); // no homepage
    expect(result.content[0].text).toContain('License: MIT'); // has license
  });

  it('should handle single gem result correctly', async () => {
    server.use(
      http.get('https://rubygems.org/api/v1/search.json', ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get('query');

        if (query === 'single') {
          return HttpResponse.json([
            {
              name: 'single-gem',
              downloads: 100,
              version: '0.1.0',
              version_created_at: '2024-12-26T18:52:12.345Z',
              version_downloads: 10,
              platform: 'ruby',
              authors: 'Solo Author',
              info: 'A single gem result',
              licenses: ['Apache-2.0'],
              metadata: {},
              yanked: false,
              sha: 'single123',
              project_uri: 'https://rubygems.org/gems/single-gem',
              gem_uri: 'https://rubygems.org/downloads/single-gem-0.1.0.gem',
              homepage_uri: 'https://single.example.com',
            },
          ]);
        }

        return HttpResponse.json([]);
      })
    );

    const args = { query: 'single', limit: 10 };
    const result = await searchTool.execute(args);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Found 1 gem matching "single"'); // singular
    expect(result.content[0].text).not.toContain('gems matching'); // not plural
  });
});
