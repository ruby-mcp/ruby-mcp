/**
 * MCP tool for adding gems to Gemfiles and gemspec files
 */

import { promises as fs } from 'fs';
import { validateInput } from '../utils/validation.js';
import {
  GemAddToGemfileSchema,
  GemAddToGemspecSchema,
  type GemAddToGemfileInput,
  type GemAddToGemspecInput,
} from '../schemas.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ProjectManager } from '../project-manager.js';
import {
  type QuoteConfig,
  formatGemDeclaration,
  formatDependencyDeclaration,
  type QuoteStyle,
} from '../utils/quotes.js';

export class GemAddTool {
  private projectManager?: ProjectManager;
  private quoteConfig?: QuoteConfig;

  constructor(options?: {
    projectManager?: ProjectManager;
    quoteConfig?: QuoteConfig;
  }) {
    this.projectManager = options?.projectManager;
    this.quoteConfig = options?.quoteConfig;
  }

  async executeAddToGemfile(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(GemAddToGemfileSchema, args);
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

    const {
      gem_name,
      version,
      pin_type,
      group,
      source,
      require: requireOption,
      quote_style,
      file_path,
      project,
    } = validation.data as GemAddToGemfileInput;

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
      await fs.access(resolvedFilePath, fs.constants.R_OK | fs.constants.W_OK);

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

      const content = await fs.readFile(resolvedFilePath, 'utf-8');
      const lines = content.split('\n');

      // Check if gem already exists
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('#') || !trimmedLine) continue;

