import { describe, expect, it } from "vitest";
import { RubyGemsClient } from "../../src/api/client.js";
import { DetailsTool } from "../../src/tools/details.js";
import { SearchTool } from "../../src/tools/search.js";

describe("MCP Protocol - Error Handling", () => {
  describe("Input Validation Errors", () => {
    it("should handle malformed inputs gracefully", async () => {
      const client = new RubyGemsClient({ cacheEnabled: false });
      const searchTool = new SearchTool({ client });

      const malformedInputs = [
        null,
        undefined,
        "string",
        123,
        [],
        { malformed: "data" },
      ];

      for (const input of malformedInputs) {
        const result = await searchTool.execute(input);
        expect(result.isError).toBe(true);
        expect(result.content[0].type).toBe("text");
        expect(result.content[0].text).toContain("Error:");
      }
    });

    it("should provide clear error messages", async () => {
      const client = new RubyGemsClient({ cacheEnabled: false });
      const searchTool = new SearchTool({ client });
      const detailsTool = new DetailsTool({ client });

      // Test search with empty query
      const searchResult = await searchTool.execute({ query: "" });
      expect(searchResult.isError).toBe(true);
      expect(searchResult.content[0].text).toContain("Query cannot be empty");

      // Test details with invalid gem name
      const detailsResult = await detailsTool.execute({
        gem_name: "invalid@name",
      });
      expect(detailsResult.isError).toBe(true);
      expect(detailsResult.content[0].text).toContain(
        "Invalid gem name format"
      );
    });
  });

  describe("API Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      const client = new RubyGemsClient({ cacheEnabled: false });
      const searchTool = new SearchTool({ client });

      const result = await searchTool.execute({ query: "error" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error .+/);
    });

    it("should handle not found errors", async () => {
      const client = new RubyGemsClient({ cacheEnabled: false });
      const detailsTool = new DetailsTool({ client });

      const result = await detailsTool.execute({ gem_name: "nonexistent" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error .+/);
    });
  });

  describe("Error Response Format", () => {
    it("should maintain consistent error response structure", async () => {
      const client = new RubyGemsClient({ cacheEnabled: false });
      const searchTool = new SearchTool({ client });

      const result = await searchTool.execute({ query: "" });

      expect(result).toHaveProperty("isError");
      expect(result.isError).toBe(true);
      expect(result).toHaveProperty("content");
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty("type");
      expect(result.content[0]).toHaveProperty("text");
      expect(result.content[0].type).toBe("text");
    });

    it("should not leak sensitive information", async () => {
      const client = new RubyGemsClient({ cacheEnabled: false });
      const searchTool = new SearchTool({ client });

      const result = await searchTool.execute(null);

      // Should not contain file paths, stack traces, etc.
      expect(result.content[0].text).not.toContain("/home/");
      expect(result.content[0].text).not.toContain("node_modules");
      expect(result.content[0].text).not.toContain("at ");
    });
  });
});
