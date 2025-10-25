import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RubyGemsClient } from "../../src/api/client.js";
import { ChangelogFetcher } from "../../src/changelog/fetcher.js";
import { ChangelogTool } from "../../src/tools/changelog.js";
import { server } from "../setup.js";

describe("ChangelogTool", () => {
  let changelogTool: ChangelogTool;
  let fetcher: ChangelogFetcher;
  let client: RubyGemsClient;

  beforeEach(() => {
    client = new RubyGemsClient({
      baseUrl: "https://rubygems.org",
      cacheEnabled: false,
    });
    fetcher = new ChangelogFetcher({
      client,
      cacheEnabled: false,
    });
    changelogTool = new ChangelogTool({ fetcher });
  });

  it("should fetch changelog successfully", async () => {
    server.use(
      http.get("https://rubygems.org/api/v1/gems/test-gem.json", () => {
        return HttpResponse.json({
          name: "test-gem",
          downloads: 1000,
          version: "1.0.0",
          version_created_at: "2024-12-26T18:52:12.345Z",
          version_downloads: 100,
          platform: "ruby",
          yanked: false,
          project_uri: "https://rubygems.org/gems/test-gem",
          gem_uri: "https://rubygems.org/downloads/test-gem-1.0.0.gem",
          changelog_uri: "https://example.com/CHANGELOG.md",
        });
      }),
      http.get("https://example.com/CHANGELOG.md", () => {
        return new HttpResponse(
          "# Changelog\n\n## 1.0.0\n- Initial release\n\n## 0.9.0\n- Beta release",
          {
            headers: { "Content-Type": "text/markdown" },
          }
        );
      })
    );

    const result = await changelogTool.execute({ gem_name: "test-gem" });

    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");

    const text = result.content[0].text;
    expect(text).toContain("# Changelog for test-gem");
    expect(text).toContain("**Source:** https://example.com/CHANGELOG.md");
    expect(text).toContain("## 1.0.0");
    expect(text).toContain("- Initial release");
    expect(text).toContain("## 0.9.0");
    expect(text).toContain("- Beta release");
  });

  it("should fetch version-specific changelog", async () => {
    server.use(
      http.get("https://rubygems.org/api/v1/gems/versioned-gem.json", () => {
        return HttpResponse.json({
          name: "versioned-gem",
          downloads: 2000,
          version: "2.0.0",
          version_created_at: "2024-12-26T18:52:12.345Z",
          version_downloads: 200,
          platform: "ruby",
          yanked: false,
          project_uri: "https://rubygems.org/gems/versioned-gem",
          gem_uri: "https://rubygems.org/downloads/versioned-gem-2.0.0.gem",
          changelog_uri: "https://example.com/CHANGELOG.md",
        });
      }),
      http.get("https://example.com/CHANGELOG.md", () => {
        return new HttpResponse(
          "# Changelog\n\n## 2.0.0\n- Major update\n\n## 1.0.0\n- Initial release",
          {
            headers: { "Content-Type": "text/markdown" },
          }
        );
      })
    );

    const result = await changelogTool.execute({
      gem_name: "versioned-gem",
      version: "2.0.0",
    });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;
    expect(text).toContain("# Changelog for versioned-gem v2.0.0");
    expect(text).toContain("**Source:**");
    expect(text).toContain("Major update");
  });

  it("should handle changelog fetch errors", async () => {
    server.use(
      http.get("https://rubygems.org/api/v1/gems/error-gem.json", () => {
        return new HttpResponse(null, { status: 404 });
      })
    );

    const result = await changelogTool.execute({ gem_name: "error-gem" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error fetching changelog");
  });

  it("should handle validation errors", async () => {
    const result = await changelogTool.execute({ invalid_field: "value" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error:");
  });

  it("should handle validation error for invalid gem name", async () => {
    const result = await changelogTool.execute({
      gem_name: "invalid@gem!name",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error:");
  });

  it("should handle validation error for invalid version format", async () => {
    const result = await changelogTool.execute({
      gem_name: "test-gem",
      version: "invalid-version",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error:");
  });

  it("should handle unexpected errors", async () => {
    // Mock the fetcher to throw an unexpected error
    const badFetcher: Pick<ChangelogFetcher, "fetchChangelog"> = {
      fetchChangelog: vi.fn().mockRejectedValue(new Error("Network timeout")),
    };
    const badTool = new ChangelogTool({
      fetcher: badFetcher as ChangelogFetcher,
    });

    const result = await badTool.execute({ gem_name: "test-gem" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      "Unexpected error while fetching changelog"
    );
    expect(result.content[0].text).toContain("Network timeout");
  });

  it("should handle non-Error exceptions", async () => {
    // Mock the fetcher to throw a non-Error exception
    const badFetcher: Pick<ChangelogFetcher, "fetchChangelog"> = {
      fetchChangelog: vi.fn().mockRejectedValue("string error"),
    };
    const badTool = new ChangelogTool({
      fetcher: badFetcher as ChangelogFetcher,
    });

    const result = await badTool.execute({ gem_name: "test-gem" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unexpected error");
    expect(result.content[0].text).toContain("Unknown error");
  });

  it("should format changelog without source when not available", async () => {
    // Mock fetcher to return changelog without source
    const mockFetcher: Pick<ChangelogFetcher, "fetchChangelog"> = {
      fetchChangelog: vi.fn().mockResolvedValue({
        success: true,
        content: "# Changelog\n\n## 1.0.0\n- Release",
      }),
    };
    const tool = new ChangelogTool({
      fetcher: mockFetcher as ChangelogFetcher,
    });

    const result = await tool.execute({ gem_name: "test-gem" });

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain("# Changelog for test-gem");
    expect(text).not.toContain("**Source:**");
    expect(text).toContain("---");
    expect(text).toContain("## 1.0.0");
  });

  it("should handle changelog from GitHub releases", async () => {
    server.use(
      http.get("https://rubygems.org/api/v1/gems/github-gem.json", () => {
        return HttpResponse.json({
          name: "github-gem",
          downloads: 3000,
          version: "1.5.0",
          version_created_at: "2024-12-26T18:52:12.345Z",
          version_downloads: 300,
          platform: "ruby",
          yanked: false,
          project_uri: "https://rubygems.org/gems/github-gem",
          gem_uri: "https://rubygems.org/downloads/github-gem-1.5.0.gem",
          source_code_uri: "https://github.com/example/github-gem",
        });
      }),
      http.get(
        "https://raw.githubusercontent.com/example/github-gem/main/CHANGELOG.md",
        () => {
          return new HttpResponse("# Changelog\n\n## 1.5.0\n- Bug fixes", {
            headers: { "Content-Type": "text/plain" },
          });
        }
      )
    );

    const result = await changelogTool.execute({ gem_name: "github-gem" });

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain("# Changelog for github-gem");
    expect(text).toContain("## 1.5.0");
    expect(text).toContain("- Bug fixes");
  });
});
