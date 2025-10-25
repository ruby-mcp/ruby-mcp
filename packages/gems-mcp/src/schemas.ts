/**
 * Zod validation schemas for MCP tool inputs and API responses
 */

import { z } from "zod";

// Input validation schemas for MCP tools
export const SearchGemsSchema = z.object({
  query: z.string().min(1, "Query cannot be empty").max(100, "Query too long"),
  limit: z.number().int().min(1).max(100).optional().default(10),
});

export const GemDetailsSchema = z.object({
  gem_name: z
    .string()
    .min(1, "Gem name cannot be empty")
    .max(50, "Gem name too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid gem name format"),
});

export const GemVersionsSchema = z.object({
  gem_name: z
    .string()
    .min(1, "Gem name cannot be empty")
    .max(50, "Gem name too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid gem name format"),
  include_prerelease: z.boolean().optional().default(false),
});

export const LatestVersionSchema = z.object({
  gem_name: z
    .string()
    .min(1, "Gem name cannot be empty")
    .max(50, "Gem name too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid gem name format"),
  include_prerelease: z.boolean().optional().default(false),
});

export const GemDependenciesSchema = z.object({
  gem_name: z
    .string()
    .min(1, "Gem name cannot be empty")
    .max(50, "Gem name too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid gem name format"),
});

export const ChangelogSchema = z.object({
  gem_name: z
    .string()
    .min(1, "Gem name cannot be empty")
    .max(50, "Gem name too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid gem name format"),
  version: z
    .string()
    .min(1, "Version cannot be empty")
    .max(50, "Version too long")
    .regex(
      /^[0-9]+(?:\.[0-9]+)*(?:\.(?:pre|rc|alpha|beta)\d*)?$/,
      "Invalid version format"
    )
    .optional(),
});

export const GemfileParserSchema = z.object({
  file_path: z
    .string()
    .min(1, "File path cannot be empty")
    .max(500, "File path too long"),
  project: z
    .string()
    .min(1, "Project name cannot be empty")
    .max(100, "Project name too long")
    .optional(),
});

export const GemPinSchema = z.object({
  gem_name: z
    .string()
    .min(1, "Gem name cannot be empty")
    .max(50, "Gem name too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid gem name format"),
  version: z
    .string()
    .min(1, "Version cannot be empty")
    .max(50, "Version too long")
    .regex(
      /^[0-9]+(?:\.[0-9]+)*(?:\.(?:pre|rc|alpha|beta)\d*)?$/,
      "Invalid version format"
    ),
  pin_type: z.enum(["~>", ">=", ">", "<", "<=", "="]).default("~>"),
  quote_style: z.enum(["single", "double"]).optional(),
  file_path: z
    .string()
    .min(1, "File path cannot be empty")
    .max(500, "File path too long")
    .default("Gemfile"),
  project: z
    .string()
    .min(1, "Project name cannot be empty")
    .max(100, "Project name too long")
    .optional(),
});

export const GemUnpinSchema = z.object({
  gem_name: z
    .string()
    .min(1, "Gem name cannot be empty")
    .max(50, "Gem name too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid gem name format"),
  quote_style: z.enum(["single", "double"]).optional(),
  file_path: z
    .string()
    .min(1, "File path cannot be empty")
    .max(500, "File path too long")
    .default("Gemfile"),
  project: z
    .string()
    .min(1, "Project name cannot be empty")
    .max(100, "Project name too long")
    .optional(),
});