        const gemMatch = line.match(/gem\s+['"]([^'"]+)['"]/);
        if (gemMatch && gemMatch[1] === gem_name) {
          return {
            content: [
              {
                type: 'text',
                text: `Gem '${gem_name}' already exists in ${resolvedFilePath}`,
              },
            ],
            isError: true,
          };
        }
      }

      // Determine quote style to use
      const effectiveQuoteStyle: QuoteStyle =
        quote_style || this.quoteConfig?.gemfile || 'single';

      // Build the gem declaration using utility function
      const gemDeclaration = formatGemDeclaration(gem_name, {
        version,
        pinType: pin_type,
        source,
        require: requireOption,
        quoteStyle: effectiveQuoteStyle,
      });

      // Determine where to add the gem
      if (group && group.length > 0) {
        // Find or create group block
        const groupNames = group.join(', :');
        const groupPattern = new RegExp(
          `^\\s*group\\s+:${groupNames.replace(', :', ',\\s*:')}\\s+do\\s*$`
        );

        let groupStartIndex = -1;
        let groupEndIndex = -1;
        let indentLevel = '';

        for (let i = 0; i < lines.length; i++) {
          if (groupPattern.test(lines[i])) {
            groupStartIndex = i;
            indentLevel = lines[i].match(/^(\s*)/)?.[1] || '';

            // Find the matching 'end'
            let blockLevel = 1;
            for (let j = i + 1; j < lines.length; j++) {
              if (/^\s*group\s+.*do\s*$/.test(lines[j])) {
                blockLevel++;
              } else if (/^\s*end\s*$/.test(lines[j])) {
                blockLevel--;
                if (blockLevel === 0) {
                  groupEndIndex = j;
                  break;
                }
              }
            }
            break;
          }
        }

        if (groupStartIndex !== -1 && groupEndIndex !== -1) {
          // Add to existing group
          lines.splice(groupEndIndex, 0, `${indentLevel}  ${gemDeclaration}`);
        } else {
          // Create new group at end of file
          const newGroup = [
            '',
            `group :${groupNames} do`,
            `  ${gemDeclaration}`,
            'end',
          ];
          lines.push(...newGroup);
        }
      } else {
        // Add to the end of the file (before any trailing blank lines)
        let insertIndex = lines.length;
        while (insertIndex > 0 && lines[insertIndex - 1].trim() === '') {
          insertIndex--;
        }
        lines.splice(insertIndex, 0, gemDeclaration);
      }

      await fs.writeFile(resolvedFilePath, lines.join('\n'), 'utf-8');

      const groupInfo =
        group && group.length > 0 ? ` in group [:${group.join(', :')}]` : '';
      const versionInfo = version
        ? ` with version '${pin_type} ${version}'`
        : '';

      return {
        content: [
          {
            type: 'text',
            text: `Successfully added '${gem_name}'${versionInfo}${groupInfo} to ${resolvedFilePath}`,
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
                text: `Error: Permission denied accessing file: ${resolvedFilePath}`,
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
            text: `Unexpected error adding gem: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  async executeAddToGemspec(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(GemAddToGemspecSchema, args);
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

    const {
      gem_name,
      version,
      pin_type,
      dependency_type,
      quote_style,
      file_path,
      project,
    } = validation.data as GemAddToGemspecInput;

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
      await fs.access(resolvedFilePath, fs.constants.R_OK | fs.constants.W_OK);

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

      const content = await fs.readFile(resolvedFilePath, 'utf-8');
      const lines = content.split('\n');

      // Check if dependency already exists
      const dependencyPattern = new RegExp(
        `spec\\.add_(?:runtime_)?(?:development_)?dependency\\s+['"]${gem_name}['"]`
      );

      for (const line of lines) {
        if (dependencyPattern.test(line)) {
          return {
            content: [
              {
                type: 'text',
                text: `Dependency '${gem_name}' already exists in ${resolvedFilePath}`,
              },
            ],
            isError: true,
          };
        }
      }

      // Determine quote style to use
      const effectiveQuoteStyle: QuoteStyle =
        quote_style || this.quoteConfig?.gemspec || 'double';

      // Build the dependency declaration using utility function
      const dependencyDeclaration = formatDependencyDeclaration(gem_name, {
        version,
        pinType: pin_type,
        dependencyType: dependency_type,
        quoteStyle: effectiveQuoteStyle,
      });

      // Find the best place to insert the dependency
      let insertIndex = -1;
      let lastDependencyIndex = -1;
      let insideSpecBlock = false;
      let specBlockEndIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Track if we're inside a Gem::Specification.new block
        if (/Gem::Specification\.new\s+do\s*\|/.test(line)) {
          insideSpecBlock = true;
        }

        if (insideSpecBlock && /^\s*end\s*$/.test(line)) {
          specBlockEndIndex = i;
          insideSpecBlock = false;
        }

        // Track the last dependency declaration
        if (/spec\.add_(?:runtime_)?(?:development_)?dependency/.test(line)) {
          lastDependencyIndex = i;
        }
      }

      // Determine insertion point
      if (lastDependencyIndex !== -1) {
        // Add after the last dependency
        insertIndex = lastDependencyIndex + 1;
      } else if (specBlockEndIndex !== -1) {
        // Add before the end of the spec block
        insertIndex = specBlockEndIndex;
        // Add a blank line before if needed
        if (lines[specBlockEndIndex - 1].trim() !== '') {
          lines.splice(insertIndex, 0, '');
          insertIndex++;
        }
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Could not find Gem::Specification block in ${resolvedFilePath}`,
            },
          ],
          isError: true,
        };
      }

      lines.splice(insertIndex, 0, dependencyDeclaration);

      await fs.writeFile(resolvedFilePath, lines.join('\n'), 'utf-8');

      const typeInfo = dependency_type === 'development' ? 'development ' : '';
      const versionInfo = version
        ? ` with version '${pin_type} ${version}'`
        : '';

      return {
        content: [
          {
            type: 'text',
            text: `Successfully added '${gem_name}' as ${typeInfo}dependency${versionInfo} to ${resolvedFilePath}`,
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
                text: `Error: Permission denied accessing file: ${resolvedFilePath}`,
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
            text: `Unexpected error adding dependency: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
}
