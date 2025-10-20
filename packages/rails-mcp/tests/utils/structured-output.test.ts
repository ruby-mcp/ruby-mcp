import { describe, it, expect } from 'vitest';
import {
  createStructuredResult,
  createStructuredError,
  createExecutionContext,
  generateHumanReadableSummary,
  formatFileList,
  formatGeneratorsList,
  formatGeneratorHelp,
} from '../../src/utils/structured-output.js';
import type {
  StructuredToolOutput,
  RailsProjectInfo,
} from '../../src/types.js';

describe('structured-output utils', () => {
  describe('createStructuredResult', () => {
    it('should create a structured result with success', () => {
      const output: StructuredToolOutput = {
        success: true,
        action: 'test',
        summary: 'Test successful',
        context: {
          workingDirectory: '/test',
          timestamp: new Date().toISOString(),
        },
      };

      const result = createStructuredResult(output, 'Test completed');
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toBe('Test completed');
      expect(result.content[1].text).toContain('Structured Output');
      expect(result.content[1].text).toContain('json');
    });

    it('should create a structured result with error', () => {
      const output: StructuredToolOutput = {
        success: false,
        action: 'test',
        summary: 'Test failed',
        context: {
          workingDirectory: '/test',
          timestamp: new Date().toISOString(),
        },
        error: {
          type: 'test_error',
          message: 'Something went wrong',
        },
      };

      const result = createStructuredResult(output, 'Error occurred');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error occurred');
    });
  });

  describe('createStructuredError', () => {
    it('should create an error with string context', () => {
      const result = createStructuredError(
        'generate',
        'not_found',
        'Generator not found',
        '/project/path'
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Generator not found');
      expect(result.content[1].text).toContain('/project/path');
    });

    it('should create an error with object context', () => {
      const result = createStructuredError(
        'generate',
        'validation_error',
        'Invalid input',
        {
          workingDirectory: '/test',
          project: 'my-app',
        }
      );

      expect(result.isError).toBe(true);
      expect(result.content[1].text).toContain('my-app');
    });

    it('should create an error without context', () => {
      const result = createStructuredError(
        'generate',
        'unknown_error',
        'Unknown error'
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown error');
    });

    it('should handle undefined message', () => {
      const result = createStructuredError('generate', 'error', undefined);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown error');
    });

    it('should include details when provided', () => {
      const result = createStructuredError(
        'generate',
        'error',
        'Main message',
        {},
        'Detailed information here'
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Main message');
      expect(result.content[0].text).toContain(
        'Details: Detailed information here'
      );
    });

    it('should not include details section when not provided', () => {
      const result = createStructuredError('generate', 'error', 'Main message');

      expect(result.isError).toBe(true);
      expect(result.content[0].text).not.toContain('Details:');
    });
  });

  describe('createExecutionContext', () => {
    it('should create execution context with all fields', () => {
      const projectInfo: RailsProjectInfo = {
        isRailsProject: true,
        railsVersion: '7.0.4',
        projectType: 'application',
        rootPath: '/project/root',
      };

      const context = createExecutionContext(projectInfo, 'my-app');

      expect(context.project).toBe('my-app');
      expect(context.workingDirectory).toBe('/project/root');
      expect(context.railsVersion).toBe('7.0.4');
      expect(context.projectType).toBe('application');
      expect(context.timestamp).toBeDefined();
    });

    it('should create execution context without project name', () => {
      const projectInfo: RailsProjectInfo = {
        isRailsProject: true,
        rootPath: '/project/root',
      };

      const context = createExecutionContext(projectInfo);

      expect(context.project).toBeUndefined();
      expect(context.workingDirectory).toBe('/project/root');
      expect(context.timestamp).toBeDefined();
    });

    it('should handle minimal project info', () => {
      const projectInfo: RailsProjectInfo = {
        isRailsProject: false,
        rootPath: '/path',
      };

      const context = createExecutionContext(projectInfo);

      expect(context.workingDirectory).toBe('/path');
      expect(context.railsVersion).toBeUndefined();
      expect(context.projectType).toBeUndefined();
    });
  });

  describe('generateHumanReadableSummary', () => {
    it('should generate summary for successful output', () => {
      const output: StructuredToolOutput = {
        success: true,
        action: 'generate',
        summary: 'Files generated successfully',
        context: {
          workingDirectory: '/app',
          railsVersion: '7.0.4',
          projectType: 'application',
          project: 'my-app',
          timestamp: new Date().toISOString(),
        },
      };

      const summary = generateHumanReadableSummary(output);

      expect(summary).toContain('✅');
      expect(summary).toContain('Files generated successfully');
      expect(summary).toContain('Working Directory: /app');
      expect(summary).toContain('Rails Version: 7.0.4');
      expect(summary).toContain('Project Type: application');
      expect(summary).toContain('Project: my-app');
    });

    it('should generate summary for error output', () => {
      const output: StructuredToolOutput = {
        success: false,
        action: 'generate',
        summary: 'Generation failed',
        context: {
          workingDirectory: '/app',
          timestamp: new Date().toISOString(),
        },
        error: {
          type: 'execution_error',
          message: 'Command failed',
        },
      };

      const summary = generateHumanReadableSummary(output);

      expect(summary).toContain('❌');
      expect(summary).toContain('Generation failed');
      expect(summary).toContain('Error: Command failed');
    });

    it('should include error details when provided', () => {
      const output: StructuredToolOutput = {
        success: false,
        action: 'generate',
        summary: 'Generation failed',
        context: {
          workingDirectory: '/app',
          timestamp: new Date().toISOString(),
        },
        error: {
          type: 'execution_error',
          message: 'Command failed',
          details: 'Exit code 1',
        },
      };

      const summary = generateHumanReadableSummary(output);

      expect(summary).toContain('Details: Exit code 1');
    });

    it('should handle minimal context', () => {
      const output: StructuredToolOutput = {
        success: true,
        action: 'test',
        summary: 'Test passed',
        context: {
          workingDirectory: '/test',
          timestamp: new Date().toISOString(),
        },
      };

      const summary = generateHumanReadableSummary(output);

      expect(summary).toContain('Working Directory: /test');
      expect(summary).not.toContain('Rails Version');
      expect(summary).not.toContain('Project Type');
      expect(summary).not.toContain('Project:');
    });
  });

  describe('formatFileList', () => {
    it('should format non-empty file list', () => {
      const files = [
        'app/models/user.rb',
        'app/controllers/users_controller.rb',
      ];
      const formatted = formatFileList('Files Created', files);

      expect(formatted).toContain('Files Created');
      expect(formatted).toContain('app/models/user.rb');
      expect(formatted).toContain('app/controllers/users_controller.rb');
    });

    it('should return empty string for empty list', () => {
      const formatted = formatFileList('Files Created', []);
      expect(formatted).toBe('');
    });
  });

  describe('formatGeneratorsList', () => {
    it('should format grouped generators list', () => {
      const generators = [
        {
          name: 'model',
          description: 'Generate a model',
          namespace: 'active_record',
        },
        {
          name: 'controller',
          description: 'Generate a controller',
          namespace: 'rails',
        },
        {
          name: 'migration',
          description: 'Generate a migration',
          namespace: 'active_record',
        },
      ];

      const grouped = {
        active_record: [
          {
            name: 'model',
            description: 'Generate a model',
            namespace: 'active_record',
          },
          {
            name: 'migration',
            description: 'Generate a migration',
            namespace: 'active_record',
          },
        ],
        rails: [
          {
            name: 'controller',
            description: 'Generate a controller',
            namespace: 'rails',
          },
        ],
      };

      const formatted = formatGeneratorsList(generators, grouped);

      expect(formatted).toContain('Found 3 generators');
      expect(formatted).toContain('active_record:');
      expect(formatted).toContain('rails:');
      expect(formatted).toContain('`model`');
      expect(formatted).toContain('Generate a model');
    });
  });

  describe('formatGeneratorHelp', () => {
    it('should format complete generator help', () => {
      const help = {
        name: 'model',
        description: 'Generate a new model',
        usage: 'rails generate model NAME [field:type]',
        arguments: [
          { name: 'NAME', description: 'Model name', required: true },
          {
            name: 'field:type',
            description: 'Field definitions',
            required: false,
          },
        ],
        options: [
          {
            name: 'skip-migration',
            description: 'Skip migration file',
            type: 'boolean',
            aliases: ['-s'],
          },
          {
            name: 'force',
            description: 'Overwrite existing files',
            type: 'boolean',
          },
        ],
      };

      const formatted = formatGeneratorHelp(help);

      expect(formatted).toContain('Generator: model');
      expect(formatted).toContain('Generate a new model');
      expect(formatted).toContain('Usage:');
      expect(formatted).toContain('rails generate model NAME');
      expect(formatted).toContain('Arguments:');
      expect(formatted).toContain('`NAME` (required)');
      expect(formatted).toContain('`field:type` (optional)');
      expect(formatted).toContain('Options:');
      expect(formatted).toContain('`--skip-migration` (-s)');
      expect(formatted).toContain('`--force`');
    });

    it('should handle help without arguments', () => {
      const help = {
        name: 'test',
        description: 'Test generator',
        usage: 'rails generate test',
        arguments: [],
        options: [],
      };

      const formatted = formatGeneratorHelp(help);

      expect(formatted).toContain('Generator: test');
      expect(formatted).not.toContain('Arguments:');
      expect(formatted).not.toContain('Options:');
    });

    it('should handle options without aliases', () => {
      const help = {
        name: 'test',
        description: 'Test generator',
        usage: 'rails generate test',
        arguments: [],
        options: [
          {
            name: 'verbose',
            description: 'Verbose output',
            type: 'boolean',
          },
        ],
      };

      const formatted = formatGeneratorHelp(help);

      expect(formatted).toContain('`--verbose`');
      expect(formatted).not.toContain('()');
    });
  });
});
