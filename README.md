# Ruby MCP

A monorepo collection of Model Context Protocol (MCP) servers designed specifically for Ruby and Ruby on Rails application development. These servers provide intelligent assistance and automation for common Rails development tasks.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/fugufish/ruby-mcp.git
cd ruby-mcp

# Install dependencies
pnpm install

# Build all packages
turbo run build

# Run tests
turbo run test
```

## 📦 Available Packages

### @ruby-mcp/gems-mcp
MCP server for interacting with RubyGems.org API, providing tools for:
- Searching gems by name or keywords
- Retrieving gem version information
- Accessing detailed gem metadata
- Analyzing gem dependencies
- Managing Gemfile dependencies
- Running bundle install operations

## Philosophy

### Deterministic Operations for Non-Deterministic Systems

While LLMs excel at understanding context and generating solutions, they are inherently non-deterministic. When managing critical development operations like Rails commands or Gemfile modifications, allowing LLMs to decide *how* to perform these operations leads to inconsistent implementations and codebase drift over time.

Ruby MCP servers enforce deterministic workflows for these operations by:

- **Standardizing Operations**: Each MCP tool performs its task in exactly one way, ensuring consistency across all uses
- **Reducing Variability**: By constraining LLM agents to use only these MCP tools, we eliminate method selection variance
- **Preventing Drift**: Universal consistency in how operations are performed prevents gradual codebase divergence
- **Combining Strengths**: LLMs handle the "what" and "why" (understanding context and intent), while MCP servers handle the "how" (executing operations deterministically)

This architecture allows development teams to leverage LLM intelligence while maintaining strict operational consistency - the best of both worlds.

## Overview

Ruby MCP provides specialized MCP servers that integrate with your Ruby and Rails development workflow, offering context-aware assistance for:

- **Gem Management**: Search, analyze, and manage Ruby gems
- **Dependency Analysis**: Track gem dependencies and version constraints
- **Gemfile Operations**: Parse and manipulate Gemfile configurations
- **Version Management**: Pin, unpin, and update gem versions
- **Bundle Operations**: Run bundle install with configurable options
- **Rails Integration**: Seamless interaction with Rails applications
- **API Caching**: Built-in caching for improved performance

## Why Node.js for Ruby MCP Servers?

While it might seem counterintuitive to use Node.js for Ruby/Rails tooling, we chose the Node.js MCP SDK over the Ruby SDK for several important reasons:

### Superior MCP Feature Support

The Node.js SDK provides comprehensive support for all MCP features:

- **Resources**: Full support for exposing file systems, databases, and other resources to MCP clients
- **Tools**: Complete implementation of tool definitions and execution
- **Prompts**: Built-in prompt templating and management
- **Sampling**: Advanced context sampling capabilities

### Maturity and Ecosystem

- The Node.js MCP SDK is the reference implementation with the most active development
- Extensive documentation and examples available
- Larger ecosystem of existing MCP servers to reference and integrate with
- Better TypeScript support for type-safe server development

### Performance and Integration

- Excellent async/await support for handling concurrent operations
- Seamless integration with modern development tools and MCP clients
- Efficient handling of JSON-RPC protocol
- Better support for real-time streaming and bi-directional communication

### Interoperability

- Node.js MCP servers can easily shell out to Ruby/Rails commands
- Can directly interact with Rails applications through command-line interfaces
- Maintains separation of concerns: MCP protocol handling in Node.js, Rails logic in Ruby

While the Ruby MCP SDK exists and continues to evolve, the Node.js implementation currently offers the most robust foundation for building feature-rich MCP servers that can reliably serve Rails developers' needs.

## 🛠️ Development

This is a Turbo monorepo using pnpm workspaces. All commands should be run from the project root.

### Monorepo Commands

```bash
# Install dependencies for all packages
pnpm install

# Build all packages
turbo run build

# Run all tests
turbo run test

# Run tests with coverage
turbo run test:coverage

# Type checking
turbo run typecheck

# Lint all packages
turbo run lint

# Format code
turbo run format

# Clean build artifacts
turbo run clean

# Development mode
turbo run dev
```

### Package-Specific Commands

```bash
# Run tests for a specific package
pnpm --filter @ruby-mcp/gems-mcp test

# Build specific package
pnpm --filter @ruby-mcp/gems-mcp build

# Development mode for specific package
pnpm --filter @ruby-mcp/gems-mcp dev
```

## 🏗️ Architecture

### Technology Stack

- **TypeScript**: Strongly typed development with strict mode
- **Node.js**: MCP protocol handling and server implementation
- **Turbo**: Build orchestration and monorepo management
- **pnpm**: Efficient package management with workspaces
- **Vitest**: Fast unit testing with MSW for API mocking
- **Zod**: Runtime type validation for tool inputs

### Project Structure

```
ruby-mcp/
├── packages/
│   └── gems-mcp/         # RubyGems MCP server
│       ├── src/          # Source code
│       │   ├── tools/    # MCP tool implementations
│       │   ├── api/      # RubyGems API client
│       │   └── index.ts  # Server entry point
│       └── tests/        # Test suite with fixtures
├── fixtures/             # Test applications
│   ├── dummy-rails/      # Sample Rails app for testing
│   └── dummy-gem/        # Sample Ruby gem for testing
├── turbo.json           # Turbo configuration
└── pnpm-workspace.yaml  # Workspace configuration
```

## 🧪 Testing

- **Coverage Requirements**: 90% minimum for lines, functions, branches, and statements
- **Test Strategy**: Unit tests with MSW for API mocking
- **Fixtures**: Comprehensive test fixtures for Rails and gem scenarios

## 📝 Code Standards

- **TypeScript Best Practices**: No `any` types, explicit type annotations
- **Strict Mode**: All code must be compatible with TypeScript strict mode
- **Error Handling**: Robust error handling with proper validation
- **Caching**: 5-minute TTL cache for API responses

## 🔧 Configuration

MCP servers can be configured through environment variables or configuration files. Each package includes its own configuration options documented in its README.

## 📄 License

ISC

## 🤝 Contributing

Contributions are welcome! Please ensure:
- All tests pass (`turbo run test`)
- Type checking passes (`turbo run typecheck`)
- Code is properly formatted (`turbo run format`)
- Coverage thresholds are met (90%)

## 📮 Support

For bugs and feature requests, please [open an issue](https://github.com/fugufish/ruby-mcp/issues).

## 🙏 Acknowledgments

Built with the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) to enhance Ruby on Rails development workflows.
