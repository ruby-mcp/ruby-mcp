# @ruby-mcp/gems-mcp

A Model Context Protocol (MCP) server for interacting with the RubyGems.org API and managing Ruby gem dependencies. This server provides comprehensive tools for searching, analyzing, and managing Ruby gems in your Rails and Ruby projects.

## 🌟 Features

- **Gem Search**: Search for gems by name or keywords with relevance scoring
- **Version Management**: Get all versions, latest stable, or prerelease versions
- **Gem Details**: Retrieve comprehensive metadata including authors, licenses, and documentation
- **Dependency Analysis**: Analyze runtime and development dependencies, plus reverse dependencies
- **Gemfile Operations**: Parse, add gems to, and manipulate Gemfile configurations
- **Gemspec Management**: Add dependencies to .gemspec files with version constraints
- **Version Constraints**: Pin/unpin gems with configurable version constraints
- **Smart Caching**: Built-in 5-minute TTL cache for API responses
- **Rate Limiting**: Automatic rate limiting for RubyGems.org API
- **Type Safety**: Full TypeScript with Zod schema validation

## 🔧 Available MCP Tools

### 🔍 search_gems
Search for Ruby gems by name or keywords.

```typescript
{
  query: string;           // Search query
  limit?: number;         // Max results (default: 10, max: 100)
}
```

### 📊 get_gem_details
Get comprehensive information about a specific gem.

```typescript
{
  gem_name: string;       // Name of the gem
}
```

Returns: name, version, authors, licenses, dependencies, documentation URLs, and more.

### 📦 get_gem_versions
List all available versions of a gem.

```typescript
{
  gem_name: string;               // Name of the gem
  include_prerelease?: boolean;   // Include prerelease versions
}
```

### ✨ get_latest_version
Get the latest stable or prerelease version.

```typescript
{
  gem_name: string;               // Name of the gem
  include_prerelease?: boolean;   // Consider prereleases
}
```

### 🔗 get_gem_dependencies
Analyze gem dependencies and reverse dependencies.

```typescript
{
  gem_name: string;       // Name of the gem
}
```

### 📄 parse_gemfile
Parse a Gemfile to extract gem dependencies.

```typescript
{
  file_path: string;      // Path to Gemfile or .gemspec file
  project?: string;       // Optional project name (see Multi-Project Support)
}
```

### 📌 pin_gem
Pin a gem to a specific version in Gemfile.

```typescript
{
  gem_name: string;       // Name of the gem
  version: string;        // Version to pin (e.g., "3.0.0")
  pin_type?: string;      // Constraint type: "~>", ">=", ">", "<", "<=", "=" (default: "~>")
  quote_style?: string;   // Quote style: "single" or "double" (auto-detects if not specified)
  file_path?: string;     // Path to Gemfile (default: "Gemfile")
  project?: string;       // Optional project name (see Multi-Project Support)
}
```

### 🔓 unpin_gem
Remove version constraint from a gem in Gemfile.

```typescript
{
  gem_name: string;       // Name of the gem
  quote_style?: string;   // Quote style: "single" or "double" (auto-detects if not specified)
  file_path?: string;     // Path to Gemfile (default: "Gemfile")
  project?: string;       // Optional project name (see Multi-Project Support)
}
```

### ➕ add_gem_to_gemfile
Add a gem to a Gemfile with optional version constraints and groups.

```typescript
{
  gem_name: string;       // Name of the gem to add
  version?: string;       // Version to constrain (e.g., "3.0.0")
  pin_type?: string;      // Constraint type: "~>", ">=", ">", "<", "<=", "=" (default: "~>")
  group?: string[];       // Groups to add gem to (e.g., ["development", "test"])
  source?: string;        // Alternative source (git URL, path, or custom source)
  require?: boolean | string; // Set to false or custom require path
  quote_style?: string;   // Quote style: "single" or "double" (uses global setting if not specified)
  file_path?: string;     // Path to Gemfile (default: "Gemfile")
  project?: string;       // Optional project name (see Multi-Project Support)
}
```

### ➕ add_gem_to_gemspec
Add a dependency to a .gemspec file with optional version constraints.

```typescript
{
  gem_name: string;       // Name of the gem to add as dependency
  version?: string;       // Version constraint (e.g., "3.0.0")
  pin_type?: string;      // Constraint type: "~>", ">=", ">", "<", "<=", "=" (default: "~>")
  dependency_type?: string; // "runtime" or "development" (default: "runtime")
  quote_style?: string;   // Quote style: "single" or "double" (uses global setting if not specified)
  file_path: string;      // Path to .gemspec file
  project?: string;       // Optional project name (see Multi-Project Support)
}
```

