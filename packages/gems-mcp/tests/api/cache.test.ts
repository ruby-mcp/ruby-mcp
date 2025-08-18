import { describe, it, expect, beforeEach } from 'vitest';
import { ApiCache } from '../../src/api/cache.js';

describe('ApiCache additional coverage', () => {
  let cache: ApiCache;

  beforeEach(() => {
    cache = new ApiCache(60000); // 1 minute TTL
  });

  describe('has method', () => {
    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return true for existing keys', () => {
      cache.set('test-key', 'test-value');
      expect(cache.has('test-key')).toBe(true);
    });
  });

  describe('delete method', () => {
    it('should return false when deleting non-existent keys', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('should return true when deleting existing keys', () => {
      cache.set('test-key', 'test-value');
      expect(cache.delete('test-key')).toBe(true);
      expect(cache.has('test-key')).toBe(false);
    });
  });

  describe('generateKey static method', () => {
    it('should handle undefined params', () => {
      const key = ApiCache.generateKey('test', undefined);
      expect(key).toBe('test');
    });

    it('should handle empty params object', () => {
      const key = ApiCache.generateKey('test', {});
      expect(key).toBe('test');
    });

    it('should handle null params', () => {
      const key = ApiCache.generateKey(
        'test',
        null as unknown as Record<string, unknown>
      );
      expect(key).toBe('test');
    });
  });
});
