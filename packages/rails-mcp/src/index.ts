/**
 * Rails MCP Server - A Model Context Protocol server for Rails CLI
 *
 * This server provides tools for listing Rails generators, getting generator help,
 * and executing Rails generators with proper validation and error handling.
 */

import { Command } from 'commander';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { RailsClient } from './api/rails-client.js';
import { GeneratorsTool } from './tools/generators.js';
import { GeneratorHelpTool } from './tools/generator-help.js';
import { GenerateTool } from './tools/generate.js';
import { DestroyTool } from './tools/destroy.js';
import { ProjectManager, type ProjectConfig } from './project-manager.js';
import {
  ListGeneratorsSchema,
  GetGeneratorHelpSchema,
  GenerateSchema,
  DestroySchema,
} from './schemas.js';

export class RailsServer {
  private server: McpServer;
  private client: RailsClient;
  private projectManager: ProjectManager;
  private generatorsTool: GeneratorsTool;
  private generatorHelpTool: GeneratorHelpTool;
  private generateTool: GenerateTool;
  private destroyTool: DestroyTool;

  constructor(projectManager?: ProjectManager) {
    // Initialize server
    this.server = new McpServer({
      name: '@ruby-mcp/rails-mcp',
      version: '0.1.0',
    });

    // Initialize project manager
    this.projectManager = projectManager || new ProjectManager();

    // Initialize Rails client
    this.client = new RailsClient({
      timeout: 30000, // 30 seconds for Rails commands
      cacheEnabled: true,
      cacheTtl: 5 * 60 * 1000, // 5 minutes
    });

    // Initialize tools
    this.generatorsTool = new GeneratorsTool({
      client: this.client,
      projectManager: this.projectManager,
    });
    this.generatorHelpTool = new GeneratorHelpTool({
      client: this.client,
      projectManager: this.projectManager,
    });
    this.generateTool = new GenerateTool({
      client: this.client,
      projectManager: this.projectManager,
    });
    this.destroyTool = new DestroyTool({
      client: this.client,
      projectManager: this.projectManager,
    });

    this.setupTools();
    this.setupErrorHandling();
  }

  private setupTools(): void {
    // Register list_generators tool
    this.server.registerTool(
      'list_generators',
      {
        description:
          'List all available Rails generators in a Rails project with descriptions',
        inputSchema: ListGeneratorsSchema.shape,
      },
      async (args) => this.generatorsTool.execute(args)
    );

    // Register get_generator_help tool
    this.server.registerTool(
      'get_generator_help',
      {
        description:
          'Get detailed help for a specific Rails generator including options and usage examples',
        inputSchema: GetGeneratorHelpSchema.shape,
      },
      async (args) => this.generatorHelpTool.execute(args)
    );

    // Register generate tool
    this.server.registerTool(
      'generate',
      {
        description:
          'Execute a Rails generator with specified arguments and options',
        inputSchema: GenerateSchema.shape,
      },
      async (args) => this.generateTool.execute(args)
    );

    // Register destroy tool
    this.server.registerTool(
      'destroy',
      {
        description:
          'Execute a Rails destroy command with specified arguments and options',
        inputSchema: DestroySchema.shape,
      },
      async (args) => this.destroyTool.execute(args)
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
      // Clear Rails client cache
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
    console.error('Rails MCP Server running on stdio');
  }

  // Expose server for testing
  getServer(): McpServer {
    return this.server;
  }

  // Expose client for testing
  getClient(): RailsClient {
    return this.client;
  }
}

/**
 * Parse command-line arguments for project configurations
 */
interface ProgramOptions {
  project?: string[];
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
      version: '0.1.0',
      description:
        'MCP server for interacting with Rails CLI - list generators, get help, and execute Rails generators',
    };
  }
}

function setupCommander(): Command {
  const program = new Command();
  const { version, description } = getPackageInfo();

  program
    .name('rails-mcp')
    .description(description)
    .version(version)
    .option(
      '-p, --project <project...>',
      'Configure projects. Format: name:path or path (can be specified multiple times)'
    )
    .parse();

  return program;
}

function parseCommandLineArgs(program: Command): {
  projects: ProjectConfig[];
} {
  const options = program.opts<ProgramOptions>();
  const projects: ProjectConfig[] = [];

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

  return { projects };
}

// Main execution
async function main(): Promise<void> {
  try {
    // Setup and parse command-line arguments with Commander
    const program = setupCommander();
    const { projects: projectConfigs } = parseCommandLineArgs(program);

    // Create project manager with configured projects
    const projectManager = new ProjectManager(projectConfigs);

    // Validate all projects are accessible
    await projectManager.validateProjects();

    // Create and start server
    const server = new RailsServer(projectManager);
    await server.start();

    if (projectConfigs.length > 0) {
      console.error(
        `Rails MCP Server running with ${projectConfigs.length} configured project(s): ${projectManager.getProjectNames().join(', ')}`
      );
    } else {
      console.error(
        'Rails MCP Server running with default project (current directory)'
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
    process.argv[1].endsWith('rails-mcp'));

if (isMainModule) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Export for use in other modules
export { RailsClient } from './api/rails-client.js';
export * from './types.js';
export * from './schemas.js';
