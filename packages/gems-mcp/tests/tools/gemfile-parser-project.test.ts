/**
 * Tests for GemfileParserTool with project manager support
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { GemfileParserTool } from '../../src/tools/gemfile-parser.js';
import {
  ProjectManager,
  type ProjectConfig,
} from '../../src/project-manager.js';

describe('GemfileParserTool with ProjectManager', () => {
  let tool: GemfileParserTool;
  let projectManager: ProjectManager;
  let tempDir: string;
  let project1Dir: string;
  let project2Dir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'gemfile-parser-project-test-'));
    project1Dir = join(tempDir, 'project1');
    project2Dir = join(tempDir, 'project2');

    // Create test project directories
    await fs.mkdir(project1Dir, { recursive: true });
    await fs.mkdir(project2Dir, { recursive: true });

    // Create test Gemfiles
    await fs.writeFile(
      join(project1Dir, 'Gemfile'),
      `
source 'https://rubygems.org'
gem 'rails', '7.0.0'
gem 'pg'
`
    );

    await fs.writeFile(
      join(project2Dir, 'Gemfile'),
      `
source 'https://rubygems.org'
gem 'sinatra', '~> 3.0'
gem 'sequel'
`
    );

    await fs.writeFile(
      join(project1Dir, 'my_gem.gemspec'),
      `
Gem::Specification.new do |spec|
  spec.name = "my_gem"
  spec.version = "1.0.0"
  
  spec.add_dependency "activesupport", "~> 7.0"
  spec.add_development_dependency "rspec", "~> 3.0"
end
`
    );

    // Setup project manager
    const projects: ProjectConfig[] = [
      { name: 'rails-app', path: project1Dir },
      { name: 'sinatra-app', path: project2Dir },
    ];
    projectManager = new ProjectManager(projects);
    tool = new GemfileParserTool({ projectManager });
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true });
  });

  describe('project parameter validation', () => {
    it('should accept valid project parameter', async () => {
      const result = await tool.execute({
        file_path: 'Gemfile',
        project: 'rails-app',
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.gems[0].name).toBe('rails');
    });

    it('should reject invalid project parameter', async () => {
      const result = await tool.execute({
        file_path: 'Gemfile',
        project: 'non-existent-project',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(
        /Project not found: non-existent-project/
      );
    });

    it('should accept empty project parameter and use default', async () => {
      // Create Gemfile in default directory (current working directory)
      const defaultGemfile = join(process.cwd(), 'test-Gemfile');
      await fs.writeFile(
        defaultGemfile,
        `
source 'https://rubygems.org'
gem 'bundler'
`
      );

      try {
        const result = await tool.execute({
          file_path: 'test-Gemfile',
        });

        expect(result.isError).toBeFalsy();
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.gems[0].name).toBe('bundler');
      } finally {
        // Clean up
        await fs.unlink(defaultGemfile);
      }
    });

    it('should reject project parameter that is too long', async () => {
      const result = await tool.execute({
        file_path: 'Gemfile',
        project: 'a'.repeat(101), // Exceeds 100 character limit
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Project name too long/);
    });
  });

  describe('file resolution with projects', () => {
    it('should resolve relative path within specified project', async () => {
      const result = await tool.execute({
        file_path: 'Gemfile',
        project: 'rails-app',
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.path).toBe(join(project1Dir, 'Gemfile'));
      expect(parsed.gems[0].name).toBe('rails');
    });

    it('should resolve relative path in different project', async () => {
      const result = await tool.execute({
        file_path: 'Gemfile',
        project: 'sinatra-app',
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.path).toBe(join(project2Dir, 'Gemfile'));
      expect(parsed.gems[0].name).toBe('sinatra');
    });

    it('should handle nested paths within project', async () => {
      // Create nested structure
      const configDir = join(project1Dir, 'config');
      await fs.mkdir(configDir);
      await fs.writeFile(
        join(configDir, 'Gemfile.extra'),
        `
gem 'redis'
`
      );

      const result = await tool.execute({
        file_path: 'config/Gemfile.extra',
        project: 'rails-app',
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.path).toBe(join(project1Dir, 'config/Gemfile.extra'));
      expect(parsed.gems[0].name).toBe('redis');
    });

    it('should handle absolute paths regardless of project', async () => {
      const absolutePath = join(project2Dir, 'Gemfile');

      const result = await tool.execute({
        file_path: absolutePath,
        project: 'rails-app', // Different project, but absolute path should override
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.path).toBe(absolutePath);
      expect(parsed.gems[0].name).toBe('sinatra'); // Should read sinatra-app's Gemfile
    });
  });

  describe('gemspec parsing with projects', () => {
    it('should parse gemspec files within project', async () => {
      const result = await tool.execute({
        file_path: 'my_gem.gemspec',
        project: 'rails-app',
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.type).toBe('gemspec');
      expect(parsed.path).toBe(join(project1Dir, 'my_gem.gemspec'));
      expect(parsed.gems).toHaveLength(2);

      expect(parsed.gems[0]).toEqual({
        name: 'activesupport',
        requirement: '~> 7.0',
      });

      expect(parsed.gems[1]).toEqual({
        name: 'rspec',
        requirement: '~> 3.0',
        group: ['development'],
      });
    });
  });

  describe('error handling with projects', () => {
    it('should show resolved path in error messages', async () => {
      const result = await tool.execute({
        file_path: 'non-existent.gemfile',
        project: 'rails-app',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(
        /File not found.*project1.*non-existent.gemfile/
      );
    });

    it('should handle project manager errors gracefully', async () => {
      const result = await tool.execute({
        file_path: 'Gemfile',
        project: 'unknown-project',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(
        /Project not found: unknown-project/
      );
    });
  });

  describe('backward compatibility', () => {
    it('should work without project manager (legacy mode)', async () => {
      // Create tool without project manager
      const legacyTool = new GemfileParserTool();
      const absolutePath = join(project1Dir, 'Gemfile');

      const result = await legacyTool.execute({
        file_path: absolutePath,
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.gems[0].name).toBe('rails');
    });

    it('should work with direct file paths even when project manager is available', async () => {
      const absolutePath = join(project2Dir, 'Gemfile');

      const result = await tool.execute({
        file_path: absolutePath,
        // No project parameter - should work with absolute path
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.gems[0].name).toBe('sinatra');
    });
  });
});
