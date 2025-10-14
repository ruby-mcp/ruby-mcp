#!/usr/bin/env node

/**
 * Gems MCP Server - A Model Context Protocol server for RubyGems.org API
 *
 * This server provides tools for searching gems, getting version information,
 * and accessing detailed gem metadata from RubyGems.org.
 */

import { Command } from 'commander';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { RubyGemsClient } from './api/client.js';
import { SearchTool } from './tools/search.js';
import { DetailsTool } from './tools/details.js';
import { VersionsTool } from './tools/versions.js';
import { ChangelogTool } from './tools/changelog.js';
import { GemfileParserTool } from './tools/gemfile-parser.js';
import { GemPinTool } from './tools/pin.js';
import { GemAddTool } from './tools/add.js';
import { BundleInstallTool } from './tools/bundle-install.js';
import { BundleToolsManager } from './tools/bundle-tools.js';
import { ProjectManager, type ProjectConfig } from './project-manager.js';
import {
  type QuoteConfig,
  DEFAULT_QUOTE_CONFIG,
  parseQuoteStyle,
} from './utils/quotes.js';
import {
  SearchGemsSchema,
  GemDetailsSchema,
  GemVersionsSchema,
  LatestVersionSchema,
  GemDependenciesSchema,
  GemChangelogSchema,
  GemfileParserSchema,
  GemPinSchema,
  GemUnpinSchema,
  GemAddToGemfileSchema,
  GemAddToGemspecSchema,
  BundleInstallSchema,
  BundleCheckSchema,
  BundleShowSchema,
  BundleAuditSchema,
  BundleCleanSchema,
} from './schemas.js';

export class GemsServer {
  private server: McpServer;
  private client: RubyGemsClient;
  private projectManager: ProjectManager;
  private quoteConfig: QuoteConfig;
  private searchTool: SearchTool;
  private detailsTool: DetailsTool;
  private versionsTool: VersionsTool;
  private changelogTool: ChangelogTool;
  private gemfileParserTool: GemfileParserTool;
  private gemPinTool: GemPinTool;
  private gemAddTool: GemAddTool;
  private bundleInstallTool: BundleInstallTool;
  private bundleToolsManager: BundleToolsManager;

  constructor(projectManager?: ProjectManager, quoteConfig?: QuoteConfig) {
    // Initialize server
    this.server = new McpServer({
      name: '@ruby-mcp/gems-mcp',
      version: '0.1.0',
    });

    // Initialize project manager and quote config
    this.projectManager = projectManager || new ProjectManager();
    this.quoteConfig = quoteConfig || DEFAULT_QUOTE_CONFIG;

    // Initialize API client
    this.client = new RubyGemsClient({
      userAgent: '@ruby-mcp/gems-mcp/0.1.0',
      cacheEnabled: true,
      cacheTtl: 5 * 60 * 1000, // 5 minutes
      rateLimitDelay: 100, // 100ms between requests
    });

    // Initialize tools
    this.searchTool = new SearchTool({ client: this.client });
    this.detailsTool = new DetailsTool({ client: this.client });
    this.versionsTool = new VersionsTool({ client: this.client });
    this.changelogTool = new ChangelogTool({ client: this.client });
    this.gemfileParserTool = new GemfileParserTool({
      projectManager: this.projectManager,
    });
    this.gemPinTool = new GemPinTool({
      projectManager: this.projectManager,
      quoteConfig: this.quoteConfig,
    });
    this.gemAddTool = new GemAddTool({
      projectManager: this.projectManager,
      quoteConfig: this.quoteConfig,
    });
    this.bundleInstallTool = new BundleInstallTool({
      projectManager: this.projectManager,
    });
    this.bundleToolsManager = new BundleToolsManager({
      projectManager: this.projectManager,
    });

    this.setupTools();
    this.setupErrorHandling();
  }

