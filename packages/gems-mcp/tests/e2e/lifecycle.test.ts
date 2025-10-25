import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GemsServer } from "../../src/index.js";

describe("Server Lifecycle E2E Tests", () => {
  let server: GemsServer;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let originalListeners: {
    uncaughtException: NodeJS.UncaughtExceptionListener[];
    unhandledRejection: NodeJS.UnhandledRejectionListener[];
    SIGINT: NodeJS.SignalsListener[];
    SIGTERM: NodeJS.SignalsListener[];
  };

  beforeEach(() => {
    originalListeners = {
      uncaughtException: [...process.listeners("uncaughtException")],
      unhandledRejection: [...process.listeners("unhandledRejection")],
      SIGINT: [...process.listeners("SIGINT")],
      SIGTERM: [...process.listeners("SIGTERM")],
    };

    process.removeAllListeners("uncaughtException");
    process.removeAllListeners("unhandledRejection");
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");

    server = new GemsServer();
    processExitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      /* Mock implementation - intentionally empty */
    }) as never);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      /* Mock implementation - intentionally empty */
    });
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {
      /* Mock implementation - intentionally empty */
    });
  });

  afterEach(() => {
    if (server) {
      const client = server.getClient();
      client.clearCache();
    }

    process.removeAllListeners("uncaughtException");
    process.removeAllListeners("unhandledRejection");
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");

    for (const listener of originalListeners.uncaughtException) {
      process.on("uncaughtException", listener);
    }
    for (const listener of originalListeners.unhandledRejection) {
      process.on("unhandledRejection", listener);
    }
    for (const listener of originalListeners.SIGINT) {
      process.on("SIGINT", listener);
    }
    for (const listener of originalListeners.SIGTERM) {
      process.on("SIGTERM", listener);
    }

    processExitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe("Server Startup", () => {
    it("should start server with stdio transport", async () => {
      const connectSpy = vi
        .spyOn(server.getServer(), "connect")
        .mockResolvedValue();

      await server.start();

      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(expect.any(StdioServerTransport));
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Gems MCP Server running on stdio"
      );

      connectSpy.mockRestore();
    });
  });

  describe("Error Handling", () => {
    it("should handle uncaught exceptions", () => {
      const error = new Error("Test uncaught exception");

      process.emit("uncaughtException", error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Uncaught Exception]",
        error
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle unhandled promise rejections", () => {
      const reason = "Test rejection reason";
      const promise = Promise.reject(reason).catch(() => {
        /* Intentionally empty to prevent unhandled rejection */
      });

      process.emit("unhandledRejection", reason, promise);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Unhandled Rejection]",
        reason,
        "at",
        promise
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("Graceful Shutdown", () => {
    it("should handle SIGINT signal", async () => {
      const clearCacheSpy = vi.spyOn(server.getClient(), "clearCache");

      process.emit("SIGINT");

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Received SIGINT, shutting down gracefully..."
      );
      expect(clearCacheSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith("Cleanup completed");
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it("should handle SIGTERM signal", async () => {
      const clearCacheSpy = vi.spyOn(server.getClient(), "clearCache");

      process.emit("SIGTERM");

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Received SIGTERM, shutting down gracefully..."
      );
      expect(clearCacheSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith("Cleanup completed");
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it("should handle cleanup errors gracefully", async () => {
      const clearCacheSpy = vi
        .spyOn(server.getClient(), "clearCache")
        .mockImplementation(() => {
          throw new Error("Cleanup error");
        });

      process.emit("SIGINT");

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(clearCacheSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error during cleanup:",
        expect.any(Error)
      );
      expect(processExitSpy).toHaveBeenCalledWith(0);

      clearCacheSpy.mockRestore();
    });
  });

  describe("Cache Management", () => {
    it("should initialize client with caching enabled", () => {
      const client = server.getClient();
      expect(client).toBeDefined();
      expect(() => client.clearCache()).not.toThrow();
    });

    it("should clear cache on cleanup", async () => {
      const client = server.getClient();
      const clearCacheSpy = vi.spyOn(client, "clearCache");

      process.emit("SIGINT");

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(clearCacheSpy).toHaveBeenCalled();

      clearCacheSpy.mockRestore();
    });
  });

  describe("Process Event Listeners", () => {
    it("should register all required process event listeners", () => {
      const listeners = {
        uncaughtException: process.listeners("uncaughtException"),
        unhandledRejection: process.listeners("unhandledRejection"),
        SIGINT: process.listeners("SIGINT"),
        SIGTERM: process.listeners("SIGTERM"),
      };

      expect(listeners.uncaughtException.length).toBeGreaterThan(0);
      expect(listeners.unhandledRejection.length).toBeGreaterThan(0);
      expect(listeners.SIGINT.length).toBeGreaterThan(0);
      expect(listeners.SIGTERM.length).toBeGreaterThan(0);
    });
  });

  describe("Server State", () => {
    it("should expose server instance for testing", () => {
      const mcpServer = server.getServer();
      expect(mcpServer).toBeDefined();
      expect(mcpServer.constructor.name).toBe("McpServer");
    });

    it("should expose client instance for testing", () => {
      const client = server.getClient();
      expect(client).toBeDefined();
      expect(client.constructor.name).toBe("RubyGemsClient");
    });
  });
});
