/**
 * TypeScript type definitions for Rails CLI responses and data structures
 */

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface RailsGenerator {
  name: string;
  description: string;
  namespace?: string;
}

export interface GeneratorOption {
  name: string;
  description: string;
  type: "boolean" | "string" | "array";
  default?: unknown;
  required?: boolean;
  aliases?: string[];
}

export interface GeneratorHelp {
  name: string;
  description: string;
  usage: string;
  options: GeneratorOption[];
  arguments: GeneratorArgument[];
}

export interface GeneratorArgument {
  name: string;
  description: string;
  required: boolean;
  type: "string" | "array";
}

export interface RailsProjectInfo {
  isRailsProject: boolean;
  railsVersion?: string;
  projectType?: "application" | "engine" | "gem";
  rootPath: string;
}

export interface GenerateResult {
  success: boolean;
  output: string;
  error?: string;
  filesCreated: string[];
  filesModified: string[];
}

export interface DestroyResult {
  success: boolean;
  output: string;
  error?: string;
  filesRemoved: string[];
  filesModified: string[];
}

// Structured output interfaces for MCP tools
export interface ToolExecutionContext {
  project?: string;
  workingDirectory: string;
  railsVersion?: string;
  projectType?: "application" | "engine" | "gem";
  timestamp: string;
}

export interface StructuredToolOutput {
  success: boolean;
  action: string;
  summary: string;
  context: ToolExecutionContext;
  data?: unknown;
  error?: {
    type: string;
    message: string;
    details?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface GeneratorsListOutput extends StructuredToolOutput {
  action: "list_generators";
  data: {
    generators: RailsGenerator[];
    totalCount: number;
    groupedByNamespace: Record<string, RailsGenerator[]>;
  };
}

export interface GeneratorHelpOutput extends StructuredToolOutput {
  action: "get_generator_help";
  data: {
    generator: GeneratorHelp;
    availableOptions: string[];
    requiredArguments: string[];
  };
}

export interface GenerateOutput extends StructuredToolOutput {
  action: "generate";
  data: {
    generatorName: string;
    arguments: string[];
    options: Record<string, unknown>;
    result: GenerateResult;
    filesCreated: string[];
    filesModified: string[];
  };
}

export interface DestroyOutput extends StructuredToolOutput {
  action: "destroy";
  data: {
    generatorName: string;
    arguments: string[];
    options: Record<string, unknown>;
    result: DestroyResult;
    filesRemoved: string[];
    filesModified: string[];
  };
}