export const GemAddToGemfileSchema = z.object({
  gem_name: z
    .string()
    .min(1, "Gem name cannot be empty")
    .max(50, "Gem name too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid gem name format"),
  version: z
    .string()
    .min(1, "Version cannot be empty")
    .max(50, "Version too long")
    .regex(
      /^[0-9]+(?:\.[0-9]+)*(?:\.(?:pre|rc|alpha|beta)\d*)?$/,
      "Invalid version format"
    )
    .optional(),
  pin_type: z.enum(["~>", ">=", ">", "<", "<=", "="]).default("~>"),
  group: z.array(z.string().min(1).max(50)).optional(),
  source: z
    .string()
    .min(1, "Source cannot be empty")
    .max(500, "Source too long")
    .optional(),
  require: z.union([z.literal(false), z.string().min(1).max(100)]).optional(),
  quote_style: z.enum(["single", "double"]).optional(),
  file_path: z
    .string()
    .min(1, "File path cannot be empty")
    .max(500, "File path too long")
    .default("Gemfile"),
  project: z
    .string()
    .min(1, "Project name cannot be empty")
    .max(100, "Project name too long")
    .optional(),
});

export const GemAddToGemspecSchema = z.object({
  gem_name: z
    .string()
    .min(1, "Gem name cannot be empty")
    .max(50, "Gem name too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid gem name format"),
  version: z
    .string()
    .min(1, "Version cannot be empty")
    .max(50, "Version too long")
    .regex(
      /^[0-9]+(?:\.[0-9]+)*(?:\.(?:pre|rc|alpha|beta)\d*)?$/,
      "Invalid version format"
    )
    .optional(),
  pin_type: z.enum(["~>", ">=", ">", "<", "<=", "="]).default("~>"),
  dependency_type: z.enum(["runtime", "development"]).default("runtime"),
  quote_style: z.enum(["single", "double"]).optional(),
  file_path: z
    .string()
    .min(1, "File path cannot be empty")
    .max(500, "File path too long"),
  project: z
    .string()
    .min(1, "Project name cannot be empty")
    .max(100, "Project name too long")
    .optional(),
});

export const BundleInstallSchema = z.object({
  project: z
    .string()
    .min(1, "Project name cannot be empty")
    .max(100, "Project name too long")
    .optional(),
  deployment: z.boolean().optional().default(false),
  without: z
    .array(z.string().min(1).max(50))
    .optional()
    .describe("Groups to exclude during installation"),
  gemfile: z
    .string()
    .min(1, "Gemfile path cannot be empty")
    .max(500, "Gemfile path too long")
    .optional(),
  clean: z.boolean().optional().default(false),
  frozen: z.boolean().optional().default(false),
  quiet: z.boolean().optional().default(false),
});

export const BundleCheckSchema = z.object({
  project: z
    .string()
    .min(1, "Project name cannot be empty")
    .max(100, "Project name too long")
    .optional(),
  gemfile: z
    .string()
    .min(1, "Gemfile path cannot be empty")
    .max(500, "Gemfile path too long")
    .optional(),
});

export const BundleShowSchema = z.object({
  gem_name: z
    .string()
    .min(1, "Gem name cannot be empty")
    .max(50, "Gem name too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid gem name format")
    .optional(),
  project: z
    .string()
    .min(1, "Project name cannot be empty")
    .max(100, "Project name too long")
    .optional(),
  paths: z.boolean().optional().default(false),
  outdated: z.boolean().optional().default(false),
});

export const BundleAuditSchema = z.object({
  project: z
    .string()
    .min(1, "Project name cannot be empty")
    .max(100, "Project name too long")
    .optional(),
  update: z.boolean().optional().default(false),
  verbose: z.boolean().optional().default(false),
  format: z.enum(["text", "json"]).optional().default("text"),
  gemfile_lock: z
    .string()
    .min(1, "Gemfile.lock path cannot be empty")
    .max(500, "Gemfile.lock path too long")
    .optional(),
});

export const BundleCleanSchema = z.object({
  project: z
    .string()
    .min(1, "Project name cannot be empty")
    .max(100, "Project name too long")
    .optional(),
  dry_run: z.boolean().optional().default(false),
  force: z.boolean().optional().default(false),
});

// Response validation schemas for API responses
export const GemDependencySchema = z.object({
  name: z.string(),
  requirements: z.string(),
});

