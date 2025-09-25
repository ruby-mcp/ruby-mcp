# Changelog

All notable changes to the Rails MCP package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of Rails MCP server
- Rails generator listing tool (`list_generators`)
- Generator help tool (`get_generator_help`)
- Rails generate tool (`generate`) for executing generators
- Rails destroy tool for reverting generated files
- `DestroyTool` class with full validation and error handling
- `destroyFiles()` method in RailsClient for executing destroy commands
- `DestroyResult` interface for destroy operation responses
- Structured output format for all tools providing both human-readable and machine-readable JSON responses
- `StructuredToolOutput` interface for consistent tool responses
- `ToolExecutionContext` with timestamp, Rails version, and project info
- Utility module for structured output formatting and error handling
- Comprehensive metadata in tool responses for better introspection
- Project manager for handling multiple Rails projects
- Rails client for executing Rails CLI commands
- Comprehensive input validation with Zod schemas
- Cache support for Rails command outputs (5-minute TTL)
- TypeScript types for all Rails operations
- Full test coverage for all tools
- Support for Rails applications, engines, and gems
- Automatic Rails version detection
- Project type detection (application/engine/gem)

### Features
- List all available Rails generators with descriptions
- Get detailed help for specific generators including options and arguments
- Execute Rails generators with arguments and options
- Destroy generated files with same arguments and options as generate
- Support for multiple project configurations
- Proper error handling for non-Rails directories
- Command timeout handling (30 seconds default)
- Output parsing for created, modified, and removed files
- Error categorization (validation_error, not_rails_project, etc.)
- Execution context with rich metadata

### Technical Details
- Built with MCP SDK for Node.js
- TypeScript with strict type checking
- Zod for schema validation
- Vitest for testing
- ESLint and Prettier for code quality
- TSUP for building