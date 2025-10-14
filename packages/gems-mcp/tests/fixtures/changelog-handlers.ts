/**
 * MSW handlers for mocking changelog-related HTTP requests
 */

import { http, HttpResponse } from 'msw';
import { mockChangelogResponses } from './changelog-responses.js';

export const changelogHandlers = [
  // GitHub API - Rails release
  http.get('https://api.github.com/repos/rails/rails/releases/tags/v8.0.3', () => {
    return HttpResponse.json(mockChangelogResponses.railsRelease);
  }),

  // GitHub raw content - Puma History.md
  http.get('https://raw.githubusercontent.com/puma/puma/master/History.md', () => {
    return new HttpResponse(mockChangelogResponses.pumaHistory, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    });
  }),

  // GitHub raw content - Sidekiq Changes.md
  http.get('https://raw.githubusercontent.com/sidekiq/sidekiq/main/Changes.md', () => {
    return new HttpResponse(mockChangelogResponses.sidekiqChanges, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    });
  }),

  // External changelog - Nokogiri HTML
  http.get('https://nokogiri.org/CHANGELOG.html', () => {
    return new HttpResponse(mockChangelogResponses.nokogiriHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }),

  // RubyGems API responses with changelog URLs
  http.get('https://rubygems.org/api/v1/gems/rails.json', () => {
    return HttpResponse.json(mockChangelogResponses.mockGemWithGitHubRelease);
  }),

  http.get('https://rubygems.org/api/v1/gems/puma.json', () => {
    return HttpResponse.json(mockChangelogResponses.mockGemWithGitHubFile);
  }),

  http.get('https://rubygems.org/api/v1/gems/sidekiq.json', () => {
    return HttpResponse.json({
      ...mockChangelogResponses.mockGemWithGitHubFile,
      name: 'sidekiq',
      changelog_uri: 'https://github.com/sidekiq/sidekiq/blob/main/Changes.md',
    });
  }),

  http.get('https://rubygems.org/api/v1/gems/nokogiri.json', () => {
    return HttpResponse.json(mockChangelogResponses.mockGemWithExternalChangelog);
  }),

  http.get('https://rubygems.org/api/v1/gems/test-gem.json', () => {
    return HttpResponse.json(mockChangelogResponses.mockGemWithoutChangelog);
  }),

  // Error scenarios
  http.get('https://api.github.com/repos/error/error/releases/tags/v1.0.0', () => {
    return new HttpResponse(null, { status: 404 });
  }),

  http.get('https://raw.githubusercontent.com/error/error/main/CHANGELOG.md', () => {
    return new HttpResponse(null, { status: 404 });
  }),

  // Timeout scenario (will be handled by test setup)
  http.get('https://api.github.com/repos/timeout/timeout/releases/tags/v1.0.0', () => {
    // This will hang indefinitely to simulate timeout
    return new Promise(() => {}); // Never resolves
  }),
];