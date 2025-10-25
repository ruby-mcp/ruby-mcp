/**
 * Response caching mechanism for RubyGems API calls
 */

import type { CacheEntry } from "../types.js";

export class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTtl: number;

  constructor(defaultTtl: number = 5 * 60 * 1000) {
    // 5 minutes default
    this.defaultTtl = defaultTtl;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
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

  static generateKey(
    endpoint: string,
    params?: Record<string, unknown>
  ): string {
    const baseKey = endpoint.toLowerCase();

    if (!params || Object.keys(params).length === 0) {
      return baseKey;
    }

    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${encodeURIComponent(String(params[key]))}`)
      .join("&");

    return `${baseKey}?${sortedParams}`;
  }
}
