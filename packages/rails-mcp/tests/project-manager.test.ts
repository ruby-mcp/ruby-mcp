import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectManager, type ProjectConfig } from '../src/project-manager.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { promises as fs } from 'fs';

describe('ProjectManager', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = join(tmpdir(), `rails-mcp-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  describe('constructor', () => {
    it('should initialize with no projects', () => {
      const manager = new ProjectManager();
      expect(manager.getProjectNames()).toContain('default');
      expect(manager.getDefaultProjectPath()).toBe(process.cwd());
    });

    it('should initialize with default path', () => {
      const customPath = '/custom/path';
      const manager = new ProjectManager([], customPath);
      expect(manager.getDefaultProjectPath()).toBe(customPath);
    });

    it('should initialize with configured projects', () => {
      const projects: ProjectConfig[] = [
        { name: 'app1', path: '/path/to/app1' },
        { name: 'app2', path: '/path/to/app2' },
      ];

      const manager = new ProjectManager(projects);
      expect(manager.hasProject('app1')).toBe(true);
      expect(manager.hasProject('app2')).toBe(true);
      expect(manager.hasProject('default')).toBe(true);
    });

    it('should resolve relative paths', () => {
      const projects: ProjectConfig[] = [
        { name: 'test', path: './relative/path' },
      ];

      const manager = new ProjectManager(projects);
      const path = manager.getProjectPath('test');
      expect(path).toContain('relative/path');
      expect(path.startsWith('./')).toBe(false);
    });

    it('should not add duplicate default project', () => {
      const projects: ProjectConfig[] = [
        { name: 'default', path: '/custom/default' },
        { name: 'app1', path: '/path/to/app1' },
      ];

      const manager = new ProjectManager(projects);
      expect(manager.getProjectPath('default')).toContain('custom/default');
    });
  });

  describe('addProject', () => {
    it('should add a valid project', async () => {
      const manager = new ProjectManager();
      await manager.addProject('test', tempDir);

      expect(manager.hasProject('test')).toBe(true);
      expect(manager.getProjectPath('test')).toBe(tempDir);
    });

    it('should throw error for non-existent directory', async () => {
      const manager = new ProjectManager();
      const nonExistentPath = join(tempDir, 'nonexistent');

      await expect(manager.addProject('test', nonExistentPath)).rejects.toThrow(
        'Project directory does not exist'
      );
    });

    it('should throw error for file instead of directory', async () => {
      const filePath = join(tempDir, 'file.txt');
      await fs.writeFile(filePath, 'content');

      const manager = new ProjectManager();
      await expect(manager.addProject('test', filePath)).rejects.toThrow(
        'Project path is not a directory'
      );
    });

    it('should resolve relative paths', async () => {
      const manager = new ProjectManager();
      await manager.addProject('test', tempDir);

      const path = manager.getProjectPath('test');
      expect(path).toBe(tempDir);
      expect(path.startsWith('.')).toBe(false);
    });
  });

  describe('getProjectPath', () => {
    it('should return default path when no name provided', () => {
      const manager = new ProjectManager();
      expect(manager.getProjectPath()).toBe(process.cwd());
    });

    it('should return default path for undefined name', () => {
      const manager = new ProjectManager();
      expect(manager.getProjectPath(undefined)).toBe(process.cwd());
    });

    it('should return project path by name', () => {
      const projects: ProjectConfig[] = [
        { name: 'test', path: '/path/to/test' },
      ];

      const manager = new ProjectManager(projects);
      expect(manager.getProjectPath('test')).toContain('path/to/test');
    });

    it('should throw error for non-existent project', () => {
      const manager = new ProjectManager();
      expect(() => manager.getProjectPath('nonexistent')).toThrow(
        'Project not found: nonexistent'
      );
    });

    it('should list available projects in error message', () => {
      const projects: ProjectConfig[] = [
        { name: 'app1', path: '/path/to/app1' },
        { name: 'app2', path: '/path/to/app2' },
      ];

      const manager = new ProjectManager(projects);
      expect(() => manager.getProjectPath('missing')).toThrow(
        /Available projects:/
      );
    });
  });

  describe('resolveFilePath', () => {
    it('should resolve relative file paths', () => {
      const projects: ProjectConfig[] = [
        { name: 'test', path: '/project/root' },
      ];

      const manager = new ProjectManager(projects);
      const resolved = manager.resolveFilePath('app/models/user.rb', 'test');
      expect(resolved).toContain('project/root');
      expect(resolved).toContain('app/models/user.rb');
    });

    it('should return absolute paths as-is', () => {
      const manager = new ProjectManager();
      const absolutePath = '/absolute/path/to/file.rb';
      const resolved = manager.resolveFilePath(absolutePath);
      expect(resolved).toBe(absolutePath);
    });

    it('should use default project when no project name provided', () => {
      const manager = new ProjectManager();
      const resolved = manager.resolveFilePath('Gemfile');
      expect(resolved).toContain('Gemfile');
    });

    it('should throw error for non-existent project', () => {
      const manager = new ProjectManager();
      expect(() => manager.resolveFilePath('file.rb', 'nonexistent')).toThrow(
        'Project not found'
      );
    });
  });

  describe('getProjectNames', () => {
    it('should return all project names', () => {
      const projects: ProjectConfig[] = [
        { name: 'app1', path: '/path/to/app1' },
        { name: 'app2', path: '/path/to/app2' },
      ];

      const manager = new ProjectManager(projects);
      const names = manager.getProjectNames();
      expect(names).toContain('app1');
      expect(names).toContain('app2');
      expect(names).toContain('default');
    });

    it('should return only default for empty projects', () => {
      const manager = new ProjectManager();
      const names = manager.getProjectNames();
      expect(names).toEqual(['default']);
    });
  });

  describe('hasProject', () => {
    it('should return true for existing projects', () => {
      const projects: ProjectConfig[] = [
        { name: 'test', path: '/path/to/test' },
      ];

      const manager = new ProjectManager(projects);
      expect(manager.hasProject('test')).toBe(true);
      expect(manager.hasProject('default')).toBe(true);
    });

    it('should return false for non-existent projects', () => {
      const manager = new ProjectManager();
      expect(manager.hasProject('nonexistent')).toBe(false);
    });
  });

  describe('getDefaultProjectPath', () => {
    it('should return the default project path', () => {
      const manager = new ProjectManager();
      expect(manager.getDefaultProjectPath()).toBe(process.cwd());
    });

    it('should return custom default path if provided', () => {
      const customPath = '/custom/default';
      const manager = new ProjectManager([], customPath);
      expect(manager.getDefaultProjectPath()).toBe(customPath);
    });
  });

  describe('validateProjects', () => {
    it('should validate all projects successfully', async () => {
      const projects: ProjectConfig[] = [{ name: 'test', path: tempDir }];

      const manager = new ProjectManager(projects);
      await expect(manager.validateProjects()).resolves.not.toThrow();
    });

    it('should throw error for non-existent project directory', async () => {
      const projects: ProjectConfig[] = [
        { name: 'bad', path: join(tempDir, 'nonexistent') },
      ];

      const manager = new ProjectManager(projects);
      await expect(manager.validateProjects()).rejects.toThrow(
        /Project validation failed/
      );
      await expect(manager.validateProjects()).rejects.toThrow(
        /directory does not exist/
      );
    });

    it('should throw error for file instead of directory', async () => {
      const filePath = join(tempDir, 'file.txt');
      await fs.writeFile(filePath, 'content');

      const projects: ProjectConfig[] = [{ name: 'bad', path: filePath }];

      const manager = new ProjectManager(projects);
      await expect(manager.validateProjects()).rejects.toThrow(
        /not a directory/
      );
    });

    it('should collect multiple validation errors', async () => {
      const filePath = join(tempDir, 'file.txt');
      await fs.writeFile(filePath, 'content');

      const projects: ProjectConfig[] = [
        { name: 'missing', path: join(tempDir, 'nonexistent') },
        { name: 'file', path: filePath },
      ];

      const manager = new ProjectManager(projects);
      const promise = manager.validateProjects();
      await expect(promise).rejects.toThrow(/Project validation failed/);

      try {
        await promise;
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('missing');
          expect(error.message).toContain('file');
        }
      }
    });
  });
});
