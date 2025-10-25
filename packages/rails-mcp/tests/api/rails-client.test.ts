import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RailsClient } from "../../src/api/rails-client.js";

vi.mock("child_process");

// Type for our mocked child process
type MockChildProcess = EventEmitter & {
  stdout: EventEmitter;
  stderr: EventEmitter;
};

describe("RailsClient", () => {
  let client: RailsClient;
  let tempDir: string;

  beforeEach(async () => {
    client = new RailsClient({ cacheEnabled: false });
    tempDir = join(tmpdir(), `rails-client-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with default options", () => {
      const c = new RailsClient();
      expect(c).toBeDefined();
    });

    it("should initialize with custom options", () => {
      const c = new RailsClient({
        timeout: 60000,
        cacheEnabled: false,
        cacheTtl: 10000,
      });
      expect(c).toBeDefined();
    });
  });

  describe("checkRailsProject", () => {
    it("should return false for directory without Gemfile", async () => {
      const result = await client.checkRailsProject(tempDir);
      expect(result.isRailsProject).toBe(false);
      expect(result.rootPath).toBe(tempDir);
    });

    it("should detect Gemfile but not Rails app", async () => {
      // Create Gemfile but no config/application.rb
      await fs.writeFile(
        join(tempDir, "Gemfile"),
        'source "https://rubygems.org"'
      );

      const result = await client.checkRailsProject(tempDir);
      expect(result.isRailsProject).toBe(true);
      expect(result.rootPath).toBe(tempDir);
      expect(result.projectType).toBe("gem");
    });

    it("should detect Rails application", async () => {
      // Create Gemfile and config/application.rb
      await fs.writeFile(
        join(tempDir, "Gemfile"),
        'source "https://rubygems.org"'
      );
      await fs.mkdir(join(tempDir, "config"), { recursive: true });
      await fs.writeFile(
        join(tempDir, "config", "application.rb"),
        "module MyApp\n  class Application < Rails::Application\n  end\nend"
      );

      const result = await client.checkRailsProject(tempDir);
      expect(result.isRailsProject).toBe(true);
      expect(result.projectType).toBe("application");
    });

    it("should detect Rails engine", async () => {
      // Create Gemfile and config/application.rb with Engine
      await fs.writeFile(
        join(tempDir, "Gemfile"),
        'source "https://rubygems.org"'
      );
      await fs.mkdir(join(tempDir, "config"), { recursive: true });
      await fs.writeFile(
        join(tempDir, "config", "application.rb"),
        "module MyEngine\n  class Engine < Rails::Engine\n  end\nend"
      );

      const result = await client.checkRailsProject(tempDir);
      expect(result.isRailsProject).toBe(true);
      expect(result.projectType).toBe("engine");
    });

    it("should extract Rails version from Gemfile.lock", async () => {
      await fs.writeFile(
        join(tempDir, "Gemfile"),
        'source "https://rubygems.org"'
      );
      await fs.writeFile(
        join(tempDir, "Gemfile.lock"),
        "GEM\n  specs:\n    rails (7.0.4)\n      actionpack (= 7.0.4)"
      );

      const result = await client.checkRailsProject(tempDir);
      expect(result.isRailsProject).toBe(true);
      expect(result.railsVersion).toBe("7.0.4");
    });

    it("should handle missing Gemfile.lock gracefully", async () => {
      await fs.writeFile(
        join(tempDir, "Gemfile"),
        'source "https://rubygems.org"'
      );

      const result = await client.checkRailsProject(tempDir);
      expect(result.isRailsProject).toBe(true);
      expect(result.railsVersion).toBeUndefined();
    });

    it("should handle errors gracefully", async () => {
      const result = await client.checkRailsProject("/nonexistent/path");
      expect(result.isRailsProject).toBe(false);
    });
  });

  describe("listGenerators", () => {
    it("should return error for non-Rails project", async () => {
      const result = await client.listGenerators(tempDir);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Not a Rails project");
    });
  });

  describe("getGeneratorHelp", () => {
    it("should return error for non-Rails project", async () => {
      const result = await client.getGeneratorHelp("model", tempDir);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Not a Rails project");
    });
  });

  describe("generateFiles", () => {
    it("should return error for non-Rails project", async () => {
      const result = await client.generateFiles("model", ["User"], {}, tempDir);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Not a Rails project");
      expect(result.data.filesCreated).toEqual([]);
      expect(result.data.filesModified).toEqual([]);
    });
  });

  describe("destroyFiles", () => {
    it("should return error for non-Rails project", async () => {
      const result = await client.destroyFiles("model", ["User"], {}, tempDir);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Not a Rails project");
      expect(result.data.filesRemoved).toEqual([]);
      expect(result.data.filesModified).toEqual([]);
    });

    it("should handle spawn error event", async () => {
      // Use a separate temp directory for this test to avoid pollution
      const errorTestDir = join(tmpdir(), `rails-error-test-${Date.now()}`);
      await fs.mkdir(errorTestDir, { recursive: true });

      // Create Gemfile to make it look like a Rails project
      await fs.writeFile(join(errorTestDir, "Gemfile"), 'gem "rails"');
      await fs.writeFile(
        join(errorTestDir, "config.ru"),
        'require ::File.expand_path("../config/environment", __FILE__)'
      );

      const mockChild = new EventEmitter() as MockChildProcess;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockChild);

      const promise = client.destroyFiles("model", ["User"], {}, errorTestDir);

      setTimeout(() => {
        mockChild.emit("error", new Error("ENOENT: command not found"));
      }, 10);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to execute rails command");
      expect(result.error).toContain("ENOENT");
      expect(result.data.filesRemoved).toEqual([]);
      expect(result.data.filesModified).toEqual([]);
    });
  });

  describe("cache management", () => {
    it("should clear cache", async () => {
      const clientWithCache = new RailsClient({ cacheEnabled: true });
      clientWithCache.clearCache();
      // Cache should be cleared (no way to directly verify, but should not throw)
      expect(clientWithCache).toBeDefined();
    });

    it("should use cache when enabled", async () => {
      const clientWithCache = new RailsClient({ cacheEnabled: true });

      // Create a Rails project
      await fs.writeFile(
        join(tempDir, "Gemfile"),
        'source "https://rubygems.org"'
      );
      await fs.mkdir(join(tempDir, "config"), { recursive: true });
      await fs.writeFile(
        join(tempDir, "config", "application.rb"),
        "class Application < Rails::Application; end"
      );

      // Mock spawn for listGenerators
      const mockChild = new EventEmitter() as MockChildProcess;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockChild);

      // First call - should execute command
      const promise1 = clientWithCache.listGenerators(tempDir);

      // Simulate command output
      setTimeout(() => {
        mockChild.stdout.emit(
          "data",
          "Please choose a generator below\nmodel\ncontroller\n"
        );
        mockChild.emit("close", 0);
      }, 10);

      const result1 = await promise1;
      expect(result1.success).toBe(true);

      // Second call - should use cache (spawn not called again)
      vi.mocked(spawn).mockClear();
      const result2 = await clientWithCache.listGenerators(tempDir);
      expect(result2.success).toBe(true);
      expect(vi.mocked(spawn)).not.toHaveBeenCalled();
    });
  });

  describe("listGenerators with mocked Rails", () => {
    beforeEach(async () => {
      // Create a Rails project
      await fs.writeFile(
        join(tempDir, "Gemfile"),
        'source "https://rubygems.org"'
      );
      await fs.mkdir(join(tempDir, "config"), { recursive: true });
      await fs.writeFile(
        join(tempDir, "config", "application.rb"),
        "class Application < Rails::Application; end"
      );
    });

    it("should parse generators list successfully", async () => {
      const mockChild = new EventEmitter() as MockChildProcess;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockChild);

      const promise = client.listGenerators(tempDir);

      setTimeout(() => {
        mockChild.stdout.emit(
          "data",
          `
Please choose a generator below

Rails:
  model
  controller
  scaffold
  migration

Active Record:
  active_record:model
        `
        );
        mockChild.emit("close", 0);
      }, 10);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.some((g) => g.name === "model")).toBe(true);
    });

    it("should handle generators with namespaces", async () => {
      const mockChild = new EventEmitter() as MockChildProcess;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockChild);

      const promise = client.listGenerators(tempDir);

      setTimeout(() => {
        mockChild.stdout.emit(
          "data",
          "Please choose a generator below\nactive_record:model\nrspec:model\n"
        );
        mockChild.emit("close", 0);
      }, 10);

      const result = await promise;

      expect(result.success).toBe(true);
      const arModel = result.data.find((g) => g.name === "active_record:model");
      expect(arModel).toBeDefined();
      expect(arModel?.namespace).toBe("active_record");
    });

    it("should handle command errors", async () => {
      const mockChild = new EventEmitter() as MockChildProcess;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockChild);

      const promise = client.listGenerators(tempDir);

      setTimeout(() => {
        mockChild.stderr.emit("data", "Error: Rails not found");
        mockChild.emit("close", 1);
      }, 10);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle command timeout", async () => {
      const clientWithTimeout = new RailsClient({
        cacheEnabled: false,
        timeout: 100,
      });

      const mockChild = new EventEmitter() as MockChildProcess;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();
      mockChild.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockChild);

      const promise = clientWithTimeout.listGenerators(tempDir);

      // Don't emit any events - let it timeout

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain("timed out");
      expect(mockChild.kill).toHaveBeenCalled();
    });
  });

  describe("getGeneratorHelp with mocked Rails", () => {
    beforeEach(async () => {
      await fs.writeFile(
        join(tempDir, "Gemfile"),
        'source "https://rubygems.org"'
      );
      await fs.mkdir(join(tempDir, "config"), { recursive: true });
      await fs.writeFile(
        join(tempDir, "config", "application.rb"),
        "class Application < Rails::Application; end"
      );
    });

    it("should parse generator help successfully", async () => {
      const mockChild = new EventEmitter() as MockChildProcess;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockChild);

      const promise = client.getGeneratorHelp("model", tempDir);

      setTimeout(() => {
        mockChild.stdout.emit(
          "data",
          `Generates a new model

Usage: rails generate model NAME [field:type]

Options:
    -s, --skip-migration    Skip migration file
    --force                 Overwrite existing files
        `
        );
        mockChild.emit("close", 0);
      }, 10);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data.name).toBe("model");
      expect(result.data.description).toContain("Generates a new model");
      expect(result.data.usage).toContain("rails generate model");
      expect(result.data.options.length).toBeGreaterThan(0);
    });
  });

  describe("generateFiles with mocked Rails", () => {
    beforeEach(async () => {
      await fs.writeFile(
        join(tempDir, "Gemfile"),
        'source "https://rubygems.org"'
      );
      await fs.mkdir(join(tempDir, "config"), { recursive: true });
      await fs.writeFile(
        join(tempDir, "config", "application.rb"),
        "class Application < Rails::Application; end"
      );
    });

    it("should parse generate output successfully", async () => {
      const mockChild = new EventEmitter() as MockChildProcess;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockChild);

      const promise = client.generateFiles(
        "model",
        ["User", "name:string"],
        {},
        tempDir
      );

      setTimeout(() => {
        mockChild.stdout.emit(
          "data",
          `      create  app/models/user.rb
      create  db/migrate/20240101000000_create_users.rb
      inject config/routes.rb
        `
        );
        mockChild.emit("close", 0);
      }, 10);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data.filesCreated).toContain("app/models/user.rb");
      expect(result.data.filesCreated).toContain(
        "db/migrate/20240101000000_create_users.rb"
      );
      expect(result.data.filesModified).toContain("config/routes.rb");
      expect(result.data.success).toBe(true);
    });

    it("should handle boolean options", async () => {
      const mockChild = new EventEmitter() as MockChildProcess;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockChild);

      const promise = client.generateFiles(
        "model",
        ["User"],
        {
          skip_migration: true,
          force: false,
        },
        tempDir
      );

      setTimeout(() => {
        mockChild.stdout.emit("data", "create  app/models/user.rb\n");
        mockChild.emit("close", 0);
      }, 10);

      const result = await promise;

      // Verify the command completed successfully
      expect(result.success).toBe(true);
      expect(result.data.filesCreated).toContain("app/models/user.rb");

      // Verify the command included the options
      expect(vi.mocked(spawn)).toHaveBeenCalledWith(
        "rails",
        expect.arrayContaining(["--skip_migration", "--no-force"]),
        expect.any(Object)
      );
    });

    it("should handle array options", async () => {
      const mockChild = new EventEmitter() as MockChildProcess;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockChild);

      const promise = client.generateFiles(
        "controller",
        ["Posts"],
        {
          actions: ["index", "show"],
        },
        tempDir
      );

      setTimeout(() => {
        mockChild.stdout.emit(
          "data",
          "create  app/controllers/posts_controller.rb\n"
        );
        mockChild.emit("close", 0);
      }, 10);

      await promise;

      expect(vi.mocked(spawn)).toHaveBeenCalledWith(
        "rails",
        expect.arrayContaining(["--actions", "index,show"]),
        expect.any(Object)
      );
    });

    it("should handle string options", async () => {
      const mockChild = new EventEmitter() as MockChildProcess;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockChild);

      const promise = client.generateFiles(
        "model",
        ["User"],
        {
          database: "postgresql",
        },
        tempDir
      );

      setTimeout(() => {
        mockChild.stdout.emit("data", "create  app/models/user.rb\n");
        mockChild.emit("close", 0);
      }, 10);

      await promise;

      expect(vi.mocked(spawn)).toHaveBeenCalledWith(
        "rails",
        expect.arrayContaining(["--database", "postgresql"]),
        expect.any(Object)
      );
    });
  });

  describe("destroyFiles with mocked Rails", () => {
    beforeEach(async () => {
      await fs.writeFile(
        join(tempDir, "Gemfile"),
        'source "https://rubygems.org"'
      );
      await fs.mkdir(join(tempDir, "config"), { recursive: true });
      await fs.writeFile(
        join(tempDir, "config", "application.rb"),
        "class Application < Rails::Application; end"
      );
    });

    it("should parse destroy output successfully", async () => {
      const mockChild = new EventEmitter() as MockChildProcess;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockChild);

      const promise = client.destroyFiles("model", ["User"], {}, tempDir);

      setTimeout(() => {
        mockChild.stdout.emit(
          "data",
          `      remove  app/models/user.rb
      remove  db/migrate/20240101000000_create_users.rb
      revoke  config/routes.rb
        `
        );
        mockChild.emit("close", 0);
      }, 10);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data.filesRemoved).toContain("app/models/user.rb");
      expect(result.data.filesRemoved).toContain(
        "db/migrate/20240101000000_create_users.rb"
      );
      expect(result.data.success).toBe(true);
    });

    it("should handle gsub action in destroy output", async () => {
      const mockChild = new EventEmitter() as MockChildProcess;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockChild);

      const promise = client.destroyFiles("scaffold", ["Post"], {}, tempDir);

      setTimeout(() => {
        mockChild.stdout.emit(
          "data",
          `      remove  app/models/post.rb
      gsub config/routes.rb
        `
        );
        mockChild.emit("close", 0);
      }, 10);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data.filesRemoved).toContain("app/models/post.rb");
      expect(result.data.filesModified).toContain("config/routes.rb");
      expect(result.data.success).toBe(true);
    });
  });
});
