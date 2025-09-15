# Rails MCP Server

A Model Context Protocol (MCP) server for interacting with Rails CLI. This server provides tools for listing Rails generators, getting detailed help, and executing Rails generators with proper validation and error handling.

## Features

- **List Generators**: List all available Rails generators with descriptions and namespaces
- **Generator Help**: Get detailed help for specific generators including options and usage
- **Execute Generators**: Run Rails generators with arguments and options
- **Multi-Project Support**: Work with multiple Rails applications simultaneously
- **Input Validation**: Comprehensive input validation using Zod schemas
- **Error Handling**: Robust error handling with informative error messages
- **Caching**: Built-in caching for improved performance

## Installation

```bash
npm install @ruby-mcp/rails-mcp
```

## Usage

### Standalone

```bash
npx @ruby-mcp/rails-mcp
```

### With Project Configuration

```bash
npx @ruby-mcp/rails-mcp --project myapp:/path/to/rails/app
```

### Multiple Projects

```bash
npx @ruby-mcp/rails-mcp \
  --project main:/path/to/main/app \
  --project api:/path/to/api/app
```

## Available Tools

### `list_generators`

Lists all available Rails generators in a Rails project.

**Input Schema:**
- `project` (optional): Project name to use

**Example:**
```json
{
  "project": "myapp"
}
```

### `get_generator_help`

Gets detailed help for a specific Rails generator.

**Input Schema:**
- `generator_name` (required): Name of the generator
- `project` (optional): Project name to use

**Example:**
```json
{
  "generator_name": "model",
  "project": "myapp"
}
```

### `generate`

Executes a Rails generator with specified arguments and options.

**Input Schema:**
- `generator_name` (required): Name of the generator
- `arguments` (optional): Array of arguments to pass to the generator
- `options` (optional): Object of options to pass to the generator
- `project` (optional): Project name to use

**Example:**
```json
{
  "generator_name": "model",
  "arguments": ["User", "name:string", "email:string"],
  "options": {
    "migration": true,
    "timestamps": true
  },
  "project": "myapp"
}
```

## Requirements

- Node.js 18+
- Rails application with the `rails` command available in PATH
- Ruby and Bundler installed

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Run type checking
pnpm typecheck

# Run linting
pnpm lint
```

### Project Structure

```
src/
├── api/
│   └── rails-client.ts     # Rails CLI command execution
├── tools/
│   ├── generators.ts       # List generators tool
│   ├── generator-help.ts   # Generator help tool
│   └── generate.ts         # Execute generator tool
├── utils/
│   └── validation.ts       # Input validation utilities
├── schemas.ts              # Zod validation schemas
├── types.ts               # TypeScript type definitions
├── project-manager.ts     # Multi-project support
└── index.ts              # Main server entry point
```

## License

ISC