## 📦 Installation

### As a Package

```bash
# Using npm
npm install @ruby-mcp/gems-mcp

# Using pnpm
pnpm add @ruby-mcp/gems-mcp

# Using yarn
yarn add @ruby-mcp/gems-mcp
```

### For Development

```bash
# Clone the monorepo
git clone https://github.com/fugufish/ruby-mcp.git
cd ruby-mcp

# Install dependencies
pnpm install

# Build the package
pnpm --filter @ruby-mcp/gems-mcp build
```

## 🚀 Usage

### As an MCP Server

```typescript
import { GemsServer } from '@ruby-mcp/gems-mcp';

const server = new GemsServer();
server.start();
```

### With Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "gems-mcp": {
      "command": "npx",
      "args": ["@ruby-mcp/gems-mcp"]
    }
  }
}
```

### Multi-Project Support

The gems-mcp server supports managing multiple Ruby/Rails projects simultaneously. You can configure multiple project directories and reference them by name when using tools that interact with files (parse_gemfile, pin_gem, unpin_gem).

#### Command Line Arguments

```bash
# Single project (uses current directory as default)
npx @ruby-mcp/gems-mcp

# Multiple projects with named arguments
npx @ruby-mcp/gems-mcp --project myapp:/path/to/myapp --project api:/path/to/api --project gem:/path/to/gem

# Set global quote style preference
npx @ruby-mcp/gems-mcp --quotes=single
npx @ruby-mcp/gems-mcp --quotes=double

# Combine projects and quotes
npx @ruby-mcp/gems-mcp --project myapp:/path/to/myapp --quotes=double
```

#### In Claude Desktop Configuration

```json
{
  "mcpServers": {
    "gems-mcp": {
      "command": "npx",
      "args": [
        "@ruby-mcp/gems-mcp",
        "--project", "webapp:/home/user/projects/webapp",
        "--project", "api:/home/user/projects/api",
        "--project", "gem:/home/user/projects/my-gem",
        "--quotes", "double"
      ]
    }
  }
}
```

#### Using the Project Parameter

When you've configured multiple projects, you can specify which project to use with the `project` parameter:

```typescript
// Parse Gemfile from specific project
{
  file_path: "Gemfile",
  project: "webapp"  // Uses /home/user/projects/webapp/Gemfile
}

// Add gem to API project
{
  gem_name: "puma",
  version: "6.0.0",
  project: "api"     // Adds to /home/user/projects/api/Gemfile
}

// Pin gem in API project
{
  gem_name: "rails",
  version: "7.0.0",
  project: "api"     // Modifies /home/user/projects/api/Gemfile
}

// Add dependency to gem project's gemspec
{
  gem_name: "activesupport",
  version: "7.0.0",
  file_path: "my-gem.gemspec",
  project: "gem"     // Adds to /home/user/projects/my-gem/my-gem.gemspec
}

// Without project parameter, uses default (current directory)
{
  file_path: "Gemfile"  // Uses ./Gemfile
}
```

### Quote Style Configuration

The gems-mcp server supports configurable quote styles for gem declarations in Gemfiles and gemspec files.

#### Global Quote Configuration

Set the default quote style for all gem management operations:

```bash
# Use single quotes for all gem declarations (default)
npx @ruby-mcp/gems-mcp --quotes=single

# Use double quotes for all gem declarations
npx @ruby-mcp/gems-mcp --quotes=double
```

#### Per-Tool Quote Override

You can override the global setting for individual tool calls:

```typescript
// Add gem with specific quote style (overrides global setting)
{
  gem_name: "rails",
  version: "7.0.0",
  quote_style: "double",  // Use double quotes regardless of global setting
  project: "webapp"
}

// Pin gem with specific quote style
{
  gem_name: "rails",
  version: "7.1.0",
  quote_style: "single",  // Use single quotes
  file_path: "Gemfile"
}
```

#### Quote Style Behavior

- **Default Behavior**: Gemfiles use single quotes, gemspecs use double quotes
- **Global Override**: `--quotes` option sets the same style for both Gemfiles and gemspecs
- **Per-Tool Override**: `quote_style` parameter takes precedence over global setting
- **Auto-Detection**: Pin and unpin tools detect existing quote style and preserve it unless overridden
- **Consistency**: Add tools use the configured quote style for all parts of the gem declaration

#### Examples

```typescript
// Global setting: --quotes=double
// All tools will use double quotes by default

