import { describe, it, expect, beforeEach } from 'vitest';
import { GeneratorHelpTool } from '../../src/tools/generator-help.js';
import { RailsClient } from '../../src/api/rails-client.js';
import { ProjectManager } from '../../src/project-manager.js';

describe('GeneratorHelpTool - Validation', () => {
  let tool: GeneratorHelpTool;
  let client: RailsClient;
  let projectManager: ProjectManager;

  beforeEach(() => {
    client = new RailsClient({ cacheEnabled: false });
    projectManager = new ProjectManager([{ name: 'test', path: '/test/path' }]);
    tool = new GeneratorHelpTool({ client, projectManager });
  });

  describe('input validation', () => {
    it('should require generator_name', async () => {
      const result = await tool.execute({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation failed');
      expect(result.content[0].text).toContain('Required');
    });

    it('should accept valid generator_name', async () => {
      const result = await tool.execute({ generator_name: 'model' });
      expect(result.isError).toBe(true);
      // Will fail on Rails project check, but validation passes
      expect(result.content[0].text).toContain('Not a Rails project');
    });

    it('should reject invalid project name', async () => {
      const result = await tool.execute({ 
        generator_name: 'model',
        project: 'nonexistent' 
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Project not found: nonexistent');
    });
  });

  describe('schema validation', () => {
    it('should validate generator_name is string', async () => {
      const result = await tool.execute({ generator_name: 123 });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation failed');
    });

    it('should validate generator_name is not empty', async () => {
      const result = await tool.execute({ generator_name: '' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation failed');
      expect(result.content[0].text).toContain('Generator name cannot be empty');
    });
  });
});