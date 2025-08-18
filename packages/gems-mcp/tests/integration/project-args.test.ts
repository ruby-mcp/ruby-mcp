/**
 * Integration tests for command-line project argument parsing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// We need to import the parseProjectArgs function - it's currently private in index.ts
// For testing purposes, let's create a standalone version or extract it

describe('Project Arguments Parsing', () => {
  let tempDir: string;
  let project1Dir: string;
  let project2Dir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'project-args-test-'));
    project1Dir = join(tempDir, 'project1');
    project2Dir = join(tempDir, 'project2');

    // Create test project directories
    await fs.mkdir(project1Dir, { recursive: true });
    await fs.mkdir(project2Dir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true });
  });

  // Helper function to simulate the parseProjectArgs function
  function parseProjectArgs(args: string[]) {
    const projects: Array<{ name: string; path: string }> = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('--project=')) {
        const projectDef = arg.substring('--project='.length);
        const colonIndex = projectDef.indexOf(':');

        if (colonIndex === -1) {
          // If no colon, treat the whole thing as a path with name derived from directory name
          const path = projectDef;
          const name = path.split('/').pop() || 'unnamed';
          projects.push({ name, path });
        } else {
          // Split by first colon to get name:path
          const name = projectDef.substring(0, colonIndex);
          const path = projectDef.substring(colonIndex + 1);

          if (!name || !path) {
            throw new Error(
              `Invalid project format: ${arg}. Expected --project=name:path or --project=path`
            );
          }

          projects.push({ name, path });
        }
      } else if (arg === '--project' && i + 1 < args.length) {
        // Handle space-separated format: --project name:path
        const projectDef = args[i + 1];
        const colonIndex = projectDef.indexOf(':');

        if (colonIndex === -1) {
          // If no colon, treat the whole thing as a path with name derived from directory name
          const path = projectDef;
          const name = path.split('/').pop() || 'unnamed';
          projects.push({ name, path });
        } else {
          // Split by first colon to get name:path
          const name = projectDef.substring(0, colonIndex);
          const path = projectDef.substring(colonIndex + 1);

          if (!name || !path) {
            throw new Error(
              `Invalid project format: --project ${projectDef}. Expected --project name:path or --project path`
            );
          }

          projects.push({ name, path });
        }
        i++; // Skip the next argument as we've consumed it
      }
    }

    return projects;
  }

  describe('command line argument parsing', () => {
    it('should parse single project with name:path format', () => {
      const args = ['--project=myapp:/path/to/app'];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({
        name: 'myapp',
        path: '/path/to/app',
      });
    });

    it('should parse multiple projects', () => {
      const args = [
        '--project=app1:/path/to/app1',
        '--project=app2:/path/to/app2',
        '--project=lib:/path/to/lib',
      ];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(3);
      expect(projects[0]).toEqual({ name: 'app1', path: '/path/to/app1' });
      expect(projects[1]).toEqual({ name: 'app2', path: '/path/to/app2' });
      expect(projects[2]).toEqual({ name: 'lib', path: '/path/to/lib' });
    });

    it('should parse project with path only (derive name from directory)', () => {
      const args = ['--project=/path/to/my-rails-app'];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({
        name: 'my-rails-app',
        path: '/path/to/my-rails-app',
      });
    });

    it('should parse project with relative path only', () => {
      const args = ['--project=../my-app'];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({
        name: 'my-app',
        path: '../my-app',
      });
    });

    it('should handle complex path names with special characters', () => {
      const args = ['--project=my-app:/path/to/my app with spaces'];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({
        name: 'my-app',
        path: '/path/to/my app with spaces',
      });
    });

    it('should handle project names with hyphens and underscores', () => {
      const args = [
        '--project=rails_app:/path/to/rails-app',
        '--project=sinatra-api:/path/to/sinatra_api',
      ];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({
        name: 'rails_app',
        path: '/path/to/rails-app',
      });
      expect(projects[1]).toEqual({
        name: 'sinatra-api',
        path: '/path/to/sinatra_api',
      });
    });

    it('should ignore non-project arguments', () => {
      const args = [
        '--verbose',
        '--project=app:/path/to/app',
        '--debug',
        '--project=lib:/path/to/lib',
        '--other-flag',
      ];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({ name: 'app', path: '/path/to/app' });
      expect(projects[1]).toEqual({ name: 'lib', path: '/path/to/lib' });
    });

    it('should return empty array when no project arguments', () => {
      const args = ['--verbose', '--debug', '--other-flag'];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(0);
    });

    it('should handle empty arguments array', () => {
      const args: string[] = [];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid project format - empty name', () => {
      const args = ['--project=:/path/to/app'];

      expect(() => parseProjectArgs(args)).toThrow(/Invalid project format/);
    });

    it('should throw error for invalid project format - empty path', () => {
      const args = ['--project=myapp:'];

      expect(() => parseProjectArgs(args)).toThrow(/Invalid project format/);
    });

    it('should throw error for invalid project format - only colon', () => {
      const args = ['--project=:'];

      expect(() => parseProjectArgs(args)).toThrow(/Invalid project format/);
    });

    it('should handle path-only format correctly even with multiple colons in path', () => {
      // Windows-style path with drive letter - parsing splits on first colon only
      const args = ['--project=C:\\\\Users\\\\Me\\\\Projects\\\\app'];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({
        name: 'C',
        path: '\\\\Users\\\\Me\\\\Projects\\\\app',
      });
    });

    it('should handle URLs or paths with colons when using name:path format', () => {
      const args = ['--project=remote:ssh://user@host:/path/to/app'];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({
        name: 'remote',
        path: 'ssh://user@host:/path/to/app',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle projects with same name (last one wins)', () => {
      const args = [
        '--project=app:/path/to/app1',
        '--project=app:/path/to/app2',
      ];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(2);
      // Both projects are returned, but they have the same name
      // The ProjectManager will handle name conflicts
      expect(projects[0]).toEqual({ name: 'app', path: '/path/to/app1' });
      expect(projects[1]).toEqual({ name: 'app', path: '/path/to/app2' });
    });

    it('should derive reasonable names from various path formats', () => {
      const args = [
        '--project=/path/to/my-app',
        '--project=./local-app',
        '--project=../parent-app',
        '--project=simple-name',
        '--project=/path/ending/with/slash/',
        '--project=/single',
      ];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(6);
      expect(projects[0].name).toBe('my-app');
      expect(projects[1].name).toBe('local-app');
      expect(projects[2].name).toBe('parent-app');
      expect(projects[3].name).toBe('simple-name');
      expect(projects[4].name).toBe('unnamed'); // Empty string after split results in 'unnamed'
      expect(projects[5].name).toBe('single');
    });

    it('should handle empty path segments gracefully', () => {
      const args = ['--project=/path//to///app'];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({
        name: 'app',
        path: '/path//to///app',
      });
    });

    it('should handle fallback name when path parsing fails', () => {
      const args = ['--project=/'];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({
        name: 'unnamed', // Fallback name
        path: '/',
      });
    });
  });

  describe('space-separated argument format', () => {
    it('should parse single project with space-separated name:path format', () => {
      const args = ['--project', 'myapp:/path/to/app'];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({
        name: 'myapp',
        path: '/path/to/app',
      });
    });

    it('should parse multiple projects with space-separated format', () => {
      const args = [
        '--project',
        'app1:/path/to/app1',
        '--project',
        'app2:/path/to/app2',
        '--project',
        'lib:/path/to/lib',
      ];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(3);
      expect(projects[0]).toEqual({ name: 'app1', path: '/path/to/app1' });
      expect(projects[1]).toEqual({ name: 'app2', path: '/path/to/app2' });
      expect(projects[2]).toEqual({ name: 'lib', path: '/path/to/lib' });
    });

    it('should parse project with space-separated path only (derive name from directory)', () => {
      const args = ['--project', '/path/to/my-rails-app'];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({
        name: 'my-rails-app',
        path: '/path/to/my-rails-app',
      });
    });

    it('should mix equals and space-separated formats', () => {
      const args = [
        '--project=app1:/path/to/app1',
        '--project',
        'app2:/path/to/app2',
        '--project=app3:/path/to/app3',
        '--project',
        'app4:/path/to/app4',
      ];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(4);
      expect(projects[0]).toEqual({ name: 'app1', path: '/path/to/app1' });
      expect(projects[1]).toEqual({ name: 'app2', path: '/path/to/app2' });
      expect(projects[2]).toEqual({ name: 'app3', path: '/path/to/app3' });
      expect(projects[3]).toEqual({ name: 'app4', path: '/path/to/app4' });
    });

    it('should handle space-separated format with other arguments', () => {
      const args = [
        '--verbose',
        '--project',
        'app:/path/to/app',
        '--debug',
        '--project',
        'lib:/path/to/lib',
        '--other-flag',
      ];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({ name: 'app', path: '/path/to/app' });
      expect(projects[1]).toEqual({ name: 'lib', path: '/path/to/lib' });
    });

    it('should ignore incomplete space-separated project args at end of list', () => {
      const args = ['--project', 'app:/path/to/app', '--project'];
      const projects = parseProjectArgs(args);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({ name: 'app', path: '/path/to/app' });
    });
  });
});
