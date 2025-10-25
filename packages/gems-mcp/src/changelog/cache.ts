/**
 * Caching mechanism for changelog content
 *
 * Uses a longer TTL than API cache since changelogs don't change frequently
 */

import type { CacheEntry } from "../types.js";

export interface ChangelogCacheEntry {
  content: string;
  source: string;
}

export class ChangelogCache {
  private cache = new Map<string, CacheEntry<ChangelogCacheEntry>>();
  private defaultTtl: number;

  constructor(defaultTtl: number = 24 * 60 * 60 * 1000) {
    // 24 hours default
    this.defaultTtl = defaultTtl;
  }

  get(key: string): ChangelogCacheEntry | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as ChangelogCacheEntry;
  }

  set(key: string, data: ChangelogCacheEntry, ttl?: number): void {
    const entry: CacheEntry<ChangelogCacheEntry> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
    };

    this.cache.set(key, entry);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  static generateKey(gemName: string, version?: string): string {
    return version ? `${gemName}@${version}` : gemName;
  }
}
