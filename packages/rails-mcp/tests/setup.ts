/**
 * Test setup file for Rails MCP tests
 */

import { afterAll, afterEach, beforeAll, vi } from "vitest";

// Child process mocks are handled per test file

// Mock fs for file system operations in tests
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    promises: {
      ...actual.promises,
      stat: vi.fn(),
      access: vi.fn(),
      readFile: vi.fn(),
      mkdtemp: vi.fn(),
      rm: vi.fn(),
    },
  };
});

beforeAll(() => {
  // Setup global test environment
});

afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks();
});

afterAll(() => {
  // Cleanup after all tests
  vi.restoreAllMocks();
});
