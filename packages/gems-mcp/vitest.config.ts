import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
      exclude: [
        "dist/**",
        "tests/**",
        "**/*.d.ts",
        "vitest.config.ts",
        "tsup.config.ts",
      ],
    },
    setupFiles: ["./tests/setup.ts"],
    pool: "forks",
  },
});
