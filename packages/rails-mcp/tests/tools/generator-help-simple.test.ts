import { beforeEach, describe, expect, it, vi } from "vitest";
import { RailsClient } from "../../src/api/rails-client.js";
import { ProjectManager } from "../../src/project-manager.js";
import { GeneratorHelpTool } from "../../src/tools/generator-help.js";

describe("GeneratorHelpTool - Validation", () => {
  let tool: GeneratorHelpTool;
  let client: RailsClient;
  let projectManager: ProjectManager;

  beforeEach(() => {
    client = new RailsClient({ cacheEnabled: false });
    projectManager = new ProjectManager([{ name: "test", path: "/test/path" }]);
    tool = new GeneratorHelpTool({ client, projectManager });
  });

  describe("input validation", () => {
    it("should require generator_name", async () => {
      const result = await tool.execute({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Validation failed");
      expect(result.content[0].text).toContain("Required");
    });

    it("should accept valid generator_name", async () => {
      const result = await tool.execute({ generator_name: "model" });
      expect(result.isError).toBe(true);
      // Will fail on Rails project check, but validation passes
      expect(result.content[0].text).toContain(
        "does not contain a Rails application"
      );
    });

    it("should reject invalid project name", async () => {
      const result = await tool.execute({
        generator_name: "model",
        project: "nonexistent",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        "Project not found: nonexistent"
      );
    });
  });

  describe("schema validation", () => {
    it("should validate generator_name is string", async () => {
      const result = await tool.execute({ generator_name: 123 });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Validation failed");
    });

    it("should validate generator_name is not empty", async () => {
      const result = await tool.execute({ generator_name: "" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Validation failed");
      expect(result.content[0].text).toContain(
        "Generator name cannot be empty"
      );
    });
  });

  describe("execution", () => {
    it("should successfully get generator help", async () => {
      client.checkRailsProject = vi.fn().mockResolvedValue({
        isRailsProject: true,
        railsVersion: "7.0.0",
        projectType: "application",
        rootPath: "/test/path",
      });

      client.getGeneratorHelp = vi.fn().mockResolvedValue({
        success: true,
        data: {
          name: "model",
          description: "Generate a new model",
          usage: "rails generate model NAME [field:type]",
          arguments: [
            { name: "NAME", description: "Model name", required: true },
            {
              name: "field:type",
              description: "Field definitions",
              required: false,
            },
          ],
          options: [
            {
              name: "skip-migration",
              description: "Skip migration file",
              type: "boolean",
              aliases: ["-s"],
            },
            {
              name: "force",
              description: "Overwrite existing files",
              type: "boolean",
            },
          ],
        },
      });

      const result = await tool.execute({
        generator_name: "model",
        project: "test",
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Generator: model");
      expect(result.content[0].text).toContain("Generate a new model");
      expect(result.content[0].text).toContain("Usage:");
      expect(result.content[0].text).toContain("Arguments:");
      expect(result.content[0].text).toContain("`NAME` (required)");
      expect(result.content[0].text).toContain("Options:");
      expect(result.content[0].text).toContain("`--skip-migration`");
    });

    it("should handle get generator help execution error", async () => {
      client.checkRailsProject = vi.fn().mockResolvedValue({
        isRailsProject: true,
        railsVersion: "7.0.0",
        projectType: "application",
        rootPath: "/test/path",
      });

      client.getGeneratorHelp = vi.fn().mockResolvedValue({
        success: false,
        error: "Generator not found",
        data: null,
      });

      const result = await tool.execute({
        generator_name: "nonexistent",
        project: "test",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        "Failed to get help for generator"
      );
      expect(result.content[0].text).toContain("Generator not found");
    });

    it("should handle unexpected errors", async () => {
      client.checkRailsProject = vi
        .fn()
        .mockRejectedValue(new Error("Unexpected error"));

      const result = await tool.execute({ generator_name: "model" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unexpected error");
    });

    it("should handle generator help with no options", async () => {
      client.checkRailsProject = vi.fn().mockResolvedValue({
        isRailsProject: true,
        railsVersion: "7.0.0",
        projectType: "application",
        rootPath: "/test/path",
      });

      client.getGeneratorHelp = vi.fn().mockResolvedValue({
        success: true,
        data: {
          name: "simple",
          description: "Simple generator",
          usage: "rails generate simple",
          arguments: [],
          options: [],
        },
      });

      const result = await tool.execute({
        generator_name: "simple",
        project: "test",
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Generator: simple");
    });
  });
});
