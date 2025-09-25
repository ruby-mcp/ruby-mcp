import { describe, it, expect, beforeEach } from 'vitest';
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
});