  private setupTools(): void {
    // Register search_gems tool
    this.server.registerTool(
      'search_gems',
      {
        description: 'Search for gems on RubyGems.org by name or keywords',
        inputSchema: SearchGemsSchema.shape,
      },
      async (args) => this.searchTool.execute(args)
    );

    // Register get_gem_details tool
    this.server.registerTool(
      'get_gem_details',
      {
        description:
          'Get detailed information about a specific gem including dependencies, metadata, and links',
        inputSchema: GemDetailsSchema.shape,
      },
      async (args) => this.detailsTool.execute(args)
    );

    // Register get_gem_versions tool
    this.server.registerTool(
      'get_gem_versions',
      {
        description:
          'Get all versions of a specific gem, with optional prerelease filtering',
        inputSchema: GemVersionsSchema.shape,
      },
      async (args) => this.versionsTool.executeGetVersions(args)
    );

    // Register get_latest_version tool
    this.server.registerTool(
      'get_latest_version',
      {
        description:
          'Get the latest version of a specific gem, with option to include or exclude prerelease versions',
        inputSchema: LatestVersionSchema.shape,
      },
      async (args) => this.versionsTool.executeGetLatestVersion(args)
    );

    // Register get_gem_dependencies tool
    this.server.registerTool(
      'get_gem_dependencies',
      {
        description:
          'Get reverse dependencies for a gem (gems that depend on the specified gem)',
        inputSchema: GemDependenciesSchema.shape,
      },
      async (args) => this.versionsTool.executeGetDependencies(args)
    );

    // Register get_gem_changelog tool
    this.server.registerTool(
      'get_gem_changelog',
      {
        description:
          'Get changelog for a specific gem in markdown format, optionally for a specific version',
        inputSchema: GemChangelogSchema.shape,
      },
      async (args) => this.changelogTool.execute(args)
    );

    // Register parse_gemfile tool
    this.server.registerTool(
      'parse_gemfile',
      {
        description:
          'Parse a Gemfile or .gemspec file to extract gem dependencies and versions as JSON. Optionally specify a project name to resolve the file path within that project.',
        inputSchema: GemfileParserSchema.shape,
      },
      async (args) => this.gemfileParserTool.execute(args)
    );

    // Register pin_gem tool
    this.server.registerTool(
      'pin_gem',
      {
        description:
          'Pin a gem to a specific version with configurable pinning type (~>, >=, >, <, <=, =). Optionally specify a project name to resolve the file path within that project.',
        inputSchema: GemPinSchema.shape,
      },
      async (args) => this.gemPinTool.executePin(args)
    );

    // Register unpin_gem tool
    this.server.registerTool(
      'unpin_gem',
      {
        description:
          'Unpin a gem by removing version constraints from Gemfile. Optionally specify a project name to resolve the file path within that project.',
        inputSchema: GemUnpinSchema.shape,
      },
      async (args) => this.gemPinTool.executeUnpin(args)
    );

    // Register add_gem_to_gemfile tool
    this.server.registerTool(
      'add_gem_to_gemfile',
      {
        description:
          'Add a gem to a Gemfile with optional version constraints, groups, and custom options. Optionally specify a project name to resolve the file path within that project.',
        inputSchema: GemAddToGemfileSchema.shape,
      },
      async (args) => this.gemAddTool.executeAddToGemfile(args)
    );

    // Register add_gem_to_gemspec tool
    this.server.registerTool(
      'add_gem_to_gemspec',
      {
        description:
          'Add a dependency to a .gemspec file with optional version constraints. Can add runtime or development dependencies. Optionally specify a project name to resolve the file path within that project.',
        inputSchema: GemAddToGemspecSchema.shape,
      },
      async (args) => this.gemAddTool.executeAddToGemspec(args)
    );

    // Register bundle_install tool
    this.server.registerTool(
      'bundle_install',
      {
        description:
          'Run bundle install in a project directory with configurable options such as deployment mode, excluded groups, and custom Gemfile paths. Optionally specify a project name to run within that project.',
        inputSchema: BundleInstallSchema.shape,
      },
      async (args) => this.bundleInstallTool.execute(args)
    );

    // Register bundle_check tool
    this.server.registerTool(
      'bundle_check',
      {
        description:
          'Run bundle check to verify that all gems in Gemfile.lock are installed and available. Optionally specify a project name to run within that project.',
        inputSchema: BundleCheckSchema.shape,
      },
      async (args) => this.bundleToolsManager.executeCheck(args)
    );

    // Register bundle_show tool
    this.server.registerTool(
      'bundle_show',
      {
        description:
          'Show information about installed gems. Can show all gems or details for a specific gem, with options for paths and outdated gem information. Optionally specify a project name to run within that project.',
        inputSchema: BundleShowSchema.shape,
      },
      async (args) => this.bundleToolsManager.executeShow(args)
    );

    // Register bundle_audit tool
    this.server.registerTool(
      'bundle_audit',
      {
        description:
          'Run bundle audit to check for security vulnerabilities in installed gems. Requires bundler-audit gem to be installed. Optionally specify a project name to run within that project.',
        inputSchema: BundleAuditSchema.shape,
      },
      async (args) => this.bundleToolsManager.executeAudit(args)
    );

    // Register bundle_clean tool
    this.server.registerTool(
      'bundle_clean',
      {
        description:
          'Run bundle clean to remove gems not specified in Gemfile.lock. Supports dry-run and force options. Optionally specify a project name to run within that project.',
        inputSchema: BundleCleanSchema.shape,
      },
      async (args) => this.bundleToolsManager.executeClean(args)
    );
  }

