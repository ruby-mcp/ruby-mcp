import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeneratorsTool } from '../../src/tools/generators.js';
import { RailsClient } from '../../src/api/rails-client.js';
import { ProjectManager } from '../../src/project-manager.js';

describe('GeneratorsTool - Validation', () => {
  let tool: GeneratorsTool;
  let client: RailsClient;
  let projectManager: ProjectManager;

  beforeEach(() => {
    client = new RailsClient({ cacheEnabled: false });
    projectManager = new ProjectManager([{ name: 'test', path: '/test/path' }]);
    tool = new GeneratorsTool({ client, projectManager });
  });

  describe('input validation', () => {
    it('should reject invalid input types', async () => {
      const result = await tool.execute({ project: 123 as unknown as string });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation failed');
    });

    it('should accept empty input (all options are optional)', async () => {
      const result = await tool.execute({});
      // Since we can't mock the Rails project check easily,
      // we expect an error about not being a Rails project
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'does not contain a Rails application'
      );
    });

    it('should reject invalid project name', async () => {
      const result = await tool.execute({ project: 'nonexistent' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Project not found: nonexistent'
      );
    });

    it('should accept valid project name', async () => {
      const result = await tool.execute({ project: 'test' });
      expect(result.isError).toBe(true);
      // Will fail on Rails project check, but project name validation passes
      expect(result.content[0].text).toContain(
        'does not contain a Rails application'
      );
    });
  });

  describe('schema validation', () => {
    it('should accept valid project string', async () => {
      const result = await tool.execute({ project: 'valid-project' });
      expect(result.isError).toBe(true);
      // Should fail on Rails check, not validation
      expect(result.content[0].text).not.toContain('Validation failed');
    });

    it('should accept empty object', async () => {
      const result = await tool.execute({});
      expect(result.isError).toBe(true);
      // Should fail on Rails check, not validation
      expect(result.content[0].text).not.toContain('Validation failed');
    });
  });

  describe('execution', () => {
    it('should use process.cwd() when no project manager provided', async () => {
      const toolWithoutManager = new GeneratorsTool({ client });
      const result = await toolWithoutManager.execute({});
      expect(result.isError).toBe(true);
      // Should fail on Rails project check since we're not in a Rails project
      expect(result.content[0].text).toContain(
        'does not contain a Rails application'
      );
    });

    it('should successfully list generators', async () => {
      client.checkRailsProject = vi.fn().mockResolvedValue({
        isRailsProject: true,
        railsVersion: '7.0.0',
        projectType: 'application',
        rootPath: '/test/path',
      });

      client.listGenerators = vi.fn().mockResolvedValue({
        success: true,
        data: [
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
        ],
      });

      const result = await tool.execute({ project: 'test' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Found 3 generators');
      expect(result.content[0].text).toContain('model');
      expect(result.content[0].text).toContain('controller');
      expect(result.content[0].text).toContain('active_record');
    });

    it('should handle list generators execution error', async () => {
      client.checkRailsProject = vi.fn().mockResolvedValue({
        isRailsProject: true,
        railsVersion: '7.0.0',
        projectType: 'application',
        rootPath: '/test/path',
      });

      client.listGenerators = vi.fn().mockResolvedValue({
        success: false,
        error: 'Rails command failed',
        data: null,
      });

      const result = await tool.execute({ project: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to list generators');
      expect(result.content[0].text).toContain('Rails command failed');
    });

    it('should handle unexpected errors', async () => {
      client.checkRailsProject = vi
        .fn()
        .mockRejectedValue(new Error('Unexpected error'));

      const result = await tool.execute({ project: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected error');
    });

    it('should group generators by namespace', async () => {
      client.checkRailsProject = vi.fn().mockResolvedValue({
        isRailsProject: true,
        railsVersion: '7.0.0',
        projectType: 'application',
        rootPath: '/test/path',
      });

      client.listGenerators = vi.fn().mockResolvedValue({
        success: true,
        data: [
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
          {
            name: 'controller',
            description: 'Generate a controller',
            namespace: 'rails',
          },
        ],
      });

      const result = await tool.execute({ project: 'test' });

      expect(result.isError).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('active_record:');
      expect(text).toContain('rails:');
      // Check that model and migration are under active_record
      const arIndex = text.indexOf('active_record:');
      const railsIndex = text.indexOf('rails:');
      const modelIndex = text.indexOf('`model`');
      const migrationIndex = text.indexOf('migration');
      expect(modelIndex).toBeGreaterThan(arIndex);
      expect(modelIndex).toBeLessThan(railsIndex);
      expect(migrationIndex).toBeGreaterThan(arIndex);
      expect(migrationIndex).toBeLessThan(railsIndex);
    });

    it('should handle empty generator list', async () => {
      client.checkRailsProject = vi.fn().mockResolvedValue({
        isRailsProject: true,
        railsVersion: '7.0.0',
        projectType: 'application',
        rootPath: '/test/path',
      });

      client.listGenerators = vi.fn().mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await tool.execute({ project: 'test' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('No generators found');
    });
  });
});
