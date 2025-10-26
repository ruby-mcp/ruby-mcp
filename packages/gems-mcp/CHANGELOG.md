# Changelog

All notable changes to the Gems MCP package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2025-10-26

### Added
- Gem changelog fetching tool for retrieving CHANGELOG.md files from RubyGems.org

### Changed
- Migrated from ESLint/Prettier to Biome for code formatting and linting with double quote enforcement
- Improved TypeScript type safety by removing all linting errors and proper type definitions
- Enhanced test coverage to achieve 90%+ across all packages

### Fixed
- Code formatting and style consistency across the codebase

## [0.2.0] - 2024-12-25

### Added
- Bundle check tool for verifying gem installation status
- Bundle show tool for displaying installed gem information
- Bundle audit tool for security vulnerability scanning
- Bundle clean tool for removing unused gems
- BundleToolsManager class for handling bundle operations
- Schemas and validation for all new bundle tools
- Bundle install tool for running `bundle install` with various options
- Support for deployment mode, frozen mode, and clean option
- Commander.js integration for improved CLI argument parsing
- Support for multiple project configurations via command line

### Changed
- Enhanced bundle tool registration in main server
- Expanded schema definitions for bundle operations
- Improved CLI interface with better help and version information
- Enhanced project manager initialization with CLI arguments

### Fixed
- Linting and TypeScript warnings throughout the codebase

## [0.1.2] - 2025-08-19

### Added
- Initial release of Gems MCP server
- Search gems on RubyGems.org by name or keywords
- Get detailed gem information including dependencies and metadata
- Retrieve all versions of a gem with prerelease filtering
- Get latest version of a gem (stable or prerelease)
- Find reverse dependencies (gems depending on a specific gem)
- Parse Gemfile and .gemspec files to JSON
- Pin gems to specific versions with various constraint types (~>, >=, etc.)
- Unpin gems by removing version constraints
- Add gems to Gemfile with groups and options support
- Add dependencies to .gemspec files (runtime or development)
- RubyGems API client with rate limiting (100 requests/minute)
- Response caching with 5-minute TTL
- Project manager for handling multiple Ruby projects
- Comprehensive input validation with Zod schemas
- Full TypeScript type definitions

### Features
- Support for single quotes, double quotes, or no quotes in Gemfiles
- Intelligent quote style detection from existing files
- Group management for Gemfile dependencies
- Source specification for gems
- Require options for gems (false or specific paths)
- Development and runtime dependency management for gemspecs
- Parallel API request handling with concurrency limits
- Automatic retry logic for failed API requests
- Comprehensive error handling and validation

### Technical Details
- Built with MCP SDK for Node.js
- TypeScript with strict type checking
- Zod for schema validation
- Vitest for testing with MSW for API mocking
- ESLint and Prettier for code quality
- TSUP for building
- 90%+ test coverage requirement

[Unreleased]: https://github.com/anthropics/ruby-mcp/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/anthropics/ruby-mcp/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/anthropics/ruby-mcp/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/anthropics/ruby-mcp/releases/tag/0.1.2