import { beforeEach, describe, expect, it, vi } from "vitest";
import { RailsClient } from "../../src/api/rails-client.js";
import { ProjectManager } from "../../src/project-manager.js";
import { DestroyTool } from "../../src/tools/destroy.js";

describe("DestroyTool - Validation", () => {
  let tool: DestroyTool;
  let client: RailsClient;
  let projectManager: ProjectManager;

  beforeEach(() => {
    client = new RailsClient({ cacheEnabled: false });
    projectManager = new ProjectManager([{ name: "test", path: "/test/path" }]);
    tool = new DestroyTool({ client, projectManager });
  });

  describe("input validation", () => {
    it("should reject missing generator_name", async () => {
      const result = await tool.execute({});
      expect(result.isError).toBe(true);
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

    it("should reject invalid option types", async () => {
      const result = await tool.execute({
        generator_name: "model",
        options: {
          invalid: 123, // number is not allowed
        },
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error:");
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
      const toolWithoutManager = new DestroyTool({ client });
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

  describe("execution", () => {
    it("should successfully destroy files", async () => {
      // Mock Rails project check
      client.checkRailsProject = vi.fn().mockResolvedValue({
        isRailsProject: true,
        railsVersion: "7.0.0",
        projectType: "application",
        rootPath: "/test/path",
      });

      // Mock successful destroy
      client.destroyFiles = vi.fn().mockResolvedValue({
        success: true,
        data: {
          success: true,
          filesRemoved: ["app/models/user.rb", "test/models/user_test.rb"],
          filesModified: ["db/schema.rb"],
          output: "Successfully destroyed model User",
          error: undefined,
        },
      });

      const result = await tool.execute({
        generator_name: "model",
        arguments: ["User"],
        project: "test",
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Successfully executed destroy");
      expect(result.content[0].text).toContain("app/models/user.rb");
      expect(result.content[0].text).toContain("Files Removed");
      expect(result.content[0].text).toContain("Files Modified");
    });

    it("should handle destroy command execution error", async () => {
      client.checkRailsProject = vi.fn().mockResolvedValue({
        isRailsProject: true,
        railsVersion: "7.0.0",
        projectType: "application",
        rootPath: "/test/path",
      });

      client.destroyFiles = vi.fn().mockResolvedValue({
        success: false,
        error: "Command not found",
        data: null,
      });

      const result = await tool.execute({
        generator_name: "model",
        arguments: ["User"],
        project: "test",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        "Failed to execute destroy command"
      );
      expect(result.content[0].text).toContain("Command not found");
    });

    it("should handle destroy command failure", async () => {
      client.checkRailsProject = vi.fn().mockResolvedValue({
        isRailsProject: true,
        railsVersion: "7.0.0",
        projectType: "application",
        rootPath: "/test/path",
      });

      client.destroyFiles = vi.fn().mockResolvedValue({
        success: true,
        data: {
          success: false,
          filesRemoved: [],
          filesModified: [],
          output: "Error output",
          error: "Could not find generator",
        },
      });

      const result = await tool.execute({
        generator_name: "invalid",
        arguments: ["Foo"],
        project: "test",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Destroy command failed");
      expect(result.content[0].text).toContain("Could not find generator");
      expect(result.content[0].text).toContain("Error output");
    });

    it("should handle unexpected errors", async () => {
      client.checkRailsProject = vi
        .fn()
        .mockRejectedValue(new Error("Unexpected error"));

      const result = await tool.execute({
        generator_name: "model",
        arguments: ["User"],
        project: "test",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unexpected error");
    });

    it("should include command output when present", async () => {
      client.checkRailsProject = vi.fn().mockResolvedValue({
        isRailsProject: true,
        railsVersion: "7.0.0",
        projectType: "application",
        rootPath: "/test/path",
      });

      client.destroyFiles = vi.fn().mockResolvedValue({
        success: true,
        data: {
          success: true,
          filesRemoved: ["app/models/user.rb"],
          filesModified: [],
          output: "Detailed command output here",
          error: undefined,
        },
      });

      const result = await tool.execute({
        generator_name: "model",
        arguments: ["User"],
        project: "test",
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Command Output");
      expect(result.content[0].text).toContain("Detailed command output here");
    });

    it("should format options and arguments in summary", async () => {
      client.checkRailsProject = vi.fn().mockResolvedValue({
        isRailsProject: true,
        railsVersion: "7.0.0",
        projectType: "application",
        rootPath: "/test/path",
      });

      client.destroyFiles = vi.fn().mockResolvedValue({
        success: true,
        data: {
          success: true,
          filesRemoved: ["app/controllers/posts_controller.rb"],
          filesModified: ["config/routes.rb"],
          output: "",
          error: undefined,
        },
      });

      const result = await tool.execute({
        generator_name: "controller",
        arguments: ["Posts", "index", "show"],
        options: { force: true, skip_routes: false },
        project: "test",
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Destruction Summary");
      expect(result.content[0].text).toContain("Arguments:");
      expect(result.content[0].text).toContain("`Posts`");
      expect(result.content[0].text).toContain("Options:");
      expect(result.content[0].text).toContain("--force");
    });

    it("should handle empty arguments and options", async () => {
      client.checkRailsProject = vi.fn().mockResolvedValue({
        isRailsProject: true,
        railsVersion: "7.0.0",
        projectType: "application",
        rootPath: "/test/path",
      });

      client.destroyFiles = vi.fn().mockResolvedValue({
        success: true,
        data: {
          success: true,
          filesRemoved: ["test.rb"],
          filesModified: [],
          output: "",
          error: undefined,
        },
      });

      const result = await tool.execute({
        generator_name: "helper",
        project: "test",
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Arguments: None");
      expect(result.content[0].text).toContain("Options: None");
    });
  });
});
