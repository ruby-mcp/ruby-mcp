import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUOTE_CONFIG,
  detectQuoteStyle,
  formatDependencyDeclaration,
  formatGemDeclaration,
  formatVersionRequirement,
  getQuoteChar,
  parseQuoteStyle,
  replaceGemName,
} from "../../src/utils/quotes.js";

describe("Quote Utilities", () => {
  describe("getQuoteChar", () => {
    it("should return single quote for single style", () => {
      expect(getQuoteChar("single")).toBe("'");
    });

    it("should return double quote for double style", () => {
      expect(getQuoteChar("double")).toBe('"');
    });
  });

  describe("parseQuoteStyle", () => {
    it("should parse single quote styles", () => {
      expect(parseQuoteStyle("single")).toBe("single");
      expect(parseQuoteStyle("Single")).toBe("single");
      expect(parseQuoteStyle("SINGLE")).toBe("single");
      expect(parseQuoteStyle("'")).toBe("single");
    });

    it("should parse double quote styles", () => {
      expect(parseQuoteStyle("double")).toBe("double");
      expect(parseQuoteStyle("Double")).toBe("double");
      expect(parseQuoteStyle("DOUBLE")).toBe("double");
      expect(parseQuoteStyle('"')).toBe("double");
    });

    it("should throw error for invalid values", () => {
      expect(() => parseQuoteStyle("invalid")).toThrow("Invalid quote style");
      expect(() => parseQuoteStyle("triple")).toThrow("Invalid quote style");
    });
  });

  describe("formatGemDeclaration", () => {
    it("should format gem with single quotes", () => {
      const result = formatGemDeclaration("rails", { quoteStyle: "single" });
      expect(result).toBe("gem 'rails'");
    });

    it("should format gem with double quotes", () => {
      const result = formatGemDeclaration("rails", { quoteStyle: "double" });
      expect(result).toBe('gem "rails"');
    });

    it("should format gem with version and pin type", () => {
      const result = formatGemDeclaration("rails", {
        version: "7.0.0",
        pinType: "~>",
        quoteStyle: "single",
      });
      expect(result).toBe("gem 'rails', '~> 7.0.0'");
    });

    it("should format gem with git source", () => {
      const result = formatGemDeclaration("my_gem", {
        source: "https://github.com/user/my_gem.git",
        quoteStyle: "single",
      });
      expect(result).toBe(
        "gem 'my_gem', git: 'https://github.com/user/my_gem.git'"
      );
    });

    it("should format gem with path source", () => {
      const result = formatGemDeclaration("local_gem", {
        source: "../local_gem",
        quoteStyle: "double",
      });
      expect(result).toBe('gem "local_gem", path: "../local_gem"');
    });

    it("should format gem with custom source", () => {
      const result = formatGemDeclaration("my_gem", {
        source: "my-private-source",
        quoteStyle: "single",
      });
      expect(result).toBe("gem 'my_gem', source: 'my-private-source'");
    });

    it("should format gem with require: false", () => {
      const result = formatGemDeclaration("bootsnap", {
        require: false,
        quoteStyle: "single",
      });
      expect(result).toBe("gem 'bootsnap', require: false");
    });

    it("should format gem with custom require path", () => {
      const result = formatGemDeclaration("my_gem", {
        require: "my_gem/custom",
        quoteStyle: "double",
      });
      expect(result).toBe('gem "my_gem", require: "my_gem/custom"');
    });

    it("should format gem with all options", () => {
      const result = formatGemDeclaration("rails", {
        version: "7.0.0",
        pinType: ">=",
        source: "https://github.com/rails/rails.git",
        require: false,
        quoteStyle: "single",
      });
      expect(result).toBe(
        "gem 'rails', '>= 7.0.0', git: 'https://github.com/rails/rails.git', require: false"
      );
    });
  });

  describe("formatDependencyDeclaration", () => {
    it("should format runtime dependency with single quotes", () => {
      const result = formatDependencyDeclaration("rails", {
        dependencyType: "runtime",
        quoteStyle: "single",
      });
      expect(result).toBe("  spec.add_dependency 'rails'");
    });

    it("should format development dependency with double quotes", () => {
      const result = formatDependencyDeclaration("rspec", {
        dependencyType: "development",
        quoteStyle: "double",
      });
      expect(result).toBe('  spec.add_development_dependency "rspec"');
    });

    it("should format dependency with version constraint", () => {
      const result = formatDependencyDeclaration("rails", {
        version: "7.0.0",
        pinType: "~>",
        dependencyType: "runtime",
        quoteStyle: "double",
      });
      expect(result).toBe('  spec.add_dependency "rails", "~> 7.0.0"');
    });
  });

  describe("formatVersionRequirement", () => {
    it("should format version requirement with single quotes", () => {
      const result = formatVersionRequirement("7.0.0", "~>", "single");
      expect(result).toBe("'~> 7.0.0'");
    });

    it("should format version requirement with double quotes", () => {
      const result = formatVersionRequirement("7.0.0", ">=", "double");
      expect(result).toBe('">= 7.0.0"');
    });

    it("should handle different pin types", () => {
      const pinTypes = ["~>", ">=", ">", "<", "<=", "="];
      for (const pinType of pinTypes) {
        const result = formatVersionRequirement("1.0.0", pinType, "single");
        expect(result).toBe(`'${pinType} 1.0.0'`);
      }
    });
  });

  describe("detectQuoteStyle", () => {
    it("should detect single quotes", () => {
      expect(detectQuoteStyle("gem 'rails'")).toBe("single");
      expect(detectQuoteStyle("  gem 'activerecord', '~> 7.0'")).toBe("single");
    });

    it("should detect double quotes", () => {
      expect(detectQuoteStyle('gem "rails"')).toBe("double");
      expect(detectQuoteStyle('  gem "activerecord", "~> 7.0"')).toBe("double");
    });

    it("should default to single if no quotes found", () => {
      expect(detectQuoteStyle("# just a comment")).toBe("single");
      expect(detectQuoteStyle("source https://rubygems.org")).toBe("single");
    });
  });

  describe("replaceGemName", () => {
    it("should replace gem name preserving single quotes", () => {
      const line = "gem 'old_gem', '~> 1.0'";
      const result = replaceGemName(line, "old_gem", "new_gem");
      expect(result).toBe("gem 'new_gem', '~> 1.0'");
    });

    it("should replace gem name preserving double quotes", () => {
      const line = 'gem "old_gem", "~> 1.0"';
      const result = replaceGemName(line, "old_gem", "new_gem");
      expect(result).toBe('gem "new_gem", "~> 1.0"');
    });

    it("should handle complex gem declarations", () => {
      const line = "gem 'old_gem', '~> 1.0', require: false";
      const result = replaceGemName(line, "old_gem", "new_gem");
      expect(result).toBe("gem 'new_gem', '~> 1.0', require: false");
    });

    it("should force single quotes when preserveQuotes is false", () => {
      const line = 'gem "old_gem", "~> 1.0"';
      const result = replaceGemName(line, "old_gem", "new_gem", false);
      expect(result).toBe("gem 'new_gem', \"~> 1.0\"");
    });
  });

  describe("DEFAULT_QUOTE_CONFIG", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_QUOTE_CONFIG.gemfile).toBe("single");
      expect(DEFAULT_QUOTE_CONFIG.gemspec).toBe("double");
    });
  });
});
