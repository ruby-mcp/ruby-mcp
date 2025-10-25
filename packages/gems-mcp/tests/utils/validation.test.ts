import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  isValidGemName,
  sanitizeSearchQuery,
  validateBoolean,
  validateInput,
  validateLimit,
} from "../../src/utils/validation.js";

describe("validation utilities", () => {
  describe("validateInput", () => {
    const testSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    it("should validate valid input successfully", () => {
      const input = { name: "John", age: 30 };
      const result = validateInput(testSchema, input);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(input);
      expect(result.error).toBeUndefined();
      expect(result.issues).toBeUndefined();
    });

    it("should handle validation errors with multiple issues", () => {
      const input = { name: 123, age: "invalid" };
      const result = validateInput(testSchema, input);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toContain("Validation failed:");
      expect(result.issues).toHaveLength(2);
      expect(result.issues).toContain("name: Expected string, received number");
      expect(result.issues).toContain("age: Expected number, received string");
    });

    it("should handle validation errors with single issue", () => {
      const input = { name: "John", age: "invalid" };
      const result = validateInput(testSchema, input);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Validation failed: age: Expected number, received string"
      );
      expect(result.issues).toHaveLength(1);
    });

    it("should handle validation errors with nested path", () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
          }),
        }),
      });
      const input = { user: { profile: { name: 123 } } };
      const result = validateInput(nestedSchema, input);

      expect(result.success).toBe(false);
      expect(result.error).toContain("user.profile.name:");
    });

    it("should handle validation errors at root level", () => {
      const rootSchema = z.string();
      const input = 123;
      const result = validateInput(rootSchema, input);

      expect(result.success).toBe(false);
      expect(result.error).toContain("root:");
    });

    it("should handle non-ZodError exceptions", () => {
      const throwingSchema = {
        parse: () => {
          throw new Error("Custom error");
        },
      } as unknown as z.ZodTypeAny;
      const input = {};
      const result = validateInput(throwingSchema, input);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Custom error");
      expect(result.issues).toBeUndefined();
    });

    it("should handle non-Error exceptions", () => {
      const throwingSchema = {
        parse: () => {
          throw "String error";
        },
      } as unknown as z.ZodTypeAny;
      const input = {};
      const result = validateInput(throwingSchema, input);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown validation error");
    });
  });

  describe("isValidGemName", () => {
    it("should return true for valid gem names", () => {
      expect(isValidGemName("rails")).toBe(true);
      expect(isValidGemName("active_record")).toBe(true);
      expect(isValidGemName("my-gem")).toBe(true);
      expect(isValidGemName("gem123")).toBe(true);
      expect(isValidGemName("a")).toBe(true);
      expect(isValidGemName("test_gem_with_numbers_123")).toBe(true);
    });

    it("should return false for invalid gem names", () => {
      expect(isValidGemName("")).toBe(false);
      expect(isValidGemName("gem with spaces")).toBe(false);
      expect(isValidGemName("gem.with.dots")).toBe(false);
      expect(isValidGemName("gem@with@symbols")).toBe(false);
      expect(isValidGemName("gem/with/slashes")).toBe(false);
      expect(isValidGemName("a".repeat(51))).toBe(false); // too long
    });

    it("should return false for non-string inputs", () => {
      expect(isValidGemName(null as unknown as string)).toBe(false);
      expect(isValidGemName(undefined as unknown as string)).toBe(false);
      expect(isValidGemName(123 as unknown as string)).toBe(false);
      expect(isValidGemName({} as unknown as string)).toBe(false);
      expect(isValidGemName([] as unknown as string)).toBe(false);
    });
  });

  describe("sanitizeSearchQuery", () => {
    it("should sanitize valid search queries", () => {
      expect(sanitizeSearchQuery("rails")).toBe("rails");
      expect(sanitizeSearchQuery("  rails  ")).toBe("rails");
      expect(sanitizeSearchQuery("active record")).toBe("active record");
      expect(sanitizeSearchQuery("testing 123")).toBe("testing 123");
    });

    it("should handle empty and whitespace-only queries", () => {
      expect(sanitizeSearchQuery("")).toBe("");
      expect(sanitizeSearchQuery("   ")).toBe("");
      expect(sanitizeSearchQuery("\t\n")).toBe("");
    });

    it("should truncate long queries", () => {
      const longQuery = "a".repeat(150);
      const result = sanitizeSearchQuery(longQuery);
      expect(result).toBe("a".repeat(100));
      expect(result.length).toBe(100);
    });

    it("should handle non-string inputs", () => {
      expect(sanitizeSearchQuery(null as unknown as string)).toBe("");
      expect(sanitizeSearchQuery(undefined as unknown as string)).toBe("");
      expect(sanitizeSearchQuery(123 as unknown as string)).toBe("");
      expect(sanitizeSearchQuery({} as unknown as string)).toBe("");
      expect(sanitizeSearchQuery([] as unknown as string)).toBe("");
    });
  });

  describe("validateLimit", () => {
    it("should return valid numeric limits", () => {
      expect(validateLimit(5)).toBe(5);
      expect(validateLimit(50)).toBe(50);
      expect(validateLimit(100)).toBe(100);
      expect(validateLimit(1)).toBe(1);
    });

    it("should return valid string limits", () => {
      expect(validateLimit("5")).toBe(5);
      expect(validateLimit("50")).toBe(50);
      expect(validateLimit("100")).toBe(100);
      expect(validateLimit("1")).toBe(1);
    });

    it("should return default for invalid limits", () => {
      expect(validateLimit(0)).toBe(10); // default
      expect(validateLimit(-1)).toBe(10);
      expect(validateLimit(101)).toBe(10); // over max
      expect(validateLimit(1.5)).toBe(10); // not integer
      expect(validateLimit("invalid")).toBe(10);
      expect(validateLimit("0")).toBe(10);
      expect(validateLimit("-1")).toBe(10);
      expect(validateLimit("101")).toBe(10);
      expect(validateLimit("1.5")).toBe(1);
    });

    it("should use custom default and max limits", () => {
      expect(validateLimit(0, 20, 50)).toBe(20);
      expect(validateLimit(60, 20, 50)).toBe(20);
      expect(validateLimit(25, 20, 50)).toBe(25);
    });

    it("should handle non-numeric inputs", () => {
      expect(validateLimit(null)).toBe(10);
      expect(validateLimit(undefined)).toBe(10);
      expect(validateLimit({})).toBe(10);
      expect(validateLimit([])).toBe(10);
      expect(validateLimit(true)).toBe(10);
    });
  });

  describe("validateBoolean", () => {
    it("should return actual boolean values", () => {
      expect(validateBoolean(true)).toBe(true);
      expect(validateBoolean(false)).toBe(false);
    });

    it("should convert truthy string values", () => {
      expect(validateBoolean("true")).toBe(true);
      expect(validateBoolean("TRUE")).toBe(true);
      expect(validateBoolean("True")).toBe(true);
      expect(validateBoolean("1")).toBe(true);
      expect(validateBoolean("yes")).toBe(true);
      expect(validateBoolean("YES")).toBe(true);
      expect(validateBoolean("Yes")).toBe(true);
    });

    it("should convert falsy string values", () => {
      expect(validateBoolean("false")).toBe(false);
      expect(validateBoolean("FALSE")).toBe(false);
      expect(validateBoolean("False")).toBe(false);
      expect(validateBoolean("0")).toBe(false);
      expect(validateBoolean("no")).toBe(false);
      expect(validateBoolean("NO")).toBe(false);
      expect(validateBoolean("No")).toBe(false);
    });

    it("should return default for invalid string values", () => {
      expect(validateBoolean("maybe")).toBe(false); // default
      expect(validateBoolean("invalid")).toBe(false);
      expect(validateBoolean("")).toBe(false);
      expect(validateBoolean("2")).toBe(false);
    });

    it("should use custom default value", () => {
      expect(validateBoolean("maybe", true)).toBe(true);
      expect(validateBoolean("invalid", true)).toBe(true);
      expect(validateBoolean(null, true)).toBe(true);
    });

    it("should handle non-string/non-boolean inputs", () => {
      expect(validateBoolean(null)).toBe(false);
      expect(validateBoolean(undefined)).toBe(false);
      expect(validateBoolean(0)).toBe(false);
      expect(validateBoolean(1)).toBe(false);
      expect(validateBoolean({})).toBe(false);
      expect(validateBoolean([])).toBe(false);
    });
  });
});
