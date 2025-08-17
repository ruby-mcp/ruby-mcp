/**
 * RubyGems.org API client with caching and error handling
 */

// Using native fetch for better MSW compatibility
import type {
  GemDetails,
  GemVersion,
  GemSearchResult,
  ReverseDependency,
  ApiResponse,
} from '../types.js';
import { ApiCache } from './cache.js';

export interface RubyGemsClientOptions {
  baseUrl?: string;
  timeout?: number;
  userAgent?: string;
  cacheEnabled?: boolean;
  cacheTtl?: number;
  rateLimitDelay?: number;
}

export class RubyGemsClient {
  private baseUrl: string;
  private timeout: number;
  private userAgent: string;
  private cache: ApiCache;
  private cacheEnabled: boolean;
  private rateLimitDelay: number;
  private lastRequestTime = 0;

  constructor(options: RubyGemsClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'https://rubygems.org';
    this.timeout = options.timeout ?? 10000;
    this.userAgent = options.userAgent ?? '@ruby-mcp/gems-mcp/0.1.0';
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.rateLimitDelay = options.rateLimitDelay ?? 100;
    this.cache = new ApiCache(options.cacheTtl);
  }

  async searchGems(
    query: string,
    limit: number = 10
  ): Promise<ApiResponse<GemSearchResult[]>> {
    const cacheKey = ApiCache.generateKey('search', { query, limit });

    if (this.cacheEnabled) {
      const cached = this.cache.get<GemSearchResult[]>(cacheKey);
      if (cached) {
        return { data: cached, success: true };
      }
    }

    try {
      const url = `${this.baseUrl}/api/v1/search.json?query=${encodeURIComponent(query)}`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        return response as ApiResponse<GemSearchResult[]>;
      }

      let gems = response.data as GemSearchResult[];

      if (limit > 0 && gems.length > limit) {
        gems = gems.slice(0, limit);
      }

      if (this.cacheEnabled) {
        this.cache.set(cacheKey, gems);
      }

      return { data: gems, success: true };
    } catch (error) {
      return {
        data: [],
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async getGemDetails(gemName: string): Promise<ApiResponse<GemDetails>> {
    const cacheKey = ApiCache.generateKey('gem', { name: gemName });

    if (this.cacheEnabled) {
      const cached = this.cache.get<GemDetails>(cacheKey);
      if (cached) {
        return { data: cached, success: true };
      }
    }

    try {
      const url = `${this.baseUrl}/api/v1/gems/${encodeURIComponent(gemName)}.json`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        return response as ApiResponse<GemDetails>;
      }

      const gemData = response.data as GemDetails;

      if (this.cacheEnabled) {
        this.cache.set(cacheKey, gemData);
      }

      return { data: gemData, success: true };
    } catch (error) {
      return {
        data: {} as GemDetails,
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async getGemVersions(gemName: string): Promise<ApiResponse<GemVersion[]>> {
    const cacheKey = ApiCache.generateKey('versions', { name: gemName });

    if (this.cacheEnabled) {
      const cached = this.cache.get<GemVersion[]>(cacheKey);
      if (cached) {
        return { data: cached, success: true };
      }
    }

    try {
      const url = `${this.baseUrl}/api/v1/versions/${encodeURIComponent(gemName)}.json`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        return response as ApiResponse<GemVersion[]>;
      }

      const versions = response.data as GemVersion[];

      if (this.cacheEnabled) {
        this.cache.set(cacheKey, versions);
      }

      return { data: versions, success: true };
    } catch (error) {
      return {
        data: [],
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async getLatestVersion(gemName: string): Promise<ApiResponse<GemVersion>> {
    const cacheKey = ApiCache.generateKey('latest', { name: gemName });

    if (this.cacheEnabled) {
      const cached = this.cache.get<GemVersion>(cacheKey);
      if (cached) {
        return { data: cached, success: true };
      }
    }

    try {
      // Use the versions endpoint instead of latest.json to get full version details
      const versionsResponse = await this.getGemVersions(gemName);
      
      if (!versionsResponse.success) {
        return {
          data: {} as GemVersion,
          success: false,
          error: versionsResponse.error,
        };
      }

      const versions = versionsResponse.data;
      if (versions.length === 0) {
        return {
          data: {} as GemVersion,
          success: false,
          error: `No versions found for gem: ${gemName}`,
        };
      }

      // Sort by creation date and get the latest version
      const sortedVersions = versions.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      const latestVersion = sortedVersions[0];

      if (this.cacheEnabled) {
        this.cache.set(cacheKey, latestVersion);
      }

      return { data: latestVersion, success: true };
    } catch (error) {
      return {
        data: {} as GemVersion,
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async getReverseDependencies(
    gemName: string
  ): Promise<ApiResponse<ReverseDependency[]>> {
    const cacheKey = ApiCache.generateKey('reverse_deps', { name: gemName });

    if (this.cacheEnabled) {
      const cached = this.cache.get<ReverseDependency[]>(cacheKey);
      if (cached) {
        return { data: cached, success: true };
      }
    }

    try {
      const url = `${this.baseUrl}/api/v1/gems/${encodeURIComponent(gemName)}/reverse_dependencies.json`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        return response as ApiResponse<ReverseDependency[]>;
      }

      const dependencies = (response.data as string[]).map((name) => ({
        name,
      }));

      if (this.cacheEnabled) {
        this.cache.set(cacheKey, dependencies);
      }

      return { data: dependencies, success: true };
    } catch (error) {
      return {
        data: [],
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private async makeRequest(url: string): Promise<ApiResponse<any>> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        return {
          data: null,
          success: false,
          error: 'Resource not found',
        };
      }

      if (response.status === 429) {
        return {
          data: null,
          success: false,
          error: 'Rate limit exceeded',
        };
      }

      if (response.status >= 400) {
        return {
          data: null,
          success: false,
          error: `HTTP ${response.status}`,
        };
      }

      const body = await response.json();

      return {
        data: body,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        error:
          error instanceof Error ? error.message : 'Network request failed',
      };
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return this.cache.getStats();
  }

  cleanupCache(): number {
    return this.cache.cleanup();
  }
}
