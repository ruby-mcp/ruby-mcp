/**
 * Mock response data for changelog-related endpoints
 */

export const mockChangelogResponses = {
  // GitHub Release API response for Rails
  railsRelease: {
    url: 'https://api.github.com/repos/rails/rails/releases/155072398',
    html_url: 'https://github.com/rails/rails/releases/tag/v8.0.3',
    id: 155072398,
    tag_name: 'v8.0.3',
    name: 'v8.0.3',
    draft: false,
    prerelease: false,
    created_at: '2024-12-12T00:00:00Z',
    published_at: '2024-12-12T00:00:00Z',
    body: `## Active Support

* No changes.

## Active Model

* Fix \`to_json\` for \`ActiveModel::Dirty\` object.

  Previously, changes to \`ActiveModel::Dirty\` object attributes were not reflected in \`to_json\` output.

  *Hartley McGuire*

## Active Record

* Fix incorrect SQL query when passing an empty hash to \`ActiveRecord::Base.insert\`.

  *David Larochelle*

* Allow \`DatabaseConfigurations#configs_for\` to accept a single database name.

  *fatkodima*

## Action View

* No changes.

## Action Pack

* Fix \`ActionController::Renderer\` not normalizing \`HTTP_HOST\` header.

  *hartley*

## Active Job

* No changes.

## Action Mailer

* No changes.

## Action Cable

* No changes.

## Active Storage

* No changes.

## Action Mailbox

* No changes.

## Action Text

* No changes.

## Railties

* No changes.`,
    author: {
      login: 'rafaelfranca',
      id: 47848,
      avatar_url: 'https://avatars.githubusercontent.com/u/47848?v=4',
      type: 'User',
    },
  },

  // Raw markdown content for Puma's History.md
  pumaHistory: `## 7.0.4 / 2024-12-01

* Bugfixes
  * Fix compiling the native extension on musl libc and Ruby < 3.3 ([#3506])

## 7.0.3 / 2024-11-26

* Bugfixes
  * Handle \`Errno::EINTR\` in \`thread_pool.rb\` to prevent sporadic failures ([#3497], [#3498])

## 7.0.2 / 2024-11-25

* Bugfixes
  * Revert refactoring causing "Closed stream" errors with KeepAlive and Ruby 3.4 ([#3490], [#3491])

## 7.0.1 / 2024-11-21

* Bugfixes
  * Fix serve_static_assets config (in Rails) ([#3489])

## 7.0.0 / 2024-11-21

* Features
  * Introduce experimental rack application fork safety verification ([#3203])
  * Add \`http_content_length_limit\` option to limit HTTP Content-Length ([#3133], [#3216])
  * Rack 3 support ([#3166], [#3206])
  * Add SSL certs pinning support ([#3429])
  * Add support for Linux abstract sockets ([#3470], [#3211])

* Bugfixes
  * Fix WEBrick handler to use provided default host ([#3195])
  * Fix max_request_body_size validation for chunked requests ([#3198])
  * Fix chunked request handling ([#3251])
  * Numerous internal refactorings and cleanups

[#3506]: https://github.com/puma/puma/pull/3506
[#3498]: https://github.com/puma/puma/pull/3498
[#3497]: https://github.com/puma/puma/issues/3497
[#3491]: https://github.com/puma/puma/pull/3491
[#3490]: https://github.com/puma/puma/issues/3490`,

  // HTML content for external changelog (simplified example)
  nokogiriHtml: `<!DOCTYPE html>
<html>
<head>
  <title>Nokogiri Changelog</title>
</head>
<body>
  <h1>Nokogiri Changelog</h1>

  <h2>v1.18.10 / 2024-12-15</h2>

  <h3>Dependencies</h3>
  <ul>
    <li>Update to libxml2 2.13.5 from 2.13.4. (<a href="https://gitlab.gnome.org/GNOME/libxml2/-/releases/v2.13.5">Upstream</a>)</li>
  </ul>

  <h2>v1.18.9 / 2024-12-10</h2>

  <h3>Fixed</h3>
  <ul>
    <li>Removed a transitive dependency on <code>logger</code> which was introduced in v1.18.8. <a href="https://github.com/sparklemotion/nokogiri/issues/3406">#3406</a> <a href="https://github.com/flavorjones">@flavorjones</a></li>
  </ul>

  <h2>v1.18.8 / 2024-12-09</h2>

  <h3>Dependencies</h3>
  <ul>
    <li>Update to libxml2 2.13.4 from 2.13.3. (<a href="https://gitlab.gnome.org/GNOME/libxml2/-/releases/v2.13.4">Upstream</a>).</li>
    <li>Update to libxslt 1.1.42 from 1.1.39. (<a href="https://gitlab.gnome.org/GNOME/libxslt/-/releases/v1.1.42">Upstream</a>). Note that libxslt v1.1.40 and v1.1.41 were skipped as they did not successfully build.</li>
  </ul>
</body>
</html>`,

  // Sidekiq Changes.md raw content
  sidekiqChanges: `# Sidekiq Changes

## 8.0.8

- More internal refactoring and cleanup

## 8.0.7

- Fix Sidekiq::Cron integration
- Internal code cleanup

## 8.0.6

- Bug fixes for job retry logic
- Performance improvements

## 8.0.5

- Fix memory leak in batch processing
- Update dependencies

## 8.0.4

- Critical security update
- Fix Ruby 3.3 compatibility issues`,

  // Mock gem details with changelog URLs
  mockGemWithGitHubRelease: {
    name: 'rails',
    downloads: 652484010,
    version: '8.0.3',
    version_created_at: '2024-12-12T00:00:00Z',
    version_downloads: 2345678,
    platform: 'ruby',
    yanked: false,
    project_uri: 'https://rubygems.org/gems/rails',
    gem_uri: 'https://rubygems.org/downloads/rails-8.0.3.gem',
    homepage_uri: 'https://rubyonrails.org',
    changelog_uri: 'https://github.com/rails/rails/releases/tag/v8.0.3',
    dependencies: {
      development: [],
      runtime: [],
    },
  },

  mockGemWithGitHubFile: {
    name: 'puma',
    downloads: 100000000,
    version: '7.0.4',
    version_created_at: '2024-12-01T00:00:00Z',
    version_downloads: 500000,
    platform: 'ruby',
    yanked: false,
    project_uri: 'https://rubygems.org/gems/puma',
    gem_uri: 'https://rubygems.org/downloads/puma-7.0.4.gem',
    homepage_uri: 'https://puma.io',
    changelog_uri: 'https://github.com/puma/puma/blob/master/History.md',
    dependencies: {
      development: [],
      runtime: [],
    },
  },

  mockGemWithExternalChangelog: {
    name: 'nokogiri',
    downloads: 500000000,
    version: '1.18.10',
    version_created_at: '2024-12-15T00:00:00Z',
    version_downloads: 1000000,
    platform: 'ruby',
    yanked: false,
    project_uri: 'https://rubygems.org/gems/nokogiri',
    gem_uri: 'https://rubygems.org/downloads/nokogiri-1.18.10.gem',
    homepage_uri: 'https://nokogiri.org',
    changelog_uri: 'https://nokogiri.org/CHANGELOG.html',
    dependencies: {
      development: [],
      runtime: [],
    },
  },

  mockGemWithoutChangelog: {
    name: 'test-gem',
    downloads: 1000,
    version: '1.0.0',
    version_created_at: '2024-12-26T00:00:00Z',
    version_downloads: 100,
    platform: 'ruby',
    yanked: false,
    project_uri: 'https://rubygems.org/gems/test-gem',
    gem_uri: 'https://rubygems.org/downloads/test-gem-1.0.0.gem',
    homepage_uri: 'https://example.com',
    source_code_uri: 'https://github.com/example/test-gem',
    // No changelog_uri
    dependencies: {
      development: [],
      runtime: [],
    },
  },
};