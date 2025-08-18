import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RubyGemsClient } from '../../src/api/client';
import { server } from '../setup.js';
import { http, HttpResponse } from 'msw';

describe('RubyGemsClient', () => {
  let client: RubyGemsClient;

  beforeEach(() => {
    // Create client with cache disabled for most tests
    client = new RubyGemsClient({
      cacheEnabled: false,
      rateLimitDelay: 0, // Speed up tests
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    client.clearCache();
  });

  describe('searchGems', () => {
    it('should search for gems and return successful results', async () => {
      const result = await client.searchGems('rails');

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
      if (result.success) {
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.data[0]).toHaveProperty('name');
        expect(result.data[0]).toHaveProperty('info');
      }
    });

    it('should handle search with no results', async () => {
      const result = await client.searchGems('nonexistent-gem-12345');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should limit search results when specified', async () => {
      const result = await client.searchGems('rails', 2);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('getGemDetails', () => {
    it('should get gem details for existing gem', async () => {
      const result = await client.getGemDetails('rails');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('name', 'rails');
        expect(result.data).toHaveProperty('version');
        expect(result.data).toHaveProperty('info');
        expect(result.data).toHaveProperty('authors');
      }
    });

    it('should handle gem not found', async () => {
      const result = await client.getGemDetails('nonexistent-gem-12345');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Resource not found');
    });
  });

  describe('getGemVersions', () => {
    it('should get gem versions for existing gem', async () => {
      const result = await client.getGemVersions('rails');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(Array);
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.data[0]).toHaveProperty('number');
        expect(result.data[0]).toHaveProperty('platform');
      }
    });

    it('should handle versions for nonexistent gem', async () => {
      const result = await client.getGemVersions('nonexistent-gem-12345');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Resource not found');
    });
  });

  describe('getLatestVersion', () => {
    it('should get latest version for existing gem', async () => {
      const result = await client.getLatestVersion('rails');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('number');
        expect(result.data).toHaveProperty('platform');
      }
    });

    it('should handle latest version for nonexistent gem', async () => {
      const result = await client.getLatestVersion('nonexistent-gem-12345');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Resource not found');
    });
  });

  describe('getReverseDependencies', () => {
    it('should get reverse dependencies for existing gem', async () => {
      const result = await client.getReverseDependencies('activesupport');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(Array);
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.data[0]).toHaveProperty('name');
      }
    });

    it('should handle reverse dependencies for nonexistent gem', async () => {
      const result = await client.getReverseDependencies(
        'nonexistent-gem-12345'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Resource not found');
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Create client with caching enabled for these tests
      client = new RubyGemsClient({
        cacheEnabled: true,
        rateLimitDelay: 0,
        cacheTtl: 300000, // 5 minutes
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should cache successful responses', async () => {
      // First call
      const result1 = await client.getGemDetails('rails');
      expect(result1.success).toBe(true);

      const stats1 = client.getCacheStats();
      expect(stats1.size).toBe(1);

      // Second call should use cache
      const result2 = await client.getGemDetails('rails');
      expect(result2.success).toBe(true);
      expect(result2.data).toEqual(result1.data);

      // Cache should still have 1 entry
      const stats2 = client.getCacheStats();
      expect(stats2.size).toBe(1);
    });

    it('should expire cache after TTL', async () => {
      // First call
      const result1 = await client.getGemDetails('rails');
      expect(result1.success).toBe(true);

      const stats1 = client.getCacheStats();
      expect(stats1.size).toBe(1);

      // Advance time past TTL (5 minutes = 300000ms)
      vi.advanceTimersByTime(301000);

      // Cleanup expired entries
      const cleaned = client.cleanupCache();
      expect(cleaned).toBeGreaterThan(0);

      const stats2 = client.getCacheStats();
      expect(stats2.size).toBe(0);
    });

    it('should not cache failed responses', async () => {
      // First call should fail
      const result1 = await client.getGemDetails('nonexistent-gem-12345');
      expect(result1.success).toBe(false);

      const stats1 = client.getCacheStats();
      expect(stats1.size).toBe(0); // Failed responses not cached

      // Second call should try again (not cached)
      const result2 = await client.getGemDetails('nonexistent-gem-12345');
      expect(result2.success).toBe(false);

      const stats2 = client.getCacheStats();
      expect(stats2.size).toBe(0);
    });

    it('should cache different endpoints separately', async () => {
      await client.getGemDetails('rails');
      await client.getGemVersions('rails');

      const stats = client.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toHaveLength(2);
    });

    it('should clear cache when requested', async () => {
      await client.getGemDetails('rails');

      const stats1 = client.getCacheStats();
      expect(stats1.size).toBe(1);

      client.clearCache();

      const stats2 = client.getCacheStats();
      expect(stats2.size).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customClient = new RubyGemsClient({
        baseUrl: 'https://custom.rubygems.org',
        timeout: 5000,
        userAgent: 'Custom-Agent/1.0.0',
        cacheEnabled: false,
        rateLimitDelay: 200,
      });

      expect(customClient).toBeInstanceOf(RubyGemsClient);
    });

    it('should use default configuration when not specified', () => {
      const defaultClient = new RubyGemsClient();
      expect(defaultClient).toBeInstanceOf(RubyGemsClient);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Create client with invalid base URL
      const badClient = new RubyGemsClient({
        baseUrl: 'https://invalid-host-12345.example',
        cacheEnabled: false,
        rateLimitDelay: 0,
        timeout: 1000,
      });

      const result = await badClient.searchGems('rails');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/aborted|fetch failed|network|Network/);
    });

    it('should handle fetch errors properly', async () => {
      // This tests the error handling structure without relying on actual network failures
      const client = new RubyGemsClient({
        cacheEnabled: false,
        rateLimitDelay: 0,
      });

      // Test with a gem name that will return 404
      const result = await client.getGemDetails('nonexistent-gem-12345');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Resource not found');
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limiting configuration', async () => {
      const rateLimitClient = new RubyGemsClient({
        cacheEnabled: false,
        rateLimitDelay: 100, // 100ms delay
      });

      const start = Date.now();

      // Make two requests
      await rateLimitClient.searchGems('rails');
      await rateLimitClient.searchGems('test');

      const duration = Date.now() - start;

      // Should take at least 100ms due to rate limiting
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should handle rate limit errors', async () => {
      // Create a handler that returns 429 for rate limiting
      server.use(
        http.get('https://rubygems.org/api/v1/search.json', () => {
          return new HttpResponse(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );

      const client = new RubyGemsClient({
        cacheEnabled: false,
        rateLimitDelay: 0,
      });

      const result = await client.searchGems('test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });
  });

  describe('getReverseDependencies error handling', () => {
    it('should handle getReverseDependencies API errors', async () => {
      // Create a handler that returns a 500 error
      server.use(
        http.get('https://rubygems.org/api/v1/gems/*/reverse_dependencies.json', () => {
          return new HttpResponse(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );

      const client = new RubyGemsClient({
        cacheEnabled: false,
        rateLimitDelay: 0,
      });

      const result = await client.getReverseDependencies('test-gem');
      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 500');
      expect(result.data).toBe(null);
    });

    it('should handle getReverseDependencies network errors', async () => {
      // Create a handler that returns a 502 error (bad gateway)
      server.use(
        http.get('https://rubygems.org/api/v1/gems/*/reverse_dependencies.json', () => {
          return new HttpResponse(null, {
            status: 502,
            statusText: 'Bad Gateway'
          });
        })
      );

      const client = new RubyGemsClient({
        cacheEnabled: false,
        rateLimitDelay: 0,
      });

      const result = await client.getReverseDependencies('test-gem');
      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 502');
      expect(result.data).toBe(null);
    });
  });
});