  private setupErrorHandling(): void {
    // Error handling is managed through try-catch blocks in tool handlers

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[Uncaught Exception]', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Unhandled Rejection]', reason, 'at', promise);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, shutting down gracefully...');
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      await this.cleanup();
      process.exit(0);
    });
  }

  private async cleanup(): Promise<void> {
    try {
      // Clear API cache
      this.client.clearCache();

      // Close server if needed
      // The MCP SDK handles server cleanup automatically

      console.log('Cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Gems MCP Server running on stdio');
  }

  // Expose server for testing
  getServer(): McpServer {
    return this.server;
  }

  // Expose client for testing
  getClient(): RubyGemsClient {
    return this.client;
  }
}

/**
 * Parse command-line arguments for project configurations and quote settings
 */
interface ProgramOptions {
  project?: string[];
  quotes?: string;
}

/**
 * Get package info from package.json
 */
function getPackageInfo(): { version: string; description: string } {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packagePath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return {
      version: packageJson.version,
      description: packageJson.description,
    };
  } catch (error) {
    // Fallback values if package.json can't be read
    return {
      version: '0.1.2',
      description:
        'MCP server for interacting with RubyGems.org API, Gemfiles, and gemspecs',
    };
  }
}

function setupCommander(): Command {
  const program = new Command();
  const { version, description } = getPackageInfo();

  program
    .name('gems-mcp')
    .description(description)
    .version(version)
    .option(
      '-p, --project <project...>',
      'Configure projects. Format: name:path or path (can be specified multiple times)'
    )
    .option(
      '-q, --quotes <style>',
      'Quote style for Gemfile and Gemspec entries (single or double)'
    )
    .parse();

  return program;
}

function parseCommandLineArgs(program: Command): {
  projects: ProjectConfig[];
  quoteConfig: QuoteConfig;
} {
  const options = program.opts<ProgramOptions>();
  const projects: ProjectConfig[] = [];
  let quoteConfig = { ...DEFAULT_QUOTE_CONFIG };

  // Parse project configurations
  if (options.project) {
    for (const projectDef of options.project) {
      const colonIndex = projectDef.indexOf(':');

      if (colonIndex === -1) {
        // If no colon, treat the whole thing as a path with name derived from directory name
        const path = projectDef;
        const name = path.split('/').pop() || 'unnamed';
        projects.push({ name, path });
      } else {
        // Split by first colon to get name:path
        const name = projectDef.substring(0, colonIndex);
        const path = projectDef.substring(colonIndex + 1);

        if (!name || !path) {
          console.error(
            `Invalid project format: ${projectDef}. Expected name:path or path`
          );
          process.exit(1);
        }

        projects.push({ name, path });
      }
    }
  }

  // Parse quote configuration - only if explicitly provided
  if (options.quotes) {
    try {
      const quoteStyle = parseQuoteStyle(options.quotes);
      // Apply the same quote style to both gemfile and gemspec
      quoteConfig = {
        gemfile: quoteStyle,
        gemspec: quoteStyle,
      };
    } catch (error) {
      console.error(
        `Invalid quotes option: ${options.quotes}. Expected 'single' or 'double'`
      );
      process.exit(1);
    }
  }

  return { projects, quoteConfig };
}

// Main execution
async function main(): Promise<void> {
  try {
    // Setup and parse command-line arguments with Commander
    const program = setupCommander();
    const { projects: projectConfigs, quoteConfig } =
      parseCommandLineArgs(program);

    // Create project manager with configured projects
    const projectManager = new ProjectManager(projectConfigs);

    // Validate all projects are accessible
    await projectManager.validateProjects();

    // Create and start server
    const server = new GemsServer(projectManager, quoteConfig);
    await server.start();

    if (projectConfigs.length > 0) {
      console.error(
        `Gems MCP Server running with ${projectConfigs.length} configured project(s): ${projectManager.getProjectNames().join(', ')}`
      );
    } else {
      console.error(
        'Gems MCP Server running with default project (current directory)'
      );
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only run main if this file is executed directly (not imported)
// Check if this is the main module being executed
const isMainModule =
  process.argv[1] &&
  (import.meta.url === `file://${process.argv[1]}` ||
    import.meta.url.endsWith(process.argv[1]) ||
    process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('gems-mcp'));

if (isMainModule) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Export for use in other modules
export { RubyGemsClient } from './api/client.js';
export { ApiCache } from './api/cache.js';
export * from './types.js';
export * from './schemas.js';
