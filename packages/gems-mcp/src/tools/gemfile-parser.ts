/**
 * MCP tool for parsing Gemfiles and Gemspecs to extract gem dependencies and versions
 */

import { promises as fs } from 'fs';
import { basename, extname } from 'path';
import { validateInput } from '../utils/validation.js';
import { GemfileParserSchema, type GemfileParserInput } from '../schemas.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ProjectManager } from '../project-manager.js';

export interface ParsedGem {
  name: string;
  version?: string;
  requirement?: string;
  source?: string;
  group?: string[];
  platform?: string[];
}

export interface ParsedGemfile {
  gems: ParsedGem[];
  ruby_version?: string;
  source?: string;
  path: string;
  type: 'gemfile' | 'gemspec';
}

export class GemfileParserTool {
  private projectManager?: ProjectManager;

  constructor(options?: { projectManager?: ProjectManager }) {
    this.projectManager = options?.projectManager;
  }

  async execute(args: unknown): Promise<CallToolResult> {
    // Validate input
    const validation = validateInput(GemfileParserSchema, args);
    if (!validation.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${validation.error}`,
          },
        ],
        isError: true,
      };
    }

    const { file_path, project } = validation.data as GemfileParserInput;

    // Resolve file path using project manager if available
    let resolvedFilePath: string;
    try {
      resolvedFilePath = this.projectManager
        ? this.projectManager.resolveFilePath(file_path, project)
        : file_path;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    try {
      // Check if file exists and is readable
      await fs.access(resolvedFilePath, fs.constants.R_OK);

      const fileStats = await fs.stat(resolvedFilePath);
      if (!fileStats.isFile()) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${resolvedFilePath} is not a file`,
            },
          ],
          isError: true,
        };
      }

      // Read file content
      const content = await fs.readFile(resolvedFilePath, 'utf-8');
      const fileName = basename(resolvedFilePath).toLowerCase();
      const fileExt = extname(resolvedFilePath).toLowerCase();

      let result: ParsedGemfile;

      // Determine file type and parse accordingly
      if (fileName === 'gemfile' || fileName.endsWith('gemfile')) {
        result = this.parseGemfile(content, resolvedFilePath);
      } else if (fileExt === '.gemspec') {
        result = this.parseGemspec(content, resolvedFilePath);
      } else {
        // Try to auto-detect based on content
        if (
          content.includes('Gem::Specification.new') ||
          content.includes('spec.add_dependency')
        ) {
          result = this.parseGemspec(content, resolvedFilePath);
        } else {
          result = this.parseGemfile(content, resolvedFilePath);
        }
      }

      // Format the result as JSON
      const jsonResult = JSON.stringify(result, null, 2);

      return {
        content: [
          {
            type: 'text',
            text: jsonResult,
          },
        ],
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: File not found: ${resolvedFilePath}`,
              },
            ],
            isError: true,
          };
        } else if (error.message.includes('EACCES')) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Permission denied reading file: ${resolvedFilePath}`,
              },
            ],
            isError: true,
          };
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `Unexpected error parsing gemfile: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private parseGemfile(content: string, filePath: string): ParsedGemfile {
    const result: ParsedGemfile = {
      gems: [],
      path: filePath,
      type: 'gemfile',
    };

    const lines = content.split('\n');
    let currentGroup: string[] = [];
    let currentSource: string | undefined;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comments and empty lines
      if (!line || line.startsWith('#')) continue;

      // Parse ruby version
      const rubyVersionMatch = line.match(/ruby\s+['"]([^'"]+)['"]/);
      if (rubyVersionMatch) {
        result.ruby_version = rubyVersionMatch[1];
        continue;
      }

      // Parse source
      const sourceMatch = line.match(/source\s+['"]([^'"]+)['"]/);
      if (sourceMatch) {
        if (!result.source) {
          result.source = sourceMatch[1];
        }
        currentSource = sourceMatch[1];
        continue;
      }

      // Parse group declarations
      const groupMatch = line.match(/group\s+(.+?)\s+do|group\((.+?)\)\s+do/);
      if (groupMatch) {
        const groupStr = groupMatch[1] || groupMatch[2];
        currentGroup = this.parseGroupString(groupStr);
        continue;
      }

      // Check for end of group
      if (line === 'end' && currentGroup.length > 0) {
        currentGroup = [];
        continue;
      }

      // Parse gem declarations
      const gemMatch = line.match(
        /gem\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?(.*)/
      );
      if (gemMatch) {
        const gemName = gemMatch[1];
        const versionRequirement = gemMatch[2];
        const restOfLine = gemMatch[3] || '';

        const gem: ParsedGem = {
          name: gemName,
          requirement: versionRequirement,
        };

        if (currentGroup.length > 0) {
          gem.group = [...currentGroup];
        }

        if (currentSource && currentSource !== result.source) {
          gem.source = currentSource;
        }

        // Parse additional options like platform, require, etc.
        this.parseGemOptions(restOfLine, gem);

        result.gems.push(gem);
      }
    }

    return result;
  }

  private parseGemspec(content: string, filePath: string): ParsedGemfile {
    const result: ParsedGemfile = {
      gems: [],
      path: filePath,
      type: 'gemspec',
    };

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comments and empty lines
      if (!line || line.startsWith('#')) continue;

      // Parse runtime dependencies
      const runtimeDepMatch = line.match(
        /(?:spec\.|s\.)add_dependency\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/
      );
      if (runtimeDepMatch) {
        const gem: ParsedGem = {
          name: runtimeDepMatch[1],
          requirement: runtimeDepMatch[2],
        };
        result.gems.push(gem);
        continue;
      }

      // Parse development dependencies
      const devDepMatch = line.match(
        /(?:spec\.|s\.)add_development_dependency\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/
      );
      if (devDepMatch) {
        const gem: ParsedGem = {
          name: devDepMatch[1],
          requirement: devDepMatch[2],
          group: ['development'],
        };
        result.gems.push(gem);
        continue;
      }

      // Parse required Ruby version
      const rubyVersionMatch = line.match(
        /required_ruby_version\s*=\s*['"]([^'"]+)['"]/
      );
      if (rubyVersionMatch) {
        result.ruby_version = rubyVersionMatch[1];
        continue;
      }
    }

    return result;
  }

  private parseGroupString(groupStr: string): string[] {
    // Handle various group formats: :development, "development", [:dev, :test], etc.
    const groups: string[] = [];

    // Remove parentheses if present
    groupStr = groupStr.replace(/[()]/g, '');

    // Handle array format like [:development, :test]
    if (groupStr.includes('[') && groupStr.includes(']')) {
      const arrayMatch = groupStr.match(/\[([^\]]+)\]/);
      if (arrayMatch) {
        const items = arrayMatch[1].split(',').map((item) => item.trim());
        for (const item of items) {
          const cleanItem = item.replace(/^['":]+|['":]+$/g, '');
          if (cleanItem) {
            groups.push(cleanItem);
          }
        }
        return groups;
      }
    }

    // Handle single group or multiple groups separated by commas
    const parts = groupStr.split(',').map((part) => part.trim());

    for (const part of parts) {
      // Remove quotes and colons
      const cleanPart = part.replace(/^['":]+|['":]+$/g, '');
      if (cleanPart) {
        groups.push(cleanPart);
      }
    }

    return groups;
  }

  private parseGemOptions(optionsString: string, gem: ParsedGem): void {
    // Parse platform restrictions - need to handle both single and array formats
    const platformMatch = optionsString.match(
      /platform(?:s)?:\s*(\[.*?\]|[^,}\s]+)/
    );
    if (platformMatch) {
      const platformStr = platformMatch[1].trim();
      gem.platform = this.parsePlatformString(platformStr);
    }

    // Parse source
    const sourceMatch = optionsString.match(/source:\s*['"]([^'"]+)['"]/);
    if (sourceMatch) {
      gem.source = sourceMatch[1];
    }

    // Parse git source
    const gitMatch = optionsString.match(/git:\s*['"]([^'"]+)['"]/);
    if (gitMatch) {
      gem.source = gitMatch[1];
    }

    // Parse path source
    const pathMatch = optionsString.match(/path:\s*['"]([^'"]+)['"]/);
    if (pathMatch) {
      gem.source = pathMatch[1];
    }
  }

  private parsePlatformString(platformStr: string): string[] {
    const platforms: string[] = [];

    // Handle array format [:ruby, :jruby]
    if (platformStr.includes('[') && platformStr.includes(']')) {
      const arrayMatch = platformStr.match(/\[([^\]]+)\]/);
      if (arrayMatch) {
        const items = arrayMatch[1].split(',').map((item) => item.trim());
        for (const item of items) {
          const cleanItem = item.replace(/^['":]+|['":]+$/g, '');
          if (cleanItem) {
            platforms.push(cleanItem);
          }
        }
      }
    } else {
      // Handle single platform format
      const cleanPlatform = platformStr.replace(/^['":]+|['":]+$/g, '');
      if (cleanPlatform) {
        platforms.push(cleanPlatform);
      }
    }

    return platforms;
  }
}
