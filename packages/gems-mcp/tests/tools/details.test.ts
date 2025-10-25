import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RubyGemsClient } from "../../src/api/client.js";
import { DetailsTool } from "../../src/tools/details.js";
import { server } from "../setup.js";

describe("DetailsTool", () => {
  let detailsTool: DetailsTool;
  let client: RubyGemsClient;

  beforeEach(() => {
    client = new RubyGemsClient({
      baseUrl: "https://rubygems.org",
      cacheEnabled: false,
    });
    detailsTool = new DetailsTool({ client });
  });

  it("should get gem details successfully", async () => {
    const args = { gem_name: "rails" };
    const result = await detailsTool.execute(args);

    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");

    const text = result.content[0].text;
    expect(text).toContain("# rails");
    expect(text).toContain("**Current Version:** 8.0.2.1");
    expect(text).toContain("**Authors:** David Heinemeier Hansson");
    expect(text).toContain("**Total Downloads:** 652,484,010");
  });

  it("should handle gem with all optional fields", async () => {
    server.use(
      http.get("https://rubygems.org/api/v1/gems/full-gem.json", () => {
        return HttpResponse.json({
          name: "full-gem",
          downloads: 1000000,
          version: "2.0.0",
          version_created_at: "2024-12-26T18:52:12.345Z",
          version_downloads: 50000,
          platform: "ruby",
          authors: "Full Author",
          info: "A comprehensive gem with all fields",
          licenses: ["MIT", "Apache-2.0"],
          metadata: {
            "custom-key": "custom-value",
            "build-env": "production",
          },
          yanked: false,
          sha: "full123sha456",
          project_uri: "https://rubygems.org/gems/full-gem",
          gem_uri: "https://rubygems.org/downloads/full-gem-2.0.0.gem",
          homepage_uri: "https://example.com",
          documentation_uri: "https://docs.example.com",
          source_code_uri: "https://github.com/example/full-gem",
          bug_tracker_uri: "https://github.com/example/full-gem/issues",
          changelog_uri: "https://github.com/example/full-gem/changelog",
          funding_uri: "https://funding.example.com",
          wiki_uri: "https://wiki.example.com",
          mailing_list_uri: "https://list.example.com",
          dependencies: {
            development: [
              { name: "minitest", requirements: "~> 5.0" },
              { name: "rake", requirements: ">= 10.0" },
            ],
            runtime: [{ name: "activesupport", requirements: "~> 7.0" }],
          },
        });
      })
    );

    const args = { gem_name: "full-gem" };
    const result = await detailsTool.execute(args);

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    expect(text).toContain("# full-gem");
    expect(text).toContain(
      "**Description:** A comprehensive gem with all fields"
    );
    expect(text).toContain("**License:** MIT, Apache-2.0");
    expect(text).toContain("**Yanked:** No");
    expect(text).toContain("- **Homepage:** https://example.com");
    expect(text).toContain("- **Documentation:** https://docs.example.com");
    expect(text).toContain(
      "- **Source Code:** https://github.com/example/full-gem"
    );
    expect(text).toContain(
      "- **Bug Tracker:** https://github.com/example/full-gem/issues"
    );
    expect(text).toContain(
      "- **Changelog:** https://github.com/example/full-gem/changelog"
    );
    expect(text).toContain("- **Funding:** https://funding.example.com");
    expect(text).toContain("- **Wiki:** https://wiki.example.com");
    expect(text).toContain("- **Mailing List:** https://list.example.com");
    expect(text).toContain("## Runtime Dependencies");
    expect(text).toContain("- activesupport ~> 7.0");
    expect(text).toContain("## Development Dependencies");
    expect(text).toContain("- minitest ~> 5.0");
    expect(text).toContain("- rake >= 10.0");
    expect(text).toContain("## Metadata");
    expect(text).toContain("- **custom-key:** custom-value");
    expect(text).toContain("- **build-env:** production");
    expect(text).toContain("**SHA256:** `full123sha456`");
  });

  it("should handle gem with minimal fields", async () => {
    server.use(
      http.get("https://rubygems.org/api/v1/gems/minimal-gem.json", () => {
        return HttpResponse.json({
          name: "minimal-gem",
          downloads: 100,
          version: "1.0.0",
          version_created_at: "2024-12-26T18:52:12.345Z",
          version_downloads: 10,
          platform: "ruby",
          yanked: true,
          project_uri: "https://rubygems.org/gems/minimal-gem",
          gem_uri: "https://rubygems.org/downloads/minimal-gem-1.0.0.gem",
        });
      })
    );

    const args = { gem_name: "minimal-gem" };
    const result = await detailsTool.execute(args);

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    expect(text).toContain("# minimal-gem");
    expect(text).toContain("**Yanked:** Yes");
    expect(text).not.toContain("**Description:**");
    expect(text).not.toContain("**Authors:**");
    expect(text).not.toContain("**License:**");
    expect(text).not.toContain("- **Homepage:**");
    expect(text).not.toContain("## Runtime Dependencies");
    expect(text).not.toContain("## Metadata");
    expect(text).not.toContain("**SHA256:**");
  });

  it("should handle gem with empty dependencies", async () => {
    server.use(
      http.get("https://rubygems.org/api/v1/gems/no-deps-gem.json", () => {
        return HttpResponse.json({
          name: "no-deps-gem",
          downloads: 500,
          version: "1.5.0",
          version_created_at: "2024-12-26T18:52:12.345Z",
          version_downloads: 25,
          platform: "ruby",
          yanked: false,
          project_uri: "https://rubygems.org/gems/no-deps-gem",
          gem_uri: "https://rubygems.org/downloads/no-deps-gem-1.5.0.gem",
          dependencies: {
            development: [],
            runtime: [],
          },
        });
      })
    );

    const args = { gem_name: "no-deps-gem" };
    const result = await detailsTool.execute(args);

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    expect(text).toContain("# no-deps-gem");
    expect(text).not.toContain("## Runtime Dependencies");
    expect(text).not.toContain("## Development Dependencies");
  });

  it("should handle gem with empty metadata", async () => {
    server.use(
      http.get("https://rubygems.org/api/v1/gems/no-metadata-gem.json", () => {
        return HttpResponse.json({
          name: "no-metadata-gem",
          downloads: 200,
          version: "1.1.0",
          version_created_at: "2024-12-26T18:52:12.345Z",
          version_downloads: 15,
          platform: "ruby",
          yanked: false,
          project_uri: "https://rubygems.org/gems/no-metadata-gem",
          gem_uri: "https://rubygems.org/downloads/no-metadata-gem-1.1.0.gem",
          metadata: {},
        });
      })
    );

    const args = { gem_name: "no-metadata-gem" };
    const result = await detailsTool.execute(args);

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    expect(text).toContain("# no-metadata-gem");
    expect(text).not.toContain("## Metadata");
  });

  it("should handle gem not found", async () => {
    const args = { gem_name: "nonexistent" };
    const result = await detailsTool.execute(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error getting gem details");
  });

  it("should handle validation errors", async () => {
    const args = { invalid_field: "value" };
    const result = await detailsTool.execute(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error:");
  });

  it("should handle unexpected errors", async () => {
    // Mock the client to throw an unexpected error
    const originalGetGemDetails = client.getGemDetails;
    client.getGemDetails = vi
      .fn()
      .mockRejectedValue(new Error("Network timeout"));

    const args = { gem_name: "test-gem" };
    const result = await detailsTool.execute(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      "Unexpected error while getting gem details"
    );
    expect(result.content[0].text).toContain("Network timeout");

    // Restore original method
    client.getGemDetails = originalGetGemDetails;
  });

  it("should handle non-Error exceptions", async () => {
    // Mock the client to throw a non-Error exception
    const badClient: Pick<RubyGemsClient, "getGemDetails"> = {
      getGemDetails: vi.fn().mockRejectedValue("string error"),
    };
    const badTool = new DetailsTool({ client: badClient as RubyGemsClient });

    const result = await badTool.execute({ gem_name: "test" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unexpected error");
    expect(result.content[0].text).toContain("Unknown error");
  });
});
