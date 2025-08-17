/**
 * TypeScript type definitions for RubyGems.org API responses
 */

export interface GemVersion {
  authors?: string;
  built_at: string;
  created_at: string;
  description?: string;
  downloads_count: number;
  metadata: Record<string, string>;
  number: string;
  summary?: string;
  platform: string;
  ruby_version?: string;
  rubygems_version?: string;
  prerelease: boolean;
  licenses?: string[];
  requirements?: string[];
  sha?: string;
}

export interface GemDetails {
  name: string;
  downloads: number;
  version: string;
  version_created_at: string;
  version_downloads: number;
  platform: string;
  authors?: string;
  info?: string;
  licenses?: string[];
  metadata: Record<string, string>;
  yanked: boolean;
  sha?: string;
  project_uri: string;
  gem_uri: string;
  homepage_uri?: string;
  wiki_uri?: string;
  documentation_uri?: string;
  mailing_list_uri?: string;
  source_code_uri?: string;
  bug_tracker_uri?: string;
  changelog_uri?: string;
  funding_uri?: string;
  dependencies: {
    development: GemDependency[];
    runtime: GemDependency[];
  };
}

export interface GemDependency {
  name: string;
  requirements: string;
}

export interface GemSearchResult {
  name: string;
  downloads: number;
  version: string;
  version_created_at: string;
  version_downloads: number;
  platform: string;
  authors?: string;
  info?: string;
  licenses?: string[];
  metadata: Record<string, string>;
  yanked: boolean;
  sha?: string;
  project_uri: string;
  gem_uri: string;
  homepage_uri?: string;
  wiki_uri?: string;
  documentation_uri?: string;
  mailing_list_uri?: string;
  source_code_uri?: string;
  bug_tracker_uri?: string;
  changelog_uri?: string;
  funding_uri?: string;
}

export interface ReverseDependency {
  name: string;
}

export interface DownloadStats {
  total: number;
  daily: number;
  monthly: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface GemsSearchOptions {
  query: string;
  limit?: number;
  page?: number;
}

export interface GemsVersionOptions {
  gem_name: string;
  include_prerelease?: boolean;
}

export interface GemsDetailsOptions {
  gem_name: string;
}

export interface GemsLatestVersionOptions {
  gem_name: string;
  include_prerelease?: boolean;
}

export interface GemsDependenciesOptions {
  gem_name: string;
}
