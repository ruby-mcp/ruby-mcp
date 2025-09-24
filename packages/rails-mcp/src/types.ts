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
  type: 'boolean' | 'string' | 'array';
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
  type: 'string' | 'array';
}

export interface RailsProjectInfo {
  isRailsProject: boolean;
  railsVersion?: string;
  projectType?: 'application' | 'engine' | 'gem';
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
