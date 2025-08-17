import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GemsServer } from '../../src/index.js';
import { SearchTool } from '../../src/tools/search.js';
import { DetailsTool } from '../../src/tools/details.js';
import { VersionsTool } from '../../src/tools/versions.js';

describe('Tool Execution E2E Tests', () => {
  let server: GemsServer;
  let searchTool: SearchTool;
  let detailsTool: DetailsTool;
  let versionsTool: VersionsTool;

  beforeAll(() => {
    server = new GemsServer();
    const client = server.getClient();

    searchTool = new SearchTool({ client });
    detailsTool = new DetailsTool({ client });
    versionsTool = new VersionsTool({ client });
  });

  afterAll(() => {
    if (server) {
      const client = server.getClient();
      client.clearCache();
    }
  });

  describe('search_gems functionality', () => {
    it('should execute search with valid query', async () => {
      const result = await searchTool.execute({ query: 'rails' });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      if (!result.isError && result.content.length > 0) {
        const firstGem = result.content[0];
        expect(firstGem).toHaveProperty('text');
        expect(firstGem.text).toContain('rails');
        expect(firstGem.text).toContain('Latest:');
        expect(firstGem.text).toContain('Downloads:');
      }
    });

    it('should handle empty search results', async () => {
      const result = await searchTool.execute({
        query: 'xyzabc123nonexistent',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      if (!result.isError) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].text).toBe(
          'No gems found matching query: "xyzabc123nonexistent"'
        );
      }
    });

    it('should handle pagination', async () => {
      const result = await searchTool.execute({ query: 'rails', page: 2 });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should handle invalid parameters gracefully', async () => {
      const result = await searchTool.execute({ query: '' });

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Error:');
    });
  });

  describe('get_gem_details functionality', () => {
    it('should get details for a valid gem', async () => {
      const result = await detailsTool.execute({ name: 'rails' });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);

      if (!result.isError) {
        const content = result.content[0].text;
        expect(content).toContain('rails');
        expect(content).toContain('Version:');
        expect(content).toContain('Authors:');
        expect(content).toContain('License:');
        expect(content).toContain('Homepage:');
        expect(content).toContain('Description:');
      }
    });

    it('should get details for a specific version', async () => {
      const result = await detailsTool.execute({
        name: 'rails',
        version: '7.0.0',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);

      if (!result.isError) {
        const content = result.content[0].text;
        expect(content).toContain('rails');
        expect(content).toContain('Version: 7.0.0');
      }
    });

    it('should handle non-existent gem', async () => {
      const result = await detailsTool.execute({
        name: 'xyzabc123nonexistent',
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Error:');
    });
  });

  describe('get_gem_versions functionality', () => {
    it('should get all versions for a gem', async () => {
      const result = await versionsTool.executeGetVersions({ name: 'rails' });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);

      if (!result.isError) {
        const content = result.content[0].text;
        expect(content).toContain('Versions for rails');
        expect(content).toContain('Latest stable:');
        expect(content).toContain('Total versions:');
        expect(content).toContain('Version history:');
      }
    });

    it('should filter prerelease versions', async () => {
      const resultWithPrerelease = await versionsTool.executeGetVersions({
        name: 'rails',
        includePrerelease: true,
      });

      const resultWithoutPrerelease = await versionsTool.executeGetVersions({
        name: 'rails',
        includePrerelease: false,
      });

      expect(resultWithPrerelease).toBeDefined();
      expect(resultWithoutPrerelease).toBeDefined();

      if (!resultWithPrerelease.isError && !resultWithoutPrerelease.isError) {
        const withPrereleaseContent = resultWithPrerelease.content[0].text;
        const withoutPrereleaseContent =
          resultWithoutPrerelease.content[0].text;

        const totalWithPrerelease = withPrereleaseContent.match(
          /Total versions: (\d+)/
        )?.[1];
        const totalWithoutPrerelease = withoutPrereleaseContent.match(
          /Total versions: (\d+)/
        )?.[1];

        if (totalWithPrerelease && totalWithoutPrerelease) {
          expect(Number(totalWithPrerelease)).toBeGreaterThanOrEqual(
            Number(totalWithoutPrerelease)
          );
        }
      }
    });
  });

  describe('get_latest_version functionality', () => {
    it('should get latest stable version', async () => {
      const result = await versionsTool.executeGetLatestVersion({
        name: 'rails',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);

      if (!result.isError) {
        const content = result.content[0].text;
        expect(content).toContain('Latest version of rails');
        expect(content).toMatch(/Version: \d+\.\d+\.\d+/);
        expect(content).toContain('Released:');
        expect(content).toContain('SHA256:');
      }
    });

    it('should get latest version including prerelease', async () => {
      const result = await versionsTool.executeGetLatestVersion({
        name: 'rails',
        includePrerelease: true,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);

      if (!result.isError) {
        const content = result.content[0].text;
        expect(content).toContain('Latest version of rails');
      }
    });
  });

  describe('get_gem_dependencies functionality', () => {
    it('should get reverse dependencies for a gem', async () => {
      const result = await versionsTool.executeGetDependencies({
        name: 'rack',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);

      if (!result.isError) {
        const content = result.content[0].text;
        expect(content).toContain('Reverse dependencies for rack');
        expect(content).toContain('Total gems depending on rack:');
        expect(content).toContain('Dependent gems:');
      }
    });

    it('should handle gem with no dependencies', async () => {
      const result = await versionsTool.executeGetDependencies({
        name: 'xyzabc123test',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      if (!result.isError) {
        const content = result.content[0].text;
        expect(content).toContain('Reverse dependencies for xyzabc123test');
        expect(content).toContain('Total gems depending on xyzabc123test: 0');
      }
    });
  });
});
