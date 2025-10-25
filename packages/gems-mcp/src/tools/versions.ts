/**
 * MCP tools for getting gem version information
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { RubyGemsClient } from "../api/client.js";
import {
  type GemDependenciesInput,
  GemDependenciesSchema,
  type GemVersionsInput,
  GemVersionsSchema,
  type LatestVersionInput,
  LatestVersionSchema,
} from "../schemas.js";
import type { GemVersion } from "../types.js";
import { validateInput } from "../utils/validation.js";

export interface VersionsToolOptions {
  client: RubyGemsClient;
}

export class VersionsTool {
  private client: RubyGemsClient;

  constructor(options: VersionsToolOptions) {
    this.client = options.client;
  }

  async executeGetVersions(args: unknown): Promise<CallToolResult> {
    // Validate input
    const validation = validateInput(GemVersionsSchema, args);
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

    const { gem_name, include_prerelease } =
      validation.data as GemVersionsInput;

    try {
      // Get gem versions
      const response = await this.client.getGemVersions(gem_name);

      if (!response.success) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting gem versions: ${response.error}`,
            },
          ],
          isError: true,
        };
      }

      let versions = response.data;

      // Filter out prerelease versions if not requested
      if (!include_prerelease) {
        versions = versions.filter((v) => !v.prerelease);
      }

      if (versions.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No ${include_prerelease ? "" : "stable "}versions found for gem: ${gem_name}`,
            },
          ],
        };
      }

      // Sort versions by creation date (newest first)
      versions.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Format version list
      let output = `# Versions for ${gem_name}\n\n`;
      output += `Found ${versions.length} version${versions.length === 1 ? "" : "s"}${include_prerelease ? " (including prerelease)" : ""}:\n\n`;

      for (const version of versions) {
        const releaseDate = new Date(version.created_at).toLocaleDateString();
        const platform =
          version.platform !== "ruby" ? ` (${version.platform})` : "";
        const prerelease = version.prerelease ? " [PRERELEASE]" : "";
        const downloads = version.downloads_count?.toLocaleString() ?? "N/A";

        output += `• **${version.number}**${platform}${prerelease}\n`;
        output += `  Released: ${releaseDate}\n`;
        output += `  Downloads: ${downloads}\n`;

        if (version.summary) {
          output += `  Summary: ${version.summary}\n`;
        }

        if (version.ruby_version) {
          output += `  Ruby Version: ${version.ruby_version}\n`;
        }

        output += "\n";
      }

      return {
        content: [
          {
            type: "text",
            text: output,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Unexpected error while getting gem versions: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }

  async executeGetLatestVersion(args: unknown): Promise<CallToolResult> {
    // Validate input
    const validation = validateInput(LatestVersionSchema, args);
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

    const { gem_name, include_prerelease } =
      validation.data as LatestVersionInput;

    try {
      // Get latest version
      const response = await this.client.getLatestVersion(gem_name);

      if (!response.success) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting latest version: ${response.error}`,
            },
          ],
          isError: true,
        };
      }

      const version = response.data;

      // If we don't want prerelease and this is prerelease, get all versions and find latest stable
      if (!include_prerelease && version.prerelease) {
        const allVersionsResponse = await this.client.getGemVersions(gem_name);

        if (allVersionsResponse.success) {
          const stableVersions = allVersionsResponse.data.filter(
            (v) => !v.prerelease
          );

          if (stableVersions.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `No stable versions found for gem: ${gem_name}. Latest version ${version.number} is a prerelease.`,
                },
              ],
            };
          }

          // Sort and get the latest stable version
          stableVersions.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
          const latestStable = stableVersions[0];

          return this.formatVersionResult(gem_name, latestStable, false);
        }
      }

      return this.formatVersionResult(gem_name, version, include_prerelease);
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Unexpected error while getting latest version: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }

  async executeGetDependencies(args: unknown): Promise<CallToolResult> {
    // Validate input
    const validation = validateInput(GemDependenciesSchema, args);
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

    const { gem_name } = validation.data as GemDependenciesInput;

    try {
      // Get reverse dependencies
      const response = await this.client.getReverseDependencies(gem_name);

      if (!response.success) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting dependencies: ${response.error}`,
            },
          ],
          isError: true,
        };
      }

      const dependencies = response.data;

      if (dependencies.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No gems depend on ${gem_name}.`,
            },
          ],
        };
      }

      let output = `# Reverse Dependencies for ${gem_name}\n\n`;
      output += `${dependencies.length} gem${dependencies.length === 1 ? "" : "s"} depend${dependencies.length === 1 ? "s" : ""} on ${gem_name}:\n\n`;

      for (const dep of dependencies) {
        output += `• ${dep.name}\n`;
      }

      return {
        content: [
          {
            type: "text",
            text: output,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Unexpected error while getting dependencies: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }

  private formatVersionResult(
    gemName: string,
    version: GemVersion,
    includePrerelease?: boolean
  ): CallToolResult {
    const releaseDate = new Date(version.created_at).toLocaleDateString();
    const platform =
      version.platform !== "ruby" ? ` (${version.platform})` : "";
    const prerelease = version.prerelease ? " [PRERELEASE]" : "";
    const downloads = version.downloads_count?.toLocaleString() ?? "N/A";

    let output = `# Latest ${includePrerelease ? "" : "Stable "}Version for ${gemName}\n\n`;
    output += `**${version.number}**${platform}${prerelease}\n\n`;
    output += `- **Released:** ${releaseDate}\n`;
    output += `- **Downloads:** ${downloads}\n`;

    if (version.summary) {
      output += `- **Summary:** ${version.summary}\n`;
    }

    if (version.description) {
      output += `- **Description:** ${version.description}\n`;
    }

    if (version.authors) {
      output += `- **Authors:** ${version.authors}\n`;
    }

    if (version.ruby_version) {
      output += `- **Ruby Version:** ${version.ruby_version}\n`;
    }

    if (version.rubygems_version) {
      output += `- **RubyGems Version:** ${version.rubygems_version}\n`;
    }

    if (version.licenses && version.licenses.length > 0) {
      output += `- **License:** ${version.licenses.join(", ")}\n`;
    }

    if (version.sha) {
      output += `- **SHA256:** \`${version.sha}\`\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  }
}
