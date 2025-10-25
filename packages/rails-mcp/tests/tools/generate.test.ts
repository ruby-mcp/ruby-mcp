import { beforeEach, describe, expect, it, vi } from "vitest";
import { RailsClient } from "../../src/api/rails-client.js";
import { ProjectManager } from "../../src/project-manager.js";
import { GenerateTool } from "../../src/tools/generate.js";

describe("GenerateTool", () => {
  let tool: GenerateTool;
  let client: RailsClient;
  let projectManager: ProjectManager;

  beforeEach(() => {
    client = new RailsClient({ cacheEnabled: false });
    projectManager = new ProjectManager([{ name: "test", path: "/test/path" }]);
    tool = new GenerateTool({ client, projectManager });
  });

  describe("input validation", () => {
    it("should reject missing generator_name", async () => {
      const result = await tool.execute({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Validation failed");
      expect(result.content[0].text).toContain("Required");
    });

    it("should reject empty generator_name", async () => {
      const result = await tool.execute({ generator_name: "" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        "Generator name cannot be empty"
      );
    });

    it("should reject generator_name that is too long", async () => {
      const longName = "a".repeat(101);
      const result = await tool.execute({ generator_name: longName });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Generator name too long");
    });

    it("should accept valid generator_name", async () => {
      const result = await tool.execute({ generator_name: "model" });
      expect(result.isError).toBe(true);
      // Should fail on Rails project check, not validation
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

    it("should accept valid project name", async () => {
      const result = await tool.execute({
        generator_name: "model",
        project: "test",
      });
      expect(result.isError).toBe(true);
      // Will fail on Rails project check, but project name validation passes
      expect(result.content[0].text).toContain(
        "does not contain a Rails application"
      );
    });
  });

  describe("schema validation", () => {
    it("should accept valid arguments array", async () => {
      const result = await tool.execute({
        generator_name: "model",
        arguments: ["User", "name:string", "email:string"],
      });
      expect(result.isError).toBe(true);
      // Should fail on Rails check, not validation
      expect(result.content[0].text).not.toContain("Validation failed");
    });

    it("should accept valid options object", async () => {
      const result = await tool.execute({
        generator_name: "model",
        arguments: ["User"],
        options: {
          force: true,
          skip_migration: false,
          database: "postgresql",
        },
      });
      expect(result.isError).toBe(true);
      // Should fail on Rails check, not validation
      expect(result.content[0].text).not.toContain("Validation failed");
    });

    it("should accept empty arrays and objects for optional fields", async () => {
      const result = await tool.execute({
        generator_name: "model",
        arguments: [],
        options: {},
      });
      expect(result.isError).toBe(true);
      // Should fail on Rails check, not validation
      expect(result.content[0].text).not.toContain("Validation failed");
    });

    it("should default arguments and options when not provided", async () => {
      const result = await tool.execute({ generator_name: "model" });
      expect(result.isError).toBe(true);
      // Should fail on Rails check, not validation
      expect(result.content[0].text).not.toContain("Validation failed");
    });

    it("should accept string array options", async () => {
      const result = await tool.execute({
        generator_name: "controller",
        arguments: ["Posts"],
        options: {
          actions: ["index", "show", "create"],
        },
      });
      expect(result.isError).toBe(true);
      // Should fail on Rails check, not validation
      expect(result.content[0].text).not.toContain("Validation failed");
    });
  });

  describe("project resolution", () => {
    it("should use current directory when no project specified", async () => {
      const toolWithoutManager = new GenerateTool({ client });
      const result = await toolWithoutManager.execute({
        generator_name: "model",
      });
      expect(result.isError).toBe(true);
      // Should fail on Rails project check since we're not in a Rails project
      expect(result.content[0].text).toContain(
        "does not contain a Rails application"
      );
    });

    it("should resolve project path through project manager", async () => {
      const result = await tool.execute({
        generator_name: "model",
        project: "test",
      });
      expect(result.isError).toBe(true);
      // The error message should reference the resolved path
      expect(result.content[0].text).toContain("/test/path");
    });
  });

  describe("generator execution", () => {
    beforeEach(() => {
      // Mock checkRailsProject to return a valid Rails project
      vi.spyOn(client, "checkRailsProject").mockResolvedValue({
        isRailsProject: true,
        railsVersion: "7.0.0",
        rootPath: "/test/path",
        gemfilePath: "/test/path/Gemfile",
        hasRailsGem: true,
      });
    });

    it("should handle successful generator execution", async () => {
      // Mock generateFiles to return success
      vi.spyOn(client, "generateFiles").mockResolvedValue({
        success: true,
        data: {
          success: true,
          filesCreated: [
            "app/models/user.rb",
            "db/migrate/20240101_create_users.rb",
          ],
          filesModified: ["config/routes.rb"],
          output: "Generator executed successfully",
        },
      });

      const result = await tool.execute({
        generator_name: "model",
        arguments: ["User", "name:string"],
        options: {},
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Successfully executed");
      expect(result.content[0].text).toContain("model");
      expect(result.content[0].text).toContain("2 files created");
      expect(result.content[0].text).toContain("1 files modified");
    });

    it("should handle generator execution errors from client", async () => {
      // Mock generateFiles to return error
      vi.spyOn(client, "generateFiles").mockResolvedValue({
        success: false,
        error: "Generator not found",
      });

      const result = await tool.execute({
        generator_name: "invalid",
        arguments: [],
        options: {},
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Failed to execute generator");
      expect(result.content[0].text).toContain("Generator not found");
    });

    it("should handle generator failure with success=false", async () => {
      // Mock generateFiles to return a failure result
      vi.spyOn(client, "generateFiles").mockResolvedValue({
        success: true,
        data: {
          success: false,
          error: "Migration already exists",
          filesCreated: [],
          filesModified: [],
          output: "Error output",
        },
      });

      const result = await tool.execute({
        generator_name: "model",
        arguments: ["User"],
        options: {},
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Generator execution failed");
      expect(result.content[0].text).toContain("Migration already exists");
    });

    it("should format output with files created and modified", async () => {
      vi.spyOn(client, "generateFiles").mockResolvedValue({
        success: true,
        data: {
          success: true,
          filesCreated: ["app/controllers/posts_controller.rb"],
          filesModified: [
            "config/routes.rb",
            "test/controllers/posts_controller_test.rb",
          ],
          output: "Controller generated",
        },
      });

      const result = await tool.execute({
        generator_name: "controller",
        arguments: ["Posts", "index", "show"],
        options: { skip_routes: false },
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain("Files Created");
      expect(text).toContain("app/controllers/posts_controller.rb");
      expect(text).toContain("Files Modified");
      expect(text).toContain("config/routes.rb");
      expect(text).toContain("Command Output");
      expect(text).toContain("Controller generated");
    });

    it("should include execution summary with arguments and options", async () => {
      vi.spyOn(client, "generateFiles").mockResolvedValue({
        success: true,
        data: {
          success: true,
          filesCreated: ["app/models/user.rb"],
          filesModified: [],
          output: "",
        },
      });

      const result = await tool.execute({
        generator_name: "model",
        arguments: ["User", "name:string", "email:string"],
        options: { force: true, skip_migration: false },
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain("Execution Summary");
      expect(text).toContain("Generator: `model`");
      expect(text).toContain("Arguments:");
      expect(text).toContain("`User`");
      expect(text).toContain("`name:string`");
      expect(text).toContain("Options:");
      expect(text).toContain("--force");
      expect(text).toContain("--skip_migration");
    });

    it("should handle empty arguments and options in summary", async () => {
      vi.spyOn(client, "generateFiles").mockResolvedValue({
        success: true,
        data: {
          success: true,
          filesCreated: ["app/models/application_record.rb"],
          filesModified: [],
          output: "",
        },
      });

      const result = await tool.execute({
        generator_name: "application_record",
        arguments: [],
        options: {},
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain("Arguments: None");
      expect(text).toContain("Options: None");
    });

    it("should include metadata in structured output", async () => {
      vi.spyOn(client, "generateFiles").mockResolvedValue({
        success: true,
        data: {
          success: true,
          filesCreated: ["app/models/user.rb", "app/models/post.rb"],
          filesModified: ["config/routes.rb"],
          output: "Generated successfully",
        },
      });

      const result = await tool.execute({
        generator_name: "scaffold",
        arguments: ["Post", "title:string"],
        options: { force: true },
      });

      expect(result.isError).toBe(false);
      // The structured output should contain metadata (this is in the JSON part)
      // We can verify it by checking the text contains the right counts
      const text = result.content[0].text;
      expect(text).toContain("2 files created");
      expect(text).toContain("1 files modified");
    });

    it("should handle unexpected errors", async () => {
      // Mock checkRailsProject to throw an error
      vi.spyOn(client, "checkRailsProject").mockRejectedValue(
        new Error("Network timeout")
      );

      const result = await tool.execute({
        generator_name: "model",
        arguments: ["User"],
        options: {},
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Network timeout");
    });
  });

  describe("error handling", () => {
    it("should handle non-Error exceptions", async () => {
      vi.spyOn(client, "checkRailsProject").mockRejectedValue("String error");

      const result = await tool.execute({
        generator_name: "model",
        arguments: [],
        options: {},
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unknown error occurred");
    });

    it("should handle project resolution errors for non-Error objects", async () => {
      vi.spyOn(projectManager, "getProjectPath").mockImplementation(() => {
        throw "String error";
      });

      const result = await tool.execute({
        generator_name: "model",
        project: "test",
        arguments: [],
        options: {},
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unknown error");
    });
  });
});
