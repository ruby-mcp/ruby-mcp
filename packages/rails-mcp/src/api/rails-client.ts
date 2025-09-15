/**
 * Rails CLI client for executing Rails commands and parsing output
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import type {
  ApiResponse,
  RailsGenerator,
  GeneratorHelp,
  RailsProjectInfo,
  GenerateResult,
} from '../types.js';

export interface RailsClientOptions {
  timeout?: number;
  cacheEnabled?: boolean;
  cacheTtl?: number;
}

export class RailsClient {
  private timeout: number;
  private cacheEnabled: boolean;
  private cache: Map<string, { data: unknown; expires: number }> = new Map();
  private cacheTtl: number;

  constructor(options: RailsClientOptions = {}) {
    this.timeout = options.timeout ?? 30000;
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cacheTtl = options.cacheTtl ?? 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Check if the given directory contains a Rails project
   */
  async checkRailsProject(projectPath: string): Promise<RailsProjectInfo> {
    try {
      // Check for Gemfile and config/application.rb
      const gemfilePath = join(projectPath, 'Gemfile');
      const applicationPath = join(projectPath, 'config', 'application.rb');

      const [hasGemfile, hasApplication] = await Promise.all([
        fs
          .access(gemfilePath)
          .then(() => true)
          .catch(() => false),
        fs
          .access(applicationPath)
          .then(() => true)
          .catch(() => false),
      ]);

      if (!hasGemfile) {
        return {
          isRailsProject: false,
          rootPath: projectPath,
        };
      }

      // Try to detect Rails version from Gemfile.lock
      let railsVersion: string | undefined;
      try {
        const gemfileLockPath = join(projectPath, 'Gemfile.lock');
        const gemfileLock = await fs.readFile(gemfileLockPath, 'utf8');
        const railsMatch = gemfileLock.match(
          /rails \((\d+\.\d+\.\d+(?:\.\w+)?)\)/
        );
        if (railsMatch) {
          railsVersion = railsMatch[1];
        }
      } catch {
        // Gemfile.lock not found or unreadable
      }

      // Determine project type
      let projectType: 'application' | 'engine' | 'gem' = 'gem';
      if (hasApplication) {
        // Check if it's an engine
        const applicationContent = await fs.readFile(applicationPath, 'utf8');
        if (applicationContent.includes('Rails::Engine')) {
          projectType = 'engine';
        } else {
          projectType = 'application';
        }
      }

      return {
        isRailsProject: true,
        railsVersion,
        projectType,
        rootPath: projectPath,
      };
    } catch (error) {
      return {
        isRailsProject: false,
        rootPath: projectPath,
      };
    }
  }

  /**
   * List all available generators
   */
  async listGenerators(
    projectPath: string
  ): Promise<ApiResponse<RailsGenerator[]>> {
    // First check if this is a Rails project
    const projectInfo = await this.checkRailsProject(projectPath);
    if (!projectInfo.isRailsProject) {
      return {
        data: [],
        success: false,
        error: `Not a Rails project: ${projectPath}. Cannot list generators outside of Rails projects.`,
      };
    }

    const cacheKey = `generators:${projectPath}`;

    if (this.cacheEnabled) {
      const cached = this.getCached<RailsGenerator[]>(cacheKey);
      if (cached) {
        return { data: cached, success: true };
      }
    }

    try {
      const output = await this.executeRailsCommand(
        ['generate', '--help'],
        projectPath
      );

      if (!output.success) {
        return {
          data: [],
          success: false,
          error: output.error,
        };
      }

      const generators = this.parseGeneratorsList(output.data);

      if (this.cacheEnabled) {
        this.setCached(cacheKey, generators);
      }

      return { data: generators, success: true };
    } catch (error) {
      return {
        data: [],
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get help for a specific generator
   */
  async getGeneratorHelp(
    generatorName: string,
    projectPath: string
  ): Promise<ApiResponse<GeneratorHelp>> {
    // First check if this is a Rails project
    const projectInfo = await this.checkRailsProject(projectPath);
    if (!projectInfo.isRailsProject) {
      return {
        data: {} as GeneratorHelp,
        success: false,
        error: `Not a Rails project: ${projectPath}. Cannot get generator help outside of Rails projects.`,
      };
    }

    const cacheKey = `generator-help:${generatorName}:${projectPath}`;

    if (this.cacheEnabled) {
      const cached = this.getCached<GeneratorHelp>(cacheKey);
      if (cached) {
        return { data: cached, success: true };
      }
    }

    try {
      const output = await this.executeRailsCommand(
        ['generate', generatorName, '--help'],
        projectPath
      );

      if (!output.success) {
        return {
          data: {} as GeneratorHelp,
          success: false,
          error: output.error,
        };
      }

      const help = this.parseGeneratorHelp(generatorName, output.data);

      if (this.cacheEnabled) {
        this.setCached(cacheKey, help);
      }

      return { data: help, success: true };
    } catch (error) {
      return {
        data: {} as GeneratorHelp,
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Execute a Rails generator
   */
  async generateFiles(
    generatorName: string,
    args: string[],
    options: Record<string, unknown>,
    projectPath: string
  ): Promise<ApiResponse<GenerateResult>> {
    // First check if this is a Rails project
    const projectInfo = await this.checkRailsProject(projectPath);
    if (!projectInfo.isRailsProject) {
      return {
        data: {
          success: false,
          output: '',
          error: `Not a Rails project: ${projectPath}. Cannot run generators outside of Rails projects.`,
          filesCreated: [],
          filesModified: [],
        },
        success: false,
        error: `Not a Rails project: ${projectPath}. Cannot run generators outside of Rails projects.`,
      };
    }

    try {
      const command = ['generate', generatorName, ...args];

      // Add options to command
      for (const [key, value] of Object.entries(options)) {
        if (typeof value === 'boolean') {
          if (value) {
            command.push(`--${key}`);
          } else {
            command.push(`--no-${key}`);
          }
        } else if (Array.isArray(value)) {
          command.push(`--${key}`);
          command.push(value.join(','));
        } else if (value !== undefined) {
          command.push(`--${key}`);
          command.push(String(value));
        }
      }

      const output = await this.executeRailsCommand(command, projectPath);

      if (!output.success) {
        return {
          data: {
            success: false,
            output: '',
            error: output.error,
            filesCreated: [],
            filesModified: [],
          },
          success: false,
          error: output.error,
        };
      }

      const result = this.parseGenerateOutput(output.data);

      return { data: result, success: true };
    } catch (error) {
      return {
        data: {
          success: false,
          output: '',
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
          filesCreated: [],
          filesModified: [],
        },
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Execute a Rails command and return the output
   */
  private async executeRailsCommand(
    args: string[],
    cwd: string
  ): Promise<ApiResponse<string>> {
    return new Promise((resolve) => {
      const child = spawn('rails', args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, RAILS_ENV: 'development' },
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          data: '',
          success: false,
          error: `Command timed out after ${this.timeout}ms`,
        });
      }, this.timeout);

      child.on('close', (code) => {
        clearTimeout(timer);

        if (code === 0) {
          resolve({
            data: stdout,
            success: true,
          });
        } else {
          const errorMessage =
            stderr || stdout || `Command failed with exit code ${code}`;
          resolve({
            data: '',
            success: false,
            error: errorMessage,
          });
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        resolve({
          data: '',
          success: false,
          error: `Failed to execute rails command: ${error.message}`,
        });
      });
    });
  }

  /**
   * Parse the output of 'rails generate --help' to extract generator list
   */
  private parseGeneratorsList(output: string): RailsGenerator[] {
    const generators: RailsGenerator[] = [];
    const lines = output.split('\n');

    let inGeneratorsList = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Look for the generators section
      if (trimmed.includes('Please choose a generator below')) {
        inGeneratorsList = true;
        continue;
      }

      if (!inGeneratorsList) continue;

      // Skip empty lines and headers
      if (
        !trimmed ||
        trimmed.startsWith('Rails:') ||
        trimmed.startsWith('===')
      ) {
        continue;
      }

      // Parse generator line (format: "  generator_name")
      const match = trimmed.match(/^(\w+(?::\w+)*)\s*$/);
      if (match) {
        const name = match[1];
        generators.push({
          name,
          description: `Rails ${name} generator`,
          namespace: name.includes(':') ? name.split(':')[0] : undefined,
        });
      }
    }

    return generators;
  }

  /**
   * Parse the output of 'rails generate <generator> --help'
   */
  private parseGeneratorHelp(
    generatorName: string,
    output: string
  ): GeneratorHelp {
    const lines = output.split('\n');
    const help: GeneratorHelp = {
      name: generatorName,
      description: '',
      usage: '',
      options: [],
      arguments: [],
    };

    let currentSection = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Extract usage line
      if (trimmed.startsWith('Usage:')) {
        help.usage = trimmed.substring(6).trim();
        continue;
      }

      // Extract description (usually the first non-empty line)
      if (
        !help.description &&
        trimmed &&
        !trimmed.startsWith('Usage:') &&
        !trimmed.startsWith('Options:')
      ) {
        help.description = trimmed;
        continue;
      }

      // Track sections
      if (trimmed === 'Options:') {
        currentSection = 'options';
        continue;
      }

      // Parse options
      if (currentSection === 'options' && trimmed.startsWith('-')) {
        const optionMatch = trimmed.match(
          /^(-\w,?\s*)?--(\w+)(?:=(\w+))?\s+(.+)$/
        );
        if (optionMatch) {
          const [, shortFlag, optionName, valueType, description] = optionMatch;
          help.options.push({
            name: optionName,
            description: description.trim(),
            type: valueType ? 'string' : 'boolean',
            aliases: shortFlag ? [shortFlag.replace(',', '').trim()] : [],
          });
        }
      }
    }

    return help;
  }

  /**
   * Parse the output of 'rails generate' command execution
   */
  private parseGenerateOutput(output: string): GenerateResult {
    const lines = output.split('\n');
    const filesCreated: string[] = [];
    const filesModified: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('create ')) {
        const filePath = trimmed.substring(7).trim();
        filesCreated.push(filePath);
      } else if (
        trimmed.startsWith('insert ') ||
        trimmed.startsWith('inject ')
      ) {
        const filePath = trimmed.split(' ')[1]?.trim();
        if (filePath && !filesModified.includes(filePath)) {
          filesModified.push(filePath);
        }
      }
    }

    return {
      success: true,
      output,
      filesCreated,
      filesModified,
    };
  }

  /**
   * Get cached data
   */
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expires) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cached data
   */
  private setCached<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.cacheTtl,
    });
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }
}
