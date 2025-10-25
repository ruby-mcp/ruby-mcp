/**
 * Mock response data for RubyGems.org API
 */

import type {
  GemDetails,
  GemSearchResult,
  GemVersion,
} from "../../src/types.js";

export const mockSearchResults: GemSearchResult[] = [
  {
    name: "rails",
    downloads: 652484010,
    version: "8.0.2.1",
    version_created_at: "2024-12-26T18:52:12.345Z",
    version_downloads: 2345678,
    platform: "ruby",
    authors: "David Heinemeier Hansson",
    info: "Ruby on Rails is a full-stack web framework.",
    licenses: ["MIT"],
    metadata: {},
    yanked: false,
    sha: "abc123def456",
    project_uri: "https://rubygems.org/gems/rails",
    gem_uri: "https://rubygems.org/downloads/rails-8.0.2.1.gem",
    homepage_uri: "https://rubyonrails.org",
  },
];

export const mockGemDetails: GemDetails = {
  name: "rails",
  downloads: 652484010,
  version: "8.0.2.1",
  version_created_at: "2024-12-26T18:52:12.345Z",
  version_downloads: 2345678,
  platform: "ruby",
  authors: "David Heinemeier Hansson",
  info: "Ruby on Rails is a full-stack web framework.",
  licenses: ["MIT"],
  metadata: {},
  yanked: false,
  sha: "abc123def456789",
  project_uri: "https://rubygems.org/gems/rails",
  gem_uri: "https://rubygems.org/downloads/rails-8.0.2.1.gem",
  homepage_uri: "https://rubyonrails.org",
  dependencies: {
    development: [],
    runtime: [{ name: "activesupport", requirements: "= 8.0.2.1" }],
  },
};

export const mockGemVersions: GemVersion[] = [
  {
    authors: "David Heinemeier Hansson",
    built_at: "2024-12-26T18:52:12.345Z",
    created_at: "2024-12-26T18:52:12.345Z",
    downloads_count: 2345678,
    metadata: {},
    number: "8.0.2.1",
    platform: "ruby",
    prerelease: false,
  },
];

export const mockLatestVersion: GemVersion = {
  authors: "David Heinemeier Hansson",
  built_at: "2024-12-26T18:52:12.345Z",
  created_at: "2024-12-26T18:52:12.345Z",
  downloads_count: 2345678,
  metadata: {},
  number: "8.0.2.1",
  platform: "ruby",
  prerelease: false,
};

export const mockReverseDependencies: string[] = [
  "activeadmin",
  "devise",
  "kaminari",
];