export const GemVersionResponseSchema = z.object({
  authors: z.string().optional(),
  built_at: z.string(),
  created_at: z.string(),
  description: z.string().optional(),
  downloads_count: z.number(),
  metadata: z.record(z.string()),
  number: z.string(),
  summary: z.string().optional(),
  platform: z.string(),
  ruby_version: z.string().optional(),
  rubygems_version: z.string().optional(),
  prerelease: z.boolean(),
  licenses: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  sha: z.string().optional(),
});

export const GemDetailsResponseSchema = z.object({
  name: z.string(),
  downloads: z.number(),
  version: z.string(),
  version_created_at: z.string(),
  version_downloads: z.number(),
  platform: z.string(),
  authors: z.string().optional(),
  info: z.string().optional(),
  licenses: z.array(z.string()).optional(),
  metadata: z.record(z.string()),
  yanked: z.boolean(),
  sha: z.string().optional(),
  project_uri: z.string(),
  gem_uri: z.string(),
  homepage_uri: z.string().optional(),
  wiki_uri: z.string().optional(),
  documentation_uri: z.string().optional(),
  mailing_list_uri: z.string().optional(),
  source_code_uri: z.string().optional(),
  bug_tracker_uri: z.string().optional(),
  changelog_uri: z.string().optional(),
  funding_uri: z.string().optional(),
  dependencies: z.object({
    development: z.array(GemDependencySchema),
    runtime: z.array(GemDependencySchema),
  }),
});

export const GemSearchResultSchema = z.object({
  name: z.string(),
  downloads: z.number(),
  version: z.string(),
  version_created_at: z.string(),
  version_downloads: z.number(),
  platform: z.string(),
  authors: z.string().optional(),
  info: z.string().optional(),
  licenses: z.array(z.string()).optional(),
  metadata: z.record(z.string()),
  yanked: z.boolean(),
  sha: z.string().optional(),
  project_uri: z.string(),
  gem_uri: z.string(),
  homepage_uri: z.string().optional(),
  wiki_uri: z.string().optional(),
  documentation_uri: z.string().optional(),
  mailing_list_uri: z.string().optional(),
  source_code_uri: z.string().optional(),
  bug_tracker_uri: z.string().optional(),
  changelog_uri: z.string().optional(),
  funding_uri: z.string().optional(),
});

export const ReverseDependencySchema = z.object({
  name: z.string(),
});

// MCP tool input schemas for registration
export const searchGemsInputSchema = {
  type: "object" as const,
  properties: {
    query: {
      type: "string" as const,
      description: "Search query for gems (name or keywords)",
      minLength: 1,
      maxLength: 100,
    },
    limit: {
      type: "number" as const,
      description: "Maximum number of results to return (1-100)",
      minimum: 1,
      maximum: 100,
      default: 10,
    },
  },
  required: ["query" as const],
  additionalProperties: false,
};

export const gemDetailsInputSchema = {
  type: "object" as const,
  properties: {
    gem_name: {
      type: "string" as const,
      description: "Name of the gem to get details for",
      minLength: 1,
      maxLength: 50,
      pattern: "^[a-zA-Z0-9_-]+$",
    },
  },
  required: ["gem_name" as const],
  additionalProperties: false,
};

export const gemVersionsInputSchema = {
  type: "object" as const,
  properties: {
    gem_name: {
      type: "string" as const,
      description: "Name of the gem to get versions for",
      minLength: 1,
      maxLength: 50,
      pattern: "^[a-zA-Z0-9_-]+$",
    },
    include_prerelease: {
      type: "boolean" as const,
      description: "Include prerelease versions in results",
      default: false,
    },
  },
  required: ["gem_name" as const],
  additionalProperties: false,
};

export const latestVersionInputSchema = {
  type: "object" as const,
  properties: {
    gem_name: {
      type: "string" as const,
      description: "Name of the gem to get latest version for",
      minLength: 1,
      maxLength: 50,
      pattern: "^[a-zA-Z0-9_-]+$",
    },
    include_prerelease: {
      type: "boolean" as const,
      description: "Include prerelease versions when determining latest",
      default: false,
    },
  },
  required: ["gem_name" as const],
  additionalProperties: false,
};

