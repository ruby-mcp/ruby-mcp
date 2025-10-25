/**
 * Test setup and configuration
 */

import { http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import { rubygemsHandlers } from "./fixtures/rubygems-handlers.js";

// Setup MSW server
export const server = setupServer(...rubygemsHandlers);

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: "warn" });

  // Debug: log intercepted requests
  server.events.on("request:start", ({ request }) => {
    console.log("MSW intercepting:", request.method, request.url);
  });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

// Helper function to create MSW http handlers
export const createHandler = http;

// Test timeout configuration
export const TEST_TIMEOUT = 10000; // 10 seconds

// Test utilities
export const waitFor = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const createMockResponse = <T>(data: T, status = 200) => ({
  status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

export const createMockError = (status: number, message: string) => ({
  status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ error: message }),
});
