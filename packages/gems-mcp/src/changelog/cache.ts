/**
 * Specialized cache for changelog content with longer TTL
 */

import { ApiCache } from '../api/cache.js';

export class ChangelogCache extends ApiCache {
  constructor(defaultTtl: number = 24 * 60 * 60 * 1000) {
    // 24 hours default TTL for changelogs
    super(defaultTtl);
  }

  /**
   * Generate a cache key for changelog content
   */
  static generateChangelogKey(
    gemName: string,
    version?: string,
    format?: string
  ): string {
    const parts = ['changelog', gemName];

    if (version) {
      parts.push(version);
    }

    if (format) {
      parts.push(format);
    }

    return parts.join(':');
  }

  /**
   * Get changelog from cache
   */
  getChangelog(gemName: string, version?: string, format?: string): string | null {
    const key = ChangelogCache.generateChangelogKey(gemName, version, format);
    return this.get<string>(key);
  }

  /**
   * Set changelog in cache
   */
  setChangelog(
    gemName: string,
    content: string,
    version?: string,
    format?: string,
    ttl?: number
  ): void {
    const key = ChangelogCache.generateChangelogKey(gemName, version, format);
    this.set(key, content, ttl);
  }

  /**
   * Check if changelog exists in cache
   */
  hasChangelog(gemName: string, version?: string, format?: string): boolean {
    const key = ChangelogCache.generateChangelogKey(gemName, version, format);
    return this.has(key);
  }

  /**
   * Delete changelog from cache
   */
  deleteChangelog(gemName: string, version?: string, format?: string): boolean {
    const key = ChangelogCache.generateChangelogKey(gemName, version, format);
    return this.delete(key);
  }
}