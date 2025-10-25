import { beforeEach, describe, expect, it } from "vitest";
import { ChangelogCache } from "../../src/changelog/cache.js";

describe("ChangelogCache", () => {
  let cache: ChangelogCache;

  beforeEach(() => {
    cache = new ChangelogCache(60000); // 1 minute TTL
  });

  describe("get and set", () => {
    it("should store and retrieve changelog entries", () => {
      const entry = {
        content: "# Changelog\n\n## v1.0.0\n- Initial release",
        source: "https://github.com/owner/repo/CHANGELOG.md",
      };

      cache.set("test-gem", entry);
      const retrieved = cache.get("test-gem");

      expect(retrieved).toEqual(entry);
    });

    it("should return null for non-existent keys", () => {
      expect(cache.get("nonexistent")).toBeNull();
    });

    it("should return null for expired entries", () => {
      const shortTtlCache = new ChangelogCache(1); // 1ms TTL

      cache.set("expired-gem", {
        content: "test content",
        source: "test source",
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(shortTtlCache.get("expired-gem")).toBeNull();
          resolve();
        }, 10);
      });
    });

    it("should use custom TTL when provided", () => {
      cache.set(
        "custom-ttl-gem",
        {
          content: "test content",
          source: "test source",
        },
        2000
      );

      expect(cache.has("custom-ttl-gem")).toBe(true);
      expect(cache.get("custom-ttl-gem")).toBeTruthy();
    });
  });

  describe("has method", () => {
    it("should return false for non-existent keys", () => {
      expect(cache.has("nonexistent")).toBe(false);
    });

    it("should return true for existing keys", () => {
      cache.set("test-gem", {
        content: "test content",
        source: "test source",
      });
      expect(cache.has("test-gem")).toBe(true);
    });

    it("should return false for expired keys", () => {
      const shortTtlCache = new ChangelogCache(1);
      shortTtlCache.set("expired-gem", {
        content: "test content",
        source: "test source",
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(shortTtlCache.has("expired-gem")).toBe(false);
          resolve();
        }, 10);
      });
    });
  });

  describe("delete method", () => {
    it("should return false when deleting non-existent keys", () => {
      expect(cache.delete("nonexistent")).toBe(false);
    });

    it("should return true when deleting existing keys", () => {
      cache.set("test-gem", {
        content: "test content",
        source: "test source",
      });
      expect(cache.delete("test-gem")).toBe(true);
      expect(cache.has("test-gem")).toBe(false);
    });
  });

  describe("clear method", () => {
    it("should remove all entries", () => {
      cache.set("gem1", { content: "content1", source: "source1" });
      cache.set("gem2", { content: "content2", source: "source2" });

      expect(cache.getStats().size).toBe(2);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
      expect(cache.has("gem1")).toBe(false);
      expect(cache.has("gem2")).toBe(false);
    });
  });

  describe("cleanup method", () => {
    it("should remove expired entries and return count", () => {
      const shortTtlCache = new ChangelogCache(1);

      shortTtlCache.set("gem1", { content: "content1", source: "source1" });
      shortTtlCache.set("gem2", { content: "content2", source: "source2" });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const removedCount = shortTtlCache.cleanup();
          expect(removedCount).toBe(2);
          expect(shortTtlCache.getStats().size).toBe(0);
          resolve();
        }, 10);
      });
    });

    it("should not remove non-expired entries", () => {
      cache.set("gem1", { content: "content1", source: "source1" });
      cache.set("gem2", { content: "content2", source: "source2" });

      const removedCount = cache.cleanup();
      expect(removedCount).toBe(0);
      expect(cache.getStats().size).toBe(2);
    });
  });

  describe("getStats method", () => {
    it("should return cache statistics", () => {
      cache.set("gem1", { content: "content1", source: "source1" });
      cache.set("gem2", { content: "content2", source: "source2" });

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain("gem1");
      expect(stats.keys).toContain("gem2");
    });

    it("should return empty stats for empty cache", () => {
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });

  describe("generateKey static method", () => {
    it("should generate key from gem name only", () => {
      const key = ChangelogCache.generateKey("test-gem");
      expect(key).toBe("test-gem");
    });

    it("should generate key from gem name and version", () => {
      const key = ChangelogCache.generateKey("test-gem", "1.2.3");
      expect(key).toBe("test-gem@1.2.3");
    });

    it("should handle gem names with special characters", () => {
      const key = ChangelogCache.generateKey("test_gem-123", "2.0.0");
      expect(key).toBe("test_gem-123@2.0.0");
    });
  });
});
