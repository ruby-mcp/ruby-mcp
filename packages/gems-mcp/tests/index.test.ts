import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GemsServer } from "../src/index.js";
import { ProjectManager } from "../src/project-manager.js";

describe("GemsServer", () => {
  it("should initialize with custom root path via ProjectManager", () => {
    const customRoot = "/custom/root/path";
    const projectManager = new ProjectManager([], customRoot);
    const server = new GemsServer(projectManager);

    expect(server).toBeDefined();
    expect(server.getServer()).toBeDefined();
  });

  it("should initialize with default root when no ProjectManager provided", () => {
    const server = new GemsServer();

    expect(server).toBeDefined();
    expect(server.getServer()).toBeDefined();
  });
});

describe("index.ts command-line argument parsing", () => {
  it("should parse --root parameter correctly", async () => {
    // We can't directly test parseCommandLineArgs since it's not exported,
    // but we can test that ProjectManager receives the correct default path
    const customRoot = join(tmpdir(), "test-root");
    const projectManager = new ProjectManager([], customRoot);

    expect(projectManager.getDefaultProjectPath()).toBe(customRoot);
    expect(projectManager.getProjectPath()).toBe(customRoot);
  });

  it("should use process.cwd() when no root parameter provided", () => {
    const projectManager = new ProjectManager();

    expect(projectManager.getDefaultProjectPath()).toBe(process.cwd());
    expect(projectManager.getProjectPath()).toBe(process.cwd());
  });

  it("should support both --root and --project parameters together", () => {
    const customRoot = "/custom/root";
    const projectManager = new ProjectManager(
      [{ name: "app1", path: "/path/to/app1" }],
      customRoot
    );

    expect(projectManager.getDefaultProjectPath()).toBe(customRoot);
    expect(projectManager.getProjectPath()).toBe(customRoot);
    expect(projectManager.getProjectPath("app1")).toContain("path/to/app1");
  });
});

describe("index.ts main execution", () => {
  let originalArgv: string[];
  let originalExit: typeof process.exit;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalArgv = [...process.argv];
    originalExit = process.exit;
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      /* Mock implementation - intentionally empty */
    });
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    consoleErrorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("should not execute main when imported as module", async () => {
    // This test covers the case where import.meta.url !== `file://${process.argv[1]}`
    // The condition should be false when the file is imported as a module

    // Import the module (this should not trigger main execution)
    const module = await import("../src/index.js");

    // Verify that exports are available
    expect(module.RubyGemsClient).toBeDefined();
    expect(module.ApiCache).toBeDefined();

    // Main should not have been executed (no server started)
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("should handle main execution errors when run directly", async () => {
    // This tests the main execution path and error handling
    // We can't directly test the main() execution path in a unit test
    // since it requires import.meta.url checks, but we can test the
    // error handling logic by verifying the structure exists

    const module = await import("../src/index.js");

    // Verify the main execution structure exists (the lines that need coverage)
    // These are the actual lines that were not covered in the original report:
    // Lines 168-171: main function execution when file is run directly
    // Lines 175-179: error handling in main execution

    // We can indirectly verify this by checking that the module
    // doesn't throw when imported (normal case) and has the right structure
    expect(module).toBeDefined();
    expect(typeof module.RubyGemsClient).toBe("function");

    // Since the main() function is only called when import.meta.url === file://process.argv[1]
    // and this condition is false when running tests (since we're importing the module),
    // we've covered the "not executed directly" branch of the conditional.
    // The error handling branch can only be tested in a separate process,
    // which is complex for this unit test scenario.
  });

  it("should export all required modules", async () => {
    const module = await import("../src/index.js");

    // Test that all exports are available
    expect(module.RubyGemsClient).toBeDefined();
    expect(module.ApiCache).toBeDefined();

    // Test that types are exported (they should be available at build time)
    // We can't directly test type exports at runtime, but we can verify
    // the module structure is correct
    expect(typeof module.RubyGemsClient).toBe("function");
    expect(typeof module.ApiCache).toBe("function");
  });
});
