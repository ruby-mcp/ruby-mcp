/**
 * Tests for ProjectManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ProjectManager, type ProjectConfig } from '../src/project-manager.js';

describe('ProjectManager', () => {
  let tempDir: string;
  let project1Dir: string;
  let project2Dir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'project-manager-test-'));
    project1Dir = join(tempDir, 'project1');
    project2Dir = join(tempDir, 'project2');

    // Create test project directories
    await fs.mkdir(project1Dir, { recursive: true });
    await fs.mkdir(project2Dir, { recursive: true });

    // Create test files
    await fs.writeFile(
      join(project1Dir, 'Gemfile'),
      'source "https://rubygems.org"\\ngem "rails"'
    );
    await fs.writeFile(
      join(project2Dir, 'Gemfile'),
      'source "https://rubygems.org"\\ngem "sinatra"'
    );
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true });
  });

  describe('constructor', () => {
    it('should create with default project only', () => {
      const manager = new ProjectManager();

      expect(manager.hasProject('default')).toBe(true);
      expect(manager.getProjectPath()).toBe(process.cwd());
      expect(manager.getProjectNames()).toContain('default');
    });

    it('should create with configured projects', () => {
      const projects: ProjectConfig[] = [
        { name: 'app1', path: project1Dir },
        { name: 'app2', path: project2Dir },
      ];

      const manager = new ProjectManager(projects);

      expect(manager.hasProject('default')).toBe(true);
      expect(manager.hasProject('app1')).toBe(true);
      expect(manager.hasProject('app2')).toBe(true);
      expect(manager.getProjectPath('app1')).toBe(project1Dir);
      expect(manager.getProjectPath('app2')).toBe(project2Dir);
    });

    it('should use custom default path', () => {
      const manager = new ProjectManager([], project1Dir);

      expect(manager.getDefaultProjectPath()).toBe(project1Dir);
      expect(manager.getProjectPath()).toBe(project1Dir);
    });
  });

  describe('addProject', () => {
    let manager: ProjectManager;

    beforeEach(() => {
      manager = new ProjectManager();
    });

    it('should add valid project directory', async () => {
      await manager.addProject('test-project', project1Dir);

      expect(manager.hasProject('test-project')).toBe(true);
      expect(manager.getProjectPath('test-project')).toBe(project1Dir);
    });

    it('should reject non-existent directory', async () => {
      const nonExistentPath = join(tempDir, 'non-existent');

      await expect(
        manager.addProject('bad-project', nonExistentPath)
      ).rejects.toThrow(/Project directory does not exist/);
    });

    it('should reject file instead of directory', async () => {
      const filePath = join(tempDir, 'test-file');
      await fs.writeFile(filePath, 'test content');

      await expect(manager.addProject('bad-project', filePath)).rejects.toThrow(
        /Project path is not a directory/
      );
    });

    it('should handle permission errors gracefully', async () => {
      // This test may not work on all systems due to permission restrictions
      const restrictedDir = join(tempDir, 'restricted');
      await fs.mkdir(restrictedDir, { mode: 0o000 });

      try {
        await expect(
          manager.addProject('restricted', restrictedDir)
        ).rejects.toThrow();
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(restrictedDir, 0o755);
      }
    });
  });

  describe('getProjectPath', () => {
    let manager: ProjectManager;

    beforeEach(async () => {
      const projects: ProjectConfig[] = [{ name: 'app1', path: project1Dir }];
      manager = new ProjectManager(projects);
    });

    it('should return default project path when no name provided', () => {
      const path = manager.getProjectPath();
      expect(path).toBe(process.cwd());
    });

    it('should return specific project path', () => {
      const path = manager.getProjectPath('app1');
      expect(path).toBe(project1Dir);
    });

    it('should throw error for non-existent project', () => {
      expect(() => manager.getProjectPath('non-existent')).toThrow(
        /Project not found: non-existent/
      );
    });
  });

  describe('resolveFilePath', () => {
    let manager: ProjectManager;

    beforeEach(() => {
      const projects: ProjectConfig[] = [
        { name: 'app1', path: project1Dir },
        { name: 'app2', path: project2Dir },
      ];
      manager = new ProjectManager(projects);
    });

    it('should resolve relative path with project', () => {
      const resolved = manager.resolveFilePath('Gemfile', 'app1');
      expect(resolved).toBe(join(project1Dir, 'Gemfile'));
    });

    it('should resolve relative path without project (use default)', () => {
      const resolved = manager.resolveFilePath('Gemfile');
      expect(resolved).toBe(join(process.cwd(), 'Gemfile'));
    });

    it('should return absolute path as-is', () => {
      const absolutePath = '/absolute/path/Gemfile';
      const resolved = manager.resolveFilePath(absolutePath, 'app1');
      expect(resolved).toBe(absolutePath);
    });

    it('should handle nested relative paths', () => {
      const resolved = manager.resolveFilePath('config/database.yml', 'app2');
      expect(resolved).toBe(join(project2Dir, 'config/database.yml'));
    });
  });

  describe('validateProjects', () => {
    it('should validate all accessible projects', async () => {
      const projects: ProjectConfig[] = [
        { name: 'app1', path: project1Dir },
        { name: 'app2', path: project2Dir },
      ];
      const manager = new ProjectManager(projects);

      await expect(manager.validateProjects()).resolves.toBeUndefined();
    });

    it('should reject validation with non-existent project', async () => {
      const badPath = join(tempDir, 'non-existent');
      const projects: ProjectConfig[] = [
        { name: 'app1', path: project1Dir },
        { name: 'bad', path: badPath },
      ];
      const manager = new ProjectManager(projects);

      await expect(manager.validateProjects()).rejects.toThrow(
        /Project validation failed/
      );
    });

    it('should reject validation with file instead of directory', async () => {
      const filePath = join(tempDir, 'test-file');
      await fs.writeFile(filePath, 'test');

      const projects: ProjectConfig[] = [{ name: 'bad', path: filePath }];
      const manager = new ProjectManager(projects);

      await expect(manager.validateProjects()).rejects.toThrow(
        /not a directory/
      );
    });
  });

  describe('utility methods', () => {
    let manager: ProjectManager;

    beforeEach(() => {
      const projects: ProjectConfig[] = [
        { name: 'app1', path: project1Dir },
        { name: 'app2', path: project2Dir },
      ];
      manager = new ProjectManager(projects);
    });

    it('should return all project names', () => {
      const names = manager.getProjectNames();
      expect(names).toContain('default');
      expect(names).toContain('app1');
      expect(names).toContain('app2');
      expect(names).toHaveLength(3);
    });

    it('should check project existence', () => {
      expect(manager.hasProject('app1')).toBe(true);
      expect(manager.hasProject('app2')).toBe(true);
      expect(manager.hasProject('non-existent')).toBe(false);
    });

    it('should return default project path', () => {
      expect(manager.getDefaultProjectPath()).toBe(process.cwd());
    });
  });

  describe('edge cases', () => {
    it('should handle empty project configs array', () => {
      const manager = new ProjectManager([]);

      expect(manager.getProjectNames()).toContain('default');
      expect(manager.hasProject('default')).toBe(true);
    });

    it('should handle project with same name as default', () => {
      const projects: ProjectConfig[] = [
        { name: 'default', path: project1Dir },
      ];
      const manager = new ProjectManager(projects, project1Dir); // Pass custom default path

      // Should use the configured project path
      expect(manager.getProjectPath('default')).toBe(project1Dir);
      expect(manager.getProjectPath()).toBe(project1Dir);
    });

    it('should resolve paths with different separators', () => {
      const projects: ProjectConfig[] = [{ name: 'app1', path: project1Dir }];
      const manager = new ProjectManager(projects);

      const resolved1 = manager.resolveFilePath('config/database.yml', 'app1');
      const resolved2 = manager.resolveFilePath(
        'config\\\\database.yml',
        'app1'
      );

      // Both should be valid (Node.js normalizes path separators)
      expect(resolved1).toBe(join(project1Dir, 'config/database.yml'));
      expect(resolved2).toBe(join(project1Dir, 'config\\\\database.yml'));
    });
  });

  describe('validateProjects edge cases', () => {
    it('should handle multiple project validation errors', async () => {
      // Test with multiple non-existent projects to trigger multiple error paths
      const projects: ProjectConfig[] = [
        { name: 'missing1', path: '/nonexistent/path1' },
        { name: 'missing2', path: '/nonexistent/path2' },
      ];
      const manager = new ProjectManager(projects);

      await expect(manager.validateProjects()).rejects.toThrow(
        'Project validation failed'
      );
    });

    it('should validate successfully with empty projects array', async () => {
      // Test the case where no projects are provided
      const manager = new ProjectManager([]);
      
      // Should not throw any errors
      await expect(manager.validateProjects()).resolves.not.toThrow();
    });
  });
});
