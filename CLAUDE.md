# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Ruby MCP is a monorepo containing Model Context Protocol (MCP) servers designed for Ruby and Ruby on Rails development. The project uses Node.js for MCP protocol handling while enabling interaction with Ruby/Rails applications through command-line interfaces.

## Development Commands

**CRITICAL: This is a Turbo monorepo. NEVER change directories. ALL commands must be run from the project root directory.**

### Monorepo Management (All Packages)

```bash
# Install dependencies for all packages
pnpm install

# Build all packages
turbo run build

# Run all tests across all packages
turbo run test

# Run tests with coverage report
turbo run test:coverage

# Type checking across all packages
turbo run typecheck

# Lint all packages
turbo run lint

# Format code across all packages (if available)
turbo run format

# Clean build artifacts
turbo run clean

# Watch mode for development
turbo run dev

# Manage changesets for versioning (use pnpm for these)
pnpm changeset
pnpm version
pnpm release
```

### Package-Specific Commands (Always from project root)

```bash
# Run tests for a specific package (gems-mcp example)
pnpm --filter @ruby-mcp/gems-mcp test

# Run a single test file in a specific package
pnpm --filter @ruby-mcp/gems-mcp vitest run tests/tools/search.test.ts

# Watch mode for tests in specific package
pnpm --filter @ruby-mcp/gems-mcp test:watch

# Test coverage for specific package
pnpm --filter @ruby-mcp/gems-mcp test:coverage

# Development build with watch for specific package
pnpm --filter @ruby-mcp/gems-mcp dev

# Build specific package only
pnpm --filter @ruby-mcp/gems-mcp build

# Lint specific package only
pnpm --filter @ruby-mcp/gems-mcp lint

# Type check specific package only
pnpm --filter @ruby-mcp/gems-mcp typecheck
```

### Alternative Turbo Commands

```bash
# Run specific task across all packages that have it
turbo run build
turbo run test
turbo run lint
turbo run typecheck

# Run task for specific package using Turbo
turbo run test --filter=@ruby-mcp/gems-mcp
turbo run build --filter=@ruby-mcp/gems-mcp
```

## Architecture

### Monorepo Structure

- **Turbo**: Build orchestration across packages with dependency management
- **pnpm Workspaces**: Package management with shared dependencies
- **TypeScript**: Strongly typed development with project references
- **Vitest**: Testing framework with MSW for API mocking

### MCP Server Architecture (packages/gems-mcp)

**Core Components:**

- `src/index.ts`: Main server entry point, tool registration, and lifecycle management
- `src/api/client.ts`: RubyGems API client with rate limiting and caching
- `src/api/cache.ts`: TTL-based caching implementation for API responses
- `src/tools/`: Individual tool implementations (search, details, versions, bundle operations)
- `src/schemas.ts`: Zod schemas for input validation
- `src/types.ts`: TypeScript type definitions

**Testing Infrastructure:**

- `tests/setup.ts`: MSW server initialization for API mocking
- `tests/fixtures/`: Mock API responses and handlers for RubyGems API
- `fixtures/` (root level): Contains dummy applications for testing:
  - `dummy-rails/`: Complete Rails application with Gemfile and Gemfile.lock for testing Rails-specific functionality
  - `dummy-gem/`: Standard Ruby gem with gemspec and Gemfile for testing gem-specific functionality
- Full unit test coverage for tools, API client, and MCP protocol handling

### Key Design Patterns

1. **Tool Registration Pattern**: Each MCP tool is implemented as a separate class with an `execute` method, registered with the MCP server at startup

2. **API Client Abstraction**: The RubyGemsClient provides a clean interface to the RubyGems.org API with built-in error handling, caching, and rate limiting

3. **Schema Validation**: All tool inputs are validated using Zod schemas before execution, ensuring type safety and proper error messages

4. **Test Fixtures**: MSW is used to mock all external API calls during testing, with comprehensive fixtures for different API responses

## Testing Strategy

- Unit tests for all tools with mocked API responses
- Integration tests for MCP protocol registration and error handling
- Coverage thresholds set at 90% for lines, functions, branches, and statements
- MSW for intercepting and mocking HTTP requests to RubyGems.org API

## Code Standards

### TypeScript Best Practices

- **Type Safety**: NEVER use `any` type in TypeScript code. This is unacceptable and undermines type safety
- **Proper Types**: Always provide explicit type definitions or use `unknown` when the type needs runtime checking
- **Explicit Annotations**: Prefer explicit type annotations for function parameters and return types
- **Strict Mode**: All TypeScript files should be compatible with strict mode
- **No Implicit Any**: The codebase should compile with `noImplicitAny: true`

## Important Notes

### Monorepo Directory Rules
- **NEVER CHANGE DIRECTORIES**: This is a Turbo monorepo - ALL commands must be executed from the project root (`/home/fugufish/Code/ruby-mcp`)
- **Use pnpm filters**: For package-specific operations, use `pnpm --filter <package-name> <command>` 
- **Use Turbo filters**: Alternatively, use `turbo run <command> --filter=<package-name>`
- **No `cd` commands**: Avoid `cd packages/xyz && command` patterns entirely
- **Working directory**: The environment working directory is the project root and should never be changed

### Technical Notes
- This is a Node.js project that interfaces with Ruby/Rails tools - not a Ruby project itself
- The MCP SDK for Node.js is used due to its superior feature support compared to the Ruby SDK
- Each package in the monorepo can be developed and tested independently using filters
- API responses are cached for 5 minutes by default to reduce load on RubyGems.org