// Add gem to Gemfile with double quotes (from global setting)
{
  gem_name: "rails",
  version: "7.0.0"
  // Result: gem "rails", "~> 7.0.0"
}

// Override to use single quotes for this specific gem
{
  gem_name: "puma",
  version: "6.0.0",
  quote_style: "single"
  // Result: gem 'puma', '~> 6.0.0'
}

// Pin tool preserves existing quotes unless overridden
// If Gemfile has: gem "rails"
{
  gem_name: "rails",
  version: "7.1.0"
  // Result: gem "rails", "~> 7.1.0" (preserves double quotes)
}
```

### Environment Variables

```bash
# Optional: Set cache TTL (default: 300 seconds)
CACHE_TTL=600

# Optional: API rate limit (requests per second)
RATE_LIMIT=10
```

## 🛠️ Development

**Important**: This is part of a Turbo monorepo. All commands should be run from the project root directory.

### Development Commands

```bash
# Run from project root (recommended)
pnpm --filter @ruby-mcp/gems-mcp dev      # Start development mode
pnpm --filter @ruby-mcp/gems-mcp build    # Build the package
pnpm --filter @ruby-mcp/gems-mcp test     # Run tests
pnpm --filter @ruby-mcp/gems-mcp test:coverage  # Test with coverage
pnpm --filter @ruby-mcp/gems-mcp lint     # Lint code
pnpm --filter @ruby-mcp/gems-mcp typecheck # Type checking

# Or use Turbo (also from project root)
turbo run dev --filter=@ruby-mcp/gems-mcp
turbo run test --filter=@ruby-mcp/gems-mcp
turbo run build --filter=@ruby-mcp/gems-mcp
```

### Testing

```bash
# Run all tests
pnpm --filter @ruby-mcp/gems-mcp test

# Run specific test file
pnpm --filter @ruby-mcp/gems-mcp vitest run tests/tools/search.test.ts

# Watch mode
pnpm --filter @ruby-mcp/gems-mcp test:watch

# Coverage report (90% threshold required)
pnpm --filter @ruby-mcp/gems-mcp test:coverage
```

## 🏗️ Architecture

### Core Components

```
src/
├── index.ts           # MCP server entry point
├── api/
│   ├── client.ts      # RubyGems API client with rate limiting
│   └── cache.ts       # TTL-based caching implementation
├── tools/
│   ├── search.ts      # Gem search implementation
│   ├── details.ts     # Gem details retrieval
│   ├── versions.ts    # Version management
│   ├── gemfile-parser.ts # Gemfile parsing operations
│   ├── pin.ts         # Pin/unpin gems
│   └── add.ts         # Add gems to Gemfile/gemspec
├── schemas.ts         # Zod validation schemas
└── types.ts           # TypeScript type definitions
```

### Key Design Patterns

- **Tool Registration**: Each tool extends a base class and auto-registers with the MCP server
- **API Abstraction**: Clean interface to RubyGems.org with automatic retry and caching
- **Schema Validation**: All inputs validated with Zod before processing
- **Error Boundaries**: Comprehensive error handling at every level
- **Test Fixtures**: MSW mocks for deterministic testing

## 🧪 Testing Strategy

- **Unit Tests**: Full coverage for all tools and API client
- **Integration Tests**: MCP protocol compliance testing
- **Mock API**: MSW intercepts all RubyGems.org API calls
- **Test Fixtures**: Real-world Rails and gem fixtures for testing
- **Coverage**: 90% minimum threshold enforced

## 🔒 Type Safety

- **No `any` types**: Full type safety throughout the codebase
- **Strict Mode**: TypeScript strict mode enabled
- **Runtime Validation**: Zod schemas validate all external inputs
- **Type Inference**: Automatic type inference from schemas

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please ensure:

1. All tests pass: `pnpm --filter @ruby-mcp/gems-mcp test`
2. Type checking passes: `pnpm --filter @ruby-mcp/gems-mcp typecheck`
3. Linting passes: `pnpm --filter @ruby-mcp/gems-mcp lint`
4. Coverage >= 90%: `pnpm --filter @ruby-mcp/gems-mcp test:coverage`

## 🔗 Related Links

- [Model Context Protocol](https://modelcontextprotocol.io)
- [RubyGems.org API](https://guides.rubygems.org/rubygems-org-api/)
- [Ruby MCP Monorepo](https://github.com/fugufish/ruby-mcp)

## 📮 Support

For issues and feature requests, please [open an issue](https://github.com/fugufish/ruby-mcp/issues).
