/**
 * MCP tool for pinning and unpinning gems in Gemfiles
 */

import { promises as fs } from "node:fs";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ProjectManager } from "../project-manager.js";
import {
  type GemPinInput,
  GemPinSchema,
  type GemUnpinInput,
  GemUnpinSchema,
} from "../schemas.js";
import {
  type QuoteConfig,
  type QuoteStyle,
  detectQuoteStyle,
  formatVersionRequirement,
} from "../utils/quotes.js";
import { validateInput } from "../utils/validation.js";

export class GemPinTool {
  private projectManager?: ProjectManager;
  private quoteConfig?: QuoteConfig;

  constructor(options?: {
    projectManager?: ProjectManager;
    quoteConfig?: QuoteConfig;
  }) {
    this.projectManager = options?.projectManager;
    this.quoteConfig = options?.quoteConfig;
  }

  async executePin(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(GemPinSchema, args);
    if (!validation.success) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${validation.error}`,
          },
        ],
        isError: true,
      };
    }

    const { gem_name, version, pin_type, quote_style, file_path, project } =
      validation.data as GemPinInput;

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
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
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
              type: "text",
              text: `Error: ${resolvedFilePath} is not a file`,
            },
          ],
          isError: true,
        };
      }

      const content = await fs.readFile(resolvedFilePath, "utf-8");
      const lines = content.split("\n");
      let modified = false;
      let gemFound = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith("#") || !trimmedLine) continue;

        const gemMatch = line.match(/^(\s*)gem\s+(['"])([^'"]+)\2(.*)/);
        if (gemMatch && gemMatch[3] === gem_name) {
          gemFound = true;
          const indentation = gemMatch[1];
          const restOfLine = gemMatch[4] || "";

          // Determine quote style to use
          const effectiveQuoteStyle: QuoteStyle =
            quote_style ||
            detectQuoteStyle(line) ||
            this.quoteConfig?.gemfile ||
            "single";

          const versionRequirement = formatVersionRequirement(
            version,
            pin_type,
            effectiveQuoteStyle
          );

          if (restOfLine.trim()) {
            const cleanedRest = restOfLine
              .replace(/^\s*,?\s*['"][^'"]*['"]/, "")
              .trim();
            const quote = effectiveQuoteStyle === "single" ? "'" : '"';
            if (cleanedRest.startsWith(",")) {
              lines[i] =
                `${indentation}gem ${quote}${gem_name}${quote}, ${versionRequirement}${cleanedRest}`;
            } else if (cleanedRest) {
              // Check if cleanedRest is just a comment (starts with #)
              if (cleanedRest.startsWith("#")) {
                lines[i] =
                  `${indentation}gem ${quote}${gem_name}${quote}, ${versionRequirement} ${cleanedRest}`;
              } else {
                lines[i] =
                  `${indentation}gem ${quote}${gem_name}${quote}, ${versionRequirement}, ${cleanedRest}`;
              }
            } else {
              lines[i] =
                `${indentation}gem ${quote}${gem_name}${quote}, ${versionRequirement}`;
            }
          } else {
            const quote = effectiveQuoteStyle === "single" ? "'" : '"';
            lines[i] =
              `${indentation}gem ${quote}${gem_name}${quote}, ${versionRequirement}`;
          }
          modified = true;
          break;
        }
      }

      if (!gemFound) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Gem '${gem_name}' not found in ${resolvedFilePath}`,
            },
          ],
          isError: true,
        };
      }

      if (modified) {
        await fs.writeFile(resolvedFilePath, lines.join("\n"), "utf-8");
        return {
          content: [
            {
              type: "text",
              text: `Successfully pinned '${gem_name}' to '${pin_type} ${version}' in ${resolvedFilePath}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `No changes needed for '${gem_name}' in ${resolvedFilePath}`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("ENOENT")) {
          return {
            content: [
              {
                type: "text",
                text: `Error: File not found: ${resolvedFilePath}`,
              },
            ],
            isError: true,
          };
        }
        if (error.message.includes("EACCES")) {
          return {
            content: [
              {
                type: "text",
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
            type: "text",
            text: `Unexpected error pinning gem: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }

  async executeUnpin(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(GemUnpinSchema, args);
    if (!validation.success) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${validation.error}`,
          },
        ],
        isError: true,
      };
    }

    const { gem_name, quote_style, file_path, project } =
      validation.data as GemUnpinInput;

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
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
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
              type: "text",
              text: `Error: ${resolvedFilePath} is not a file`,
            },
          ],
          isError: true,
        };
      }

      const content = await fs.readFile(resolvedFilePath, "utf-8");
      const lines = content.split("\n");
      let modified = false;
      let gemFound = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith("#") || !trimmedLine) continue;

        const gemMatch = line.match(/^(\s*)gem\s+(['"])([^'"]+)\2(.*)/);
        if (gemMatch && gemMatch[3] === gem_name) {
          gemFound = true;
          const indentation = gemMatch[1];
          const restOfLine = gemMatch[4] || "";

          // Determine quote style to use
          const effectiveQuoteStyle: QuoteStyle =
            quote_style ||
            detectQuoteStyle(line) ||
            this.quoteConfig?.gemfile ||
            "single";

          if (restOfLine.trim()) {
            let versionRemoved = restOfLine
              .replace(/^\s*,?\s*['"][^'"]*['"]/, "")
              .trim();
            if (versionRemoved.startsWith(",")) {
              versionRemoved = versionRemoved.substring(1).trim();
            }
            const quote = effectiveQuoteStyle === "single" ? "'" : '"';
            if (versionRemoved) {
              // Check if versionRemoved is just a comment (starts with #)
              if (versionRemoved.startsWith("#")) {
                lines[i] =
                  `${indentation}gem ${quote}${gem_name}${quote} ${versionRemoved}`;
              } else {
                lines[i] =
                  `${indentation}gem ${quote}${gem_name}${quote}, ${versionRemoved}`;
              }
            } else {
              lines[i] = `${indentation}gem ${quote}${gem_name}${quote}`;
            }
            modified = true;
          }
          break;
        }
      }

      if (!gemFound) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Gem '${gem_name}' not found in ${resolvedFilePath}`,
            },
          ],
          isError: true,
        };
      }

      if (modified) {
        await fs.writeFile(resolvedFilePath, lines.join("\n"), "utf-8");
        return {
          content: [
            {
              type: "text",
              text: `Successfully unpinned '${gem_name}' (removed version constraints) in ${resolvedFilePath}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `No version constraints found to remove for '${gem_name}' in ${resolvedFilePath}`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("ENOENT")) {
          return {
            content: [
              {
                type: "text",
                text: `Error: File not found: ${resolvedFilePath}`,
              },
            ],
            isError: true,
          };
        }
        if (error.message.includes("EACCES")) {
          return {
            content: [
              {
                type: "text",
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
            type: "text",
            text: `Unexpected error unpinning gem: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
}
