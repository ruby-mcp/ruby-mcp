import { beforeEach, describe, expect, it } from "vitest";
import { ApiCache } from "../../src/api/cache.js";

describe("ApiCache additional coverage", () => {
  let cache: ApiCache;

  beforeEach(() => {
    cache = new ApiCache(60000); // 1 minute TTL
  });

  describe("has method", () => {
    it("should return false for non-existent keys", () => {
      expect(cache.has("nonexistent")).toBe(false);
    });

    it("should return true for existing keys", () => {
      cache.set("test-key", "test-value");
      expect(cache.has("test-key")).toBe(true);
    });
  });

  describe("delete method", () => {
    it("should return false when deleting non-existent keys", () => {
      expect(cache.delete("nonexistent")).toBe(false);
    });

    it("should return true when deleting existing keys", () => {
      cache.set("test-key", "test-value");
      expect(cache.delete("test-key")).toBe(true);
      expect(cache.has("test-key")).toBe(false);
    });
  });

  describe("generateKey static method", () => {
    it("should handle undefined params", () => {
      const key = ApiCache.generateKey("test", undefined);
      expect(key).toBe("test");
    });

    it("should handle empty params object", () => {
      const key = ApiCache.generateKey("test", {});
      expect(key).toBe("test");
    });

    it("should handle null params", () => {
      const key = ApiCache.generateKey(
        "test",
        null as unknown as Record<string, unknown>
      );
      expect(key).toBe("test");
    });
  });

  describe("cleanup functionality", () => {
    it("should remove expired entries and return count", () => {
      // Set a very short TTL (1ms)
      const shortTtlCache = new ApiCache(1);

      // Add some items
      shortTtlCache.set("item1", "value1");
      shortTtlCache.set("item2", "value2");

      // Wait for expiration (use a longer wait to ensure expiration)
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const removedCount = shortTtlCache.cleanup();
          expect(removedCount).toBe(2);
          expect(shortTtlCache.getStats().size).toBe(0);
          resolve();
        }, 10); // 10ms wait to ensure 1ms TTL expires
      });
    });

    it("should use custom TTL when provided", () => {
      // Test custom TTL branch
      cache.set("custom-ttl-key", "value", 2000); // 2 second custom TTL

      expect(cache.has("custom-ttl-key")).toBe(true);
      expect(cache.get("custom-ttl-key")).toBe("value");
    });
  });
});
