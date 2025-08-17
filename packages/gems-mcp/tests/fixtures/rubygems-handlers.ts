/**
 * MSW handlers for mocking RubyGems.org API responses
 */

import { http, HttpResponse } from 'msw';
import {
  mockSearchResults,
  mockGemDetails,
  mockGemVersions,
  mockLatestVersion,
  mockReverseDependencies,
} from './rubygems-responses.js';

const BASE_URL = 'https://rubygems.org';

export const rubygemsHandlers = [
  // Search gems
  http.get(`${BASE_URL}/api/v1/search.json`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');

    if (!query) {
      return HttpResponse.json(
        { error: 'Query parameter required' },
        { status: 400 }
      );
    }

    if (query.includes('nonexistent')) {
      return HttpResponse.json([]);
    }

    if (query === 'error') {
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return HttpResponse.json(mockSearchResults);
  }),

  // Get gem details
  http.get(`${BASE_URL}/api/v1/gems/:gemName.json`, ({ params }) => {
    const { gemName } = params;

    if (typeof gemName === 'string' && gemName.includes('nonexistent')) {
      return HttpResponse.json(
        { error: 'This rubygem could not be found.' },
        { status: 404 }
      );
    }

    if (gemName === 'error') {
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return HttpResponse.json(mockGemDetails);
  }),

  // Get gem versions
  http.get(`${BASE_URL}/api/v1/versions/:gemName.json`, ({ params }) => {
    const { gemName } = params;

    if (typeof gemName === 'string' && gemName.includes('nonexistent')) {
      return HttpResponse.json(
        { error: 'This rubygem could not be found.' },
        { status: 404 }
      );
    }

    if (gemName === 'error') {
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return HttpResponse.json(mockGemVersions);
  }),

  // Get latest version
  http.get(`${BASE_URL}/api/v1/versions/:gemName/latest.json`, ({ params }) => {
    const { gemName } = params;

    if (typeof gemName === 'string' && gemName.includes('nonexistent')) {
      return HttpResponse.json(
        { error: 'This rubygem could not be found.' },
        { status: 404 }
      );
    }

    if (gemName === 'error') {
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return HttpResponse.json(mockLatestVersion);
  }),

  // Get reverse dependencies
  http.get(
    `${BASE_URL}/api/v1/gems/:gemName/reverse_dependencies.json`,
    ({ params }) => {
      const { gemName } = params;

      if (typeof gemName === 'string' && gemName.includes('nonexistent')) {
        return HttpResponse.json(
          { error: 'This rubygem could not be found.' },
          { status: 404 }
        );
      }

      if (gemName === 'error') {
        return HttpResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }

      if (gemName === 'no-deps') {
        return HttpResponse.json([]);
      }

      return HttpResponse.json(mockReverseDependencies);
    }
  ),
];