export const gemDependenciesInputSchema = {
  type: "object" as const,
  properties: {
    gem_name: {
      type: "string" as const,
      description: "Name of the gem to get reverse dependencies for",
      minLength: 1,
      maxLength: 50,
      pattern: "^[a-zA-Z0-9_-]+$",
    },
  },
  required: ["gem_name" as const],
  additionalProperties: false,
};

export const changelogInputSchema = {
  type: "object" as const,
  properties: {
    gem_name: {
      type: "string" as const,
      description: "Name of the gem to fetch changelog for",
      minLength: 1,
      maxLength: 50,
      pattern: "^[a-zA-Z0-9_-]+$",
    },
    version: {
      type: "string" as const,
      description: "Specific version to fetch changelog for (optional)",
      minLength: 1,
      maxLength: 50,
      pattern: "^[0-9]+(?:\\.[0-9]+)*(?:\\.(?:pre|rc|alpha|beta)\\d*)?$",
    },
  },
  required: ["gem_name" as const],
  additionalProperties: false,
};

export const gemfileParserInputSchema = {
  type: "object" as const,
  properties: {
    file_path: {
      type: "string" as const,
      description: "Path to the Gemfile or .gemspec file to parse",
      minLength: 1,
      maxLength: 500,
    },
    project: {
      type: "string" as const,
      description: "Optional project name to resolve file path within",
      minLength: 1,
      maxLength: 100,
    },
  },
  required: ["file_path" as const],
  additionalProperties: false,
};

export const gemPinInputSchema = {
  type: "object" as const,
  properties: {
    gem_name: {
      type: "string" as const,
      description: "Name of the gem to pin",
      minLength: 1,
      maxLength: 50,
      pattern: "^[a-zA-Z0-9_-]+$",
    },
    version: {
      type: "string" as const,
      description: "Version to pin the gem to",
      minLength: 1,
      maxLength: 50,
      pattern: "^[0-9]+(?:\\.[0-9]+)*(?:\\.(?:pre|rc|alpha|beta)\\d*)?$",
    },
    pin_type: {
      type: "string" as const,
      description: "Type of version pinning (~>, >=, >, <, <=, =)",
      enum: ["~>", ">=", ">", "<", "<=", "="],
      default: "~>",
    },
    quote_style: {
      type: "string" as const,
      description: "Quote style to use for gem declaration (single or double)",
      enum: ["single", "double"],
    },
    file_path: {
      type: "string" as const,
      description: "Path to the Gemfile to modify",
      minLength: 1,
      maxLength: 500,
      default: "Gemfile",
    },
    project: {
      type: "string" as const,
      description: "Optional project name to resolve file path within",
      minLength: 1,
      maxLength: 100,
    },
  },
  required: ["gem_name" as const, "version" as const],
  additionalProperties: false,
};

export const gemUnpinInputSchema = {
  type: "object" as const,
  properties: {
    gem_name: {
      type: "string" as const,
      description: "Name of the gem to unpin (remove version constraints)",
      minLength: 1,
      maxLength: 50,
      pattern: "^[a-zA-Z0-9_-]+$",
    },
    quote_style: {
      type: "string" as const,
      description: "Quote style to use for gem declaration (single or double)",
      enum: ["single", "double"],
    },
    file_path: {
      type: "string" as const,
      description: "Path to the Gemfile to modify",
      minLength: 1,
      maxLength: 500,
      default: "Gemfile",
    },
    project: {
      type: "string" as const,
      description: "Optional project name to resolve file path within",
      minLength: 1,
      maxLength: 100,
    },
  },
  required: ["gem_name" as const],
  additionalProperties: false,
};

