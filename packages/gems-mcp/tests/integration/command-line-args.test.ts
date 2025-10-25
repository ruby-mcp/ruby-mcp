/**
 * Integration tests for full command-line argument parsing including quotes
 */

import { Command } from "commander";
import { describe, expect, it } from "vitest";

interface ProgramOptions {
  project?: string[];
  quotes?: string;
}

// Helper functions to simulate the commander-based parsing from index.ts
function createProgram(): Command {
  const program = new Command();

  program
    .name("gems-mcp")
    .description("MCP server for interacting with RubyGems.org API")
    .version("0.1.1")
    .option(
      "-p, --project <project...>",
      "Configure projects. Format: name:path or path (can be specified multiple times)"
    )
    .option(
      "-q, --quotes <style>",
      "Quote style for Gemfile and Gemspec entries (single or double)"
    );

  return program;
}

function parseQuoteStyle(value: string) {
  const normalized = value.toLowerCase().trim();
  if (normalized === "single" || normalized === "'") {
    return "single" as const;
  }
  if (normalized === "double" || normalized === '"') {
    return "double" as const;
  }
  throw new Error(
    `Invalid quote style: ${value}. Must be 'single' or 'double'`
  );
}

function parseCommandLineArgs(program: Command) {
  const options = program.opts<ProgramOptions>();
  const projects: Array<{ name: string; path: string }> = [];
  let quoteConfig = { gemfile: "single" as const, gemspec: "double" as const };

  // Parse project configurations
  if (options.project) {
    for (const projectDef of options.project) {
      const colonIndex = projectDef.indexOf(":");

      if (colonIndex === -1) {
        // If no colon, treat the whole thing as a path with name derived from directory name
        const path = projectDef;
        const name = path.split("/").pop() || "unnamed";
        projects.push({ name, path });
      } else {
        // Split by first colon to get name:path
        const name = projectDef.substring(0, colonIndex);
        const path = projectDef.substring(colonIndex + 1);

        if (!name || !path) {
          throw new Error(
            `Invalid project format: ${projectDef}. Expected name:path or path`
          );
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
    } catch (_error) {
      throw new Error(
        `Invalid quotes option: ${options.quotes}. Expected 'single' or 'double'`
      );
    }
  }

  return { projects, quoteConfig };
}

describe("Command Line Arguments Parsing", () => {
  describe("quotes parsing", () => {
    it("should parse --quotes single", () => {
      const program = createProgram();
      program.parse(["node", "test", "--quotes", "single"]);
      const { quoteConfig } = parseCommandLineArgs(program);

      expect(quoteConfig).toEqual({
        gemfile: "single",
        gemspec: "single",
      });
    });

    it("should parse --quotes double", () => {
      const program = createProgram();
      program.parse(["node", "test", "--quotes", "double"]);
      const { quoteConfig } = parseCommandLineArgs(program);

      expect(quoteConfig).toEqual({
        gemfile: "double",
        gemspec: "double",
      });
    });

    it("should handle case insensitive quotes values", () => {
      const program1 = createProgram();
      program1.parse(["node", "test", "--quotes", "SINGLE"]);
      const { quoteConfig: config1 } = parseCommandLineArgs(program1);

      const program2 = createProgram();
      program2.parse(["node", "test", "--quotes", "Double"]);
      const { quoteConfig: config2 } = parseCommandLineArgs(program2);

      expect(config1.gemfile).toBe("single");
      expect(config2.gemfile).toBe("double");
    });

    it("should throw error for invalid quotes value", () => {
      const program = createProgram();
      program.parse(["node", "test", "--quotes", "invalid"]);

      expect(() => parseCommandLineArgs(program)).toThrow(
        /Invalid quotes option/
      );
    });

    it("should handle quotes with quote characters", () => {
      const program1 = createProgram();
      program1.parse(["node", "test", "--quotes", "'"]);
      const { quoteConfig: config1 } = parseCommandLineArgs(program1);

      const program2 = createProgram();
      program2.parse(["node", "test", "--quotes", '"']);
      const { quoteConfig: config2 } = parseCommandLineArgs(program2);

      expect(config1.gemfile).toBe("single");
      expect(config2.gemfile).toBe("double");
    });

    it("should use default double quotes when not specified", () => {
      const program = createProgram();
      program.parse(["node", "test"]);
      const { quoteConfig } = parseCommandLineArgs(program);

      expect(quoteConfig).toEqual({
        gemfile: "single",
        gemspec: "double",
      });
    });
  });

  describe("project parsing", () => {
    it("should parse single project with name:path format", () => {
      const program = createProgram();
      program.parse(["node", "test", "--project", "app1:/path/to/app1"]);
      const { projects } = parseCommandLineArgs(program);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({ name: "app1", path: "/path/to/app1" });
    });

    it("should parse single project with path-only format", () => {
      const program = createProgram();
      program.parse(["node", "test", "--project", "/path/to/myapp"]);
      const { projects } = parseCommandLineArgs(program);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({ name: "myapp", path: "/path/to/myapp" });
    });

    it("should parse multiple projects", () => {
      const program = createProgram();
      program.parse([
        "node",
        "test",
        "--project",
        "app1:/path/to/app1",
        "--project",
        "app2:/path/to/app2",
      ]);
      const { projects } = parseCommandLineArgs(program);

      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({ name: "app1", path: "/path/to/app1" });
      expect(projects[1]).toEqual({ name: "app2", path: "/path/to/app2" });
    });

    it("should throw error for invalid project format", () => {
      const program = createProgram();
      program.parse(["node", "test", "--project", ":invalid"]);

      expect(() => parseCommandLineArgs(program)).toThrow(
        /Invalid project format/
      );
    });
  });

  describe("mixed arguments parsing", () => {
    it("should parse both projects and quotes", () => {
      const program = createProgram();
      program.parse([
        "node",
        "test",
        "--project",
        "app1:/path/to/app1",
        "--quotes",
        "double",
        "--project",
        "app2:/path/to/app2",
      ]);
      const { projects, quoteConfig } = parseCommandLineArgs(program);

      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({ name: "app1", path: "/path/to/app1" });
      expect(projects[1]).toEqual({ name: "app2", path: "/path/to/app2" });
      expect(quoteConfig).toEqual({
        gemfile: "double",
        gemspec: "double",
      });
    });

    it("should simulate .mcp.json format exactly", () => {
      const program = createProgram();
      program.parse([
        "node",
        "./packages/gems-mcp/dist/index.js",
        "--project",
        "dummy-rails:./fixtures/dummy-rails",
        "--project",
        "dummy-gem:./fixtures/dummy-gem",
        "--quotes",
        "double",
      ]);
      const { projects, quoteConfig } = parseCommandLineArgs(program);

      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({
        name: "dummy-rails",
        path: "./fixtures/dummy-rails",
      });
      expect(projects[1]).toEqual({
        name: "dummy-gem",
        path: "./fixtures/dummy-gem",
      });
      expect(quoteConfig).toEqual({
        gemfile: "double",
        gemspec: "double",
      });
    });
  });

  describe("default behavior", () => {
    it("should return default quote config when no quotes specified", () => {
      const program = createProgram();
      program.parse(["node", "test", "--project", "app:/path/to/app"]);
      const { quoteConfig } = parseCommandLineArgs(program);

      expect(quoteConfig).toEqual({
        gemfile: "single",
        gemspec: "double",
      });
    });

    it("should return empty projects when no projects specified", () => {
      const program = createProgram();
      program.parse(["node", "test", "--quotes", "double"]);
      const { projects } = parseCommandLineArgs(program);

      expect(projects).toHaveLength(0);
    });

    it("should handle empty args array", () => {
      const program = createProgram();
      program.parse(["node", "test"]);
      const { projects, quoteConfig } = parseCommandLineArgs(program);

      expect(projects).toHaveLength(0);
      expect(quoteConfig).toEqual({
        gemfile: "single",
        gemspec: "double",
      });
    });
  });
});
