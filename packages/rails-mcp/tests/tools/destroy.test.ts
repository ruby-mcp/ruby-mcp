import { describe, it, expect, beforeEach } from 'vitest';
import { DestroyTool } from '../../src/tools/destroy.js';
import { RailsClient } from '../../src/api/rails-client.js';
import { ProjectManager } from '../../src/project-manager.js';

describe('DestroyTool - Validation', () => {
  let tool: DestroyTool;
  let client: RailsClient;
  let projectManager: ProjectManager;

  beforeEach(() => {
    client = new RailsClient({ cacheEnabled: false });
    projectManager = new ProjectManager([{ name: 'test', path: '/test/path' }]);
    tool = new DestroyTool({ client, projectManager });
  });

  describe('input validation', () => {
    it('should reject missing generator_name', async () => {
      const result = await tool.execute({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Required');
    });

    it('should reject empty generator_name', async () => {
      const result = await tool.execute({ generator_name: '' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Generator name cannot be empty'
      );
    });

    it('should reject generator_name that is too long', async () => {
      const longName = 'a'.repeat(101);
      const result = await tool.execute({ generator_name: longName });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Generator name too long');
    });

    it('should accept valid generator_name', async () => {
      const result = await tool.execute({ generator_name: 'model' });
      expect(result.isError).toBe(true);
      // Should fail on Rails project check, not validation
      expect(result.content[0].text).toContain('Not a Rails project');
    });

    it('should reject invalid project name', async () => {
      const result = await tool.execute({
        generator_name: 'model',
        project: 'nonexistent',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Project not found: nonexistent'
      );
    });

    it('should accept valid project name', async () => {
      const result = await tool.execute({
        generator_name: 'model',
        project: 'test',
      });
      expect(result.isError).toBe(true);
      // Will fail on Rails project check, but project name validation passes
      expect(result.content[0].text).toContain('Not a Rails project');
    });
  });

  describe('schema validation', () => {
    it('should accept valid arguments array', async () => {
      const result = await tool.execute({
        generator_name: 'model',
        arguments: ['User', 'name:string', 'email:string'],
      });
      expect(result.isError).toBe(true);
      // Should fail on Rails check, not validation
      expect(result.content[0].text).not.toContain('Validation failed');
    });

    it('should accept valid options object', async () => {
      const result = await tool.execute({
        generator_name: 'model',
        arguments: ['User'],
        options: {
          force: true,
          skip_migration: false,
          database: 'postgresql',
        },
      });
      expect(result.isError).toBe(true);
      // Should fail on Rails check, not validation
      expect(result.content[0].text).not.toContain('Validation failed');
    });

    it('should accept empty arrays and objects for optional fields', async () => {
      const result = await tool.execute({
        generator_name: 'model',
        arguments: [],
        options: {},
      });
      expect(result.isError).toBe(true);
      // Should fail on Rails check, not validation
      expect(result.content[0].text).not.toContain('Validation failed');
    });

    it('should default arguments and options when not provided', async () => {
      const result = await tool.execute({ generator_name: 'model' });
      expect(result.isError).toBe(true);
      // Should fail on Rails check, not validation
      expect(result.content[0].text).not.toContain('Validation failed');
    });

    it('should reject invalid option types', async () => {
      const result = await tool.execute({
        generator_name: 'model',
        options: {
          invalid: 123, // number is not allowed
        },
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('should accept string array options', async () => {
      const result = await tool.execute({
        generator_name: 'controller',
        arguments: ['Posts'],
        options: {
          actions: ['index', 'show', 'create'],
        },
      });
      expect(result.isError).toBe(true);
      // Should fail on Rails check, not validation
      expect(result.content[0].text).not.toContain('Validation failed');
    });
  });

  describe('project resolution', () => {
    it('should use current directory when no project specified', async () => {
      const toolWithoutManager = new DestroyTool({ client });
      const result = await toolWithoutManager.execute({
        generator_name: 'model',
      });
      expect(result.isError).toBe(true);
      // Should fail on Rails project check since we're not in a Rails project
      expect(result.content[0].text).toContain('Not a Rails project');
    });

    it('should resolve project path through project manager', async () => {
      const result = await tool.execute({
        generator_name: 'model',
        project: 'test',
      });
      expect(result.isError).toBe(true);
      // The error message should reference the resolved path
      expect(result.content[0].text).toContain('/test/path');
    });
  });
});