export const gemAddToGemfileInputSchema = {
  type: "object" as const,
  properties: {
    gem_name: {
      type: "string" as const,
      description: "Name of the gem to add",
      minLength: 1,
      maxLength: 50,
      pattern: "^[a-zA-Z0-9_-]+$",
    },
    version: {
      type: "string" as const,
      description: "Version to constrain the gem to",
      minLength: 1,
      maxLength: 50,
      pattern: "^[0-9]+(?:\\.[0-9]+)*(?:\\.(?:pre|rc|alpha|beta)\\d*)?$",
    },
    pin_type: {
      type: "string" as const,
      description: "Type of version constraint (~>, >=, >, <, <=, =)",
      enum: ["~>", ">=", ">", "<", "<=", "="],
      default: "~>",
    },
    group: {
      type: "array" as const,
      description: "Groups to add the gem to (e.g., development, test)",
      items: {
        type: "string" as const,
        minLength: 1,
        maxLength: 50,
      },
    },
    source: {
      type: "string" as const,
      description:
        "Alternative source for the gem (git URL, path, or custom source)",
      minLength: 1,
      maxLength: 500,
    },
    require: {
      oneOf: [
        {
          type: "boolean" as const,
          description: "Set to false to not require the gem on load",
        },
        {
          type: "string" as const,
          description: "Custom require path for the gem",
          minLength: 1,
          maxLength: 100,
        },
      ],
      description: "Require option for the gem (false or custom path)",
    },
    quote_style: {
      type: "string" as const,
      description: "Quote style to use for gem declaration (single or double)",
      enum: ["single", "double"],
    },
    file_path: {
      type: "string" as const,
      description: "Path to the Gemfile to modify",
      minLength: 1,
      maxLength: 500,
      default: "Gemfile",
    },
    project: {
      type: "string" as const,
      description: "Optional project name to resolve file path within",
      minLength: 1,
      maxLength: 100,
    },
  },
  required: ["gem_name" as const],
  additionalProperties: false,
};

export const gemAddToGemspecInputSchema = {
  type: "object" as const,
  properties: {
    gem_name: {
      type: "string" as const,
      description: "Name of the gem to add as dependency",
      minLength: 1,
      maxLength: 50,
      pattern: "^[a-zA-Z0-9_-]+$",
    },
    version: {
      type: "string" as const,
      description: "Version constraint for the dependency",
      minLength: 1,
      maxLength: 50,
      pattern: "^[0-9]+(?:\\.[0-9]+)*(?:\\.(?:pre|rc|alpha|beta)\\d*)?$",
    },
    pin_type: {
      type: "string" as const,
      description: "Type of version constraint (~>, >=, >, <, <=, =)",
      enum: ["~>", ">=", ">", "<", "<=", "="],
      default: "~>",
    },
    dependency_type: {
      type: "string" as const,
      description: "Type of dependency (runtime or development)",
      enum: ["runtime", "development"],
      default: "runtime",
    },
    quote_style: {
      type: "string" as const,
      description:
        "Quote style to use for dependency declaration (single or double)",
      enum: ["single", "double"],
    },
    file_path: {
      type: "string" as const,
      description: "Path to the .gemspec file to modify",
      minLength: 1,
      maxLength: 500,
    },
    project: {
      type: "string" as const,
      description: "Optional project name to resolve file path within",
      minLength: 1,
      maxLength: 100,
    },
  },
  required: ["gem_name" as const, "file_path" as const],
  additionalProperties: false,
};

export const bundleInstallInputSchema = {
  type: "object" as const,
  properties: {
    project: {
      type: "string" as const,
      description: "Optional project name to run bundle install within",
      minLength: 1,
      maxLength: 100,
    },
    deployment: {
      type: "boolean" as const,
      description: "Install gems in deployment mode (production install)",
      default: false,
    },
    without: {
      type: "array" as const,
      description:
        "Groups to exclude during installation (e.g., development, test)",
      items: {
        type: "string" as const,
        minLength: 1,
        maxLength: 50,
      },
    },
    gemfile: {
      type: "string" as const,
      description: "Path to specific Gemfile to use (relative to project)",
      minLength: 1,
      maxLength: 500,
    },
    clean: {
      type: "boolean" as const,
      description: "Clean up old gems after installation",
      default: false,
    },
    frozen: {
      type: "boolean" as const,
      description: "Do not allow Gemfile.lock to be updated",
      default: false,
    },
    quiet: {
      type: "boolean" as const,
      description: "Suppress output during installation",
      default: false,
    },
  },
  required: [] as const,
  additionalProperties: false,
};

export const bundleCheckInputSchema = {
  type: "object" as const,
  properties: {
    project: {
      type: "string" as const,
      description: "Optional project name to run bundle check within",
      minLength: 1,
      maxLength: 100,
    },
    gemfile: {
      type: "string" as const,
      description: "Path to specific Gemfile to use (relative to project)",
      minLength: 1,
      maxLength: 500,
    },
  },
  required: [] as const,
  additionalProperties: false,
};

export const bundleShowInputSchema = {
  type: "object" as const,
  properties: {
    gem_name: {
      type: "string" as const,
      description: "Name of gem to show (omit to show all gems)",
      minLength: 1,
      maxLength: 50,
      pattern: "^[a-zA-Z0-9_-]+$",
    },
    project: {
      type: "string" as const,
      description: "Optional project name to run bundle show within",
      minLength: 1,
      maxLength: 100,
    },
    paths: {
      type: "boolean" as const,
      description: "Show gem installation paths",
      default: false,
    },
    outdated: {
      type: "boolean" as const,
      description: "Show outdated gems only",
      default: false,
    },
  },
  required: [] as const,
  additionalProperties: false,
};

export const bundleAuditInputSchema = {
  type: "object" as const,
  properties: {
    project: {
      type: "string" as const,
      description: "Optional project name to run bundle audit within",
      minLength: 1,
      maxLength: 100,
    },
    update: {
      type: "boolean" as const,
      description: "Update vulnerability database before auditing",
      default: false,
    },
    verbose: {
      type: "boolean" as const,
      description: "Show verbose output",
      default: false,
    },
    format: {
      type: "string" as const,
      description: "Output format for audit results",
      enum: ["text", "json"],
      default: "text",
    },
    gemfile_lock: {
      type: "string" as const,
      description:
        "Path to specific Gemfile.lock to audit (relative to project)",
      minLength: 1,
      maxLength: 500,
    },
  },
  required: [] as const,
  additionalProperties: false,
};

export const bundleCleanInputSchema = {
  type: "object" as const,
  properties: {
    project: {
      type: "string" as const,
      description: "Optional project name to run bundle clean within",
      minLength: 1,
      maxLength: 100,
    },
    dry_run: {
      type: "boolean" as const,
      description: "Show what would be cleaned without actually cleaning",
      default: false,
    },
    force: {
      type: "boolean" as const,
      description: "Force clean even if bundle is not frozen",
      default: false,
    },
  },
  required: [] as const,
  additionalProperties: false,
};

// Type exports for use in other files
export type SearchGemsInput = z.infer<typeof SearchGemsSchema>;
export type GemDetailsInput = z.infer<typeof GemDetailsSchema>;
export type GemVersionsInput = z.infer<typeof GemVersionsSchema>;
export type LatestVersionInput = z.infer<typeof LatestVersionSchema>;
export type GemDependenciesInput = z.infer<typeof GemDependenciesSchema>;
export type ChangelogInput = z.infer<typeof ChangelogSchema>;
export type GemfileParserInput = z.infer<typeof GemfileParserSchema>;
export type GemPinInput = z.infer<typeof GemPinSchema>;
export type GemUnpinInput = z.infer<typeof GemUnpinSchema>;
export type GemAddToGemfileInput = z.infer<typeof GemAddToGemfileSchema>;
export type GemAddToGemspecInput = z.infer<typeof GemAddToGemspecSchema>;
export type BundleInstallInput = z.infer<typeof BundleInstallSchema>;
export type BundleCheckInput = z.infer<typeof BundleCheckSchema>;
export type BundleShowInput = z.infer<typeof BundleShowSchema>;
export type BundleAuditInput = z.infer<typeof BundleAuditSchema>;
export type BundleCleanInput = z.infer<typeof BundleCleanSchema>;
