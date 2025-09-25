# Changelog

All notable changes to the Ruby MCP monorepo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Rails MCP Package (v0.1.0)
- Initial release with Rails CLI integration
- Rails generator listing, help, and execution tools
- Rails destroy tool for reverting generated files
- Structured output format with human-readable and machine-readable JSON
- Multi-project support with project manager
- Rails version and project type detection
- Comprehensive test coverage

### Gems MCP Package
- Added bundle check, show, audit, and clean tools
- Implemented BundleToolsManager for bundle operations
- Enhanced schemas for bundle tool validation
- Bundle install tool with deployment and frozen modes
- Commander.js integration for improved CLI parsing

## [2025-08-19]

### Gems MCP Package (v0.1.2)
- Initial release with comprehensive RubyGems.org API integration
- Search, version, and dependency management tools
- Gemfile and gemspec parsing and modification
- Pin/unpin gems with version constraints
- Add gems to Gemfile and gemspec files
- API rate limiting and caching support
- Project manager for handling multiple Ruby projects
- Full TypeScript type definitions and validation

## Project Overview

Ruby MCP is a monorepo containing Model Context Protocol (MCP) servers for Ruby and Ruby on Rails development:

### **Rails MCP** (`packages/rails-mcp`)
MCP server for interacting with Rails CLI, providing tools for:
- Listing available Rails generators
- Getting detailed generator help
- Executing Rails generators
- Destroying generated files
- Managing multiple Rails projects

### **Gems MCP** (`packages/gems-mcp`)
MCP server for Ruby gem management, providing tools for:
- Searching gems on RubyGems.org
- Managing gem versions and dependencies
- Parsing and modifying Gemfiles and gemspecs
- Running bundle commands
- Security auditing with bundle-audit

## Technical Stack

- **Runtime**: Node.js with TypeScript
- **Protocol**: Model Context Protocol (MCP) SDK
- **Build**: Turbo monorepo with pnpm workspaces
- **Testing**: Vitest with MSW for API mocking
- **Code Quality**: ESLint, Prettier, TypeScript strict mode
- **Bundling**: TSUP for optimized builds

## Installation

Both packages are designed to be used as MCP servers with Claude Code or other MCP-compatible clients.

```bash
# Install dependencies
pnpm install

# Build all packages
turbo run build

# Run tests
turbo run test
```

## Contributing

Please see the individual package READMEs for detailed documentation:
- [Rails MCP Documentation](./packages/rails-mcp/README.md)
- [Gems MCP Documentation](./packages/gems-mcp/README.md)