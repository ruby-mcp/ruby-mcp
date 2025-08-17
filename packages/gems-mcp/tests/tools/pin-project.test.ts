/**
 * Tests for GemPinTool with project manager support
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { GemPinTool } from '../../src/tools/pin.js';
import {
  ProjectManager,
  type ProjectConfig,
} from '../../src/project-manager.js';

describe('GemPinTool with ProjectManager', () => {
  let tool: GemPinTool;
  let projectManager: ProjectManager;
  let tempDir: string;
  let project1Dir: string;
  let project2Dir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'gem-pin-project-test-'));
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

gem 'rails'
gem 'pg', '~> 1.0'
gem 'puma'
`
    );

    await fs.writeFile(
      join(project2Dir, 'Gemfile'),
      `
source 'https://rubygems.org'

gem 'sinatra'
gem 'sequel', '>= 5.0'
gem 'thin'
`
    );

    // Setup project manager
    const projects: ProjectConfig[] = [
      { name: 'rails-app', path: project1Dir },
      { name: 'sinatra-app', path: project2Dir },
    ];
    projectManager = new ProjectManager(projects);
    tool = new GemPinTool({ projectManager });
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true });
  });

  describe('pin gem with project parameter', () => {
    it('should pin gem in specified project', async () => {
      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        pin_type: '~>',
        file_path: 'Gemfile',
        project: 'rails-app',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toMatch(
        /Successfully pinned 'rails' to '~> 7.0.0'/
      );
      expect(result.content[0].text).toMatch(/project1.*Gemfile/);

      // Verify the file was actually modified
      const content = await fs.readFile(join(project1Dir, 'Gemfile'), 'utf-8');
      expect(content).toMatch(/gem 'rails', '~> 7.0.0'/);
    });

    it('should pin gem in different project', async () => {
      const result = await tool.executePin({
        gem_name: 'sinatra',
        version: '3.0.5',
        pin_type: '=',
        file_path: 'Gemfile',
        project: 'sinatra-app',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toMatch(
        /Successfully pinned 'sinatra' to '= 3.0.5'/
      );
      expect(result.content[0].text).toMatch(/project2.*Gemfile/);

      // Verify the file was actually modified
      const content = await fs.readFile(join(project2Dir, 'Gemfile'), 'utf-8');
      expect(content).toMatch(/gem 'sinatra', '= 3.0.5'/);
    });

    it('should handle nested file paths within project', async () => {
      // Create nested Gemfile
      const nestedDir = join(project1Dir, 'config');
      await fs.mkdir(nestedDir);
      await fs.writeFile(
        join(nestedDir, 'Gemfile.production'),
        `
gem 'redis'
gem 'sidekiq'
`
      );

      const result = await tool.executePin({
        gem_name: 'redis',
        version: '4.8.0',
        pin_type: '~>',
        file_path: 'config/Gemfile.production',
        project: 'rails-app',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toMatch(
        /Successfully pinned 'redis' to '~> 4.8.0'/
      );

      // Verify the nested file was modified
      const content = await fs.readFile(
        join(nestedDir, 'Gemfile.production'),
        'utf-8'
      );
      expect(content).toMatch(/gem 'redis', '~> 4.8.0'/);
    });

    it('should handle absolute paths regardless of project parameter', async () => {
      const absolutePath = join(project2Dir, 'Gemfile');

      const result = await tool.executePin({
        gem_name: 'sequel',
        version: '5.70.0',
        pin_type: '~>',
        file_path: absolutePath,
        project: 'rails-app', // Different project, but absolute path should take precedence
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toMatch(
        /Successfully pinned 'sequel' to '~> 5.70.0'/
      );

      // Verify the correct file was modified (project2, not project1)
      const content = await fs.readFile(join(project2Dir, 'Gemfile'), 'utf-8');
      expect(content).toMatch(/gem 'sequel', '~> 5.70.0'/);
    });

    it('should preserve existing gem options when pinning', async () => {
      // Create Gemfile with gem options
      await fs.writeFile(
        join(project1Dir, 'Gemfile'),
        `
source 'https://rubygems.org'

gem 'rails', require: false, group: :development
gem 'pg' # Database adapter
`
      );

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        pin_type: '~>',
        file_path: 'Gemfile',
        project: 'rails-app',
      });

      expect(result.isError).toBeFalsy();

      const content = await fs.readFile(join(project1Dir, 'Gemfile'), 'utf-8');
      expect(content).toMatch(
        /gem 'rails', '~> 7.0.0', require: false, group: :development/
      );
    });
  });

  describe('unpin gem with project parameter', () => {
    it('should unpin gem in specified project', async () => {
      const result = await tool.executeUnpin({
        gem_name: 'pg',
        file_path: 'Gemfile',
        project: 'rails-app',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toMatch(/Successfully unpinned 'pg'/);
      expect(result.content[0].text).toMatch(/project1.*Gemfile/);

      // Verify the version constraint was removed
      const content = await fs.readFile(join(project1Dir, 'Gemfile'), 'utf-8');
      expect(content).toMatch(/gem 'pg'$/m);
      expect(content).not.toMatch(/gem 'pg', '~> 1.0'/);
    });

    it('should unpin gem in different project', async () => {
      const result = await tool.executeUnpin({
        gem_name: 'sequel',
        file_path: 'Gemfile',
        project: 'sinatra-app',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toMatch(/Successfully unpinned 'sequel'/);

      // Verify the version constraint was removed
      const content = await fs.readFile(join(project2Dir, 'Gemfile'), 'utf-8');
      expect(content).toMatch(/gem 'sequel'$/m);
      expect(content).not.toMatch(/gem 'sequel', '>= 5.0'/);
    });

    it('should preserve gem options when unpinning', async () => {
      // Create Gemfile with gem options
      await fs.writeFile(
        join(project1Dir, 'Gemfile'),
        `
source 'https://rubygems.org'

gem 'pg', '~> 1.0', require: false # Database
gem 'rails'
`
      );

      const result = await tool.executeUnpin({
        gem_name: 'pg',
        file_path: 'Gemfile',
        project: 'rails-app',
      });

      expect(result.isError).toBeFalsy();

      const content = await fs.readFile(join(project1Dir, 'Gemfile'), 'utf-8');
      expect(content).toMatch(/gem 'pg', require: false # Database/);
      expect(content).not.toMatch(/~> 1.0/);
    });
  });

  describe('error handling with projects', () => {
    it('should handle invalid project name in pin operation', async () => {
      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: 'Gemfile',
        project: 'non-existent-project',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(
        /Project not found: non-existent-project/
      );
    });

    it('should handle invalid project name in unpin operation', async () => {
      const result = await tool.executeUnpin({
        gem_name: 'pg',
        file_path: 'Gemfile',
        project: 'non-existent-project',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(
        /Project not found: non-existent-project/
      );
    });

    it('should handle non-existent file in project', async () => {
      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: 'non-existent-gemfile',
        project: 'rails-app',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(
        /File not found.*project1.*non-existent-gemfile/
      );
    });

    it('should handle gem not found in project file', async () => {
      const result = await tool.executePin({
        gem_name: 'non-existent-gem',
        version: '1.0.0',
        file_path: 'Gemfile',
        project: 'rails-app',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(
        /Gem 'non-existent-gem' not found.*project1/
      );
    });
  });

  describe('project parameter validation', () => {
    it('should reject project parameter that is too long', async () => {
      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: 'Gemfile',
        project: 'a'.repeat(101), // Exceeds 100 character limit
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Project name too long/);
    });

    it('should work without project parameter (default project)', async () => {
      // Create Gemfile in default directory (current working directory)
      const defaultGemfile = join(process.cwd(), 'test-Gemfile-pin');
      await fs.writeFile(
        defaultGemfile,
        `
source 'https://rubygems.org'
gem 'bundler'
`
      );

      try {
        const result = await tool.executePin({
          gem_name: 'bundler',
          version: '2.4.0',
          file_path: 'test-Gemfile-pin',
          // No project parameter
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toMatch(
          /Successfully pinned 'bundler' to '~> 2.4.0'/
        );

        const content = await fs.readFile(defaultGemfile, 'utf-8');
        expect(content).toMatch(/gem 'bundler', '~> 2.4.0'/);
      } finally {
        // Clean up
        await fs.unlink(defaultGemfile);
      }
    });
  });

  describe('backward compatibility', () => {
    it('should work without project manager (legacy mode)', async () => {
      // Create tool without project manager
      const legacyTool = new GemPinTool();
      const absolutePath = join(project1Dir, 'Gemfile');

      const result = await legacyTool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: absolutePath,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toMatch(
        /Successfully pinned 'rails' to '~> 7.0.0'/
      );
    });

    it('should work with direct file paths when project manager is available', async () => {
      const absolutePath = join(project2Dir, 'Gemfile');

      const result = await tool.executePin({
        gem_name: 'sinatra',
        version: '3.0.0',
        file_path: absolutePath,
        // No project parameter - should work with absolute path
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toMatch(
        /Successfully pinned 'sinatra' to '~> 3.0.0'/
      );

      const content = await fs.readFile(absolutePath, 'utf-8');
      expect(content).toMatch(/gem 'sinatra', '~> 3.0.0'/);
    });
  });
});
