/**
 * Integration tests for full command-line argument parsing including quotes
 */

import { describe, it, expect } from 'vitest';

// Helper function to simulate the parseCommandLineArgs function from index.ts
function parseCommandLineArgs(args: string[]) {
  const projects: Array<{ name: string; path: string }> = [];
  let quoteConfig = { gemfile: 'single' as const, gemspec: 'double' as const };

  // Simulate parseQuoteStyle function
  function parseQuoteStyle(value: string) {
    const normalized = value.toLowerCase().trim();
    if (normalized === 'single' || normalized === "'") {
      return 'single' as const;
    } else if (normalized === 'double' || normalized === '"') {
      return 'double' as const;
    } else {
      throw new Error(
        `Invalid quote style: ${value}. Must be 'single' or 'double'`
      );
    }
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--project=')) {
      const projectDef = arg.substring('--project='.length);
      const colonIndex = projectDef.indexOf(':');

      if (colonIndex === -1) {
        const path = projectDef;
        const name = path.split('/').pop() || 'unnamed';
        projects.push({ name, path });
      } else {
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
      const projectDef = args[i + 1];
      const colonIndex = projectDef.indexOf(':');

      if (colonIndex === -1) {
        const path = projectDef;
        const name = path.split('/').pop() || 'unnamed';
        projects.push({ name, path });
      } else {
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
    } else if (arg.startsWith('--quotes=')) {
      const quoteValue = arg.substring('--quotes='.length);
      try {
        const quoteStyle = parseQuoteStyle(quoteValue);
        quoteConfig = {
          gemfile: quoteStyle,
          gemspec: quoteStyle,
        };
      } catch (error) {
        throw new Error(
          `Invalid quotes option: ${arg}. Expected --quotes=single or --quotes=double`
        );
      }
    } else if (arg === '--quotes' && i + 1 < args.length) {
      const quoteValue = args[i + 1];
      try {
        const quoteStyle = parseQuoteStyle(quoteValue);
        quoteConfig = {
          gemfile: quoteStyle,
          gemspec: quoteStyle,
        };
      } catch (error) {
        throw new Error(
          `Invalid quotes option: --quotes ${quoteValue}. Expected --quotes single or --quotes double`
        );
      }
      i++; // Skip the next argument as we've consumed it
    }
  }

  return { projects, quoteConfig };
}

describe('Command Line Arguments Parsing', () => {
  describe('quotes parsing with equals format', () => {
    it('should parse --quotes=single', () => {
      const args = ['--quotes=single'];
      const { quoteConfig } = parseCommandLineArgs(args);

      expect(quoteConfig).toEqual({
        gemfile: 'single',
        gemspec: 'single',
      });
    });

    it('should parse --quotes=double', () => {
      const args = ['--quotes=double'];
      const { quoteConfig } = parseCommandLineArgs(args);

      expect(quoteConfig).toEqual({
        gemfile: 'double',
        gemspec: 'double',
      });
    });

    it('should handle case insensitive quotes values', () => {
      const args1 = ['--quotes=SINGLE'];
      const args2 = ['--quotes=Double'];
      
      const { quoteConfig: config1 } = parseCommandLineArgs(args1);
      const { quoteConfig: config2 } = parseCommandLineArgs(args2);

      expect(config1.gemfile).toBe('single');
      expect(config2.gemfile).toBe('double');
    });

    it('should throw error for invalid quotes value', () => {
      const args = ['--quotes=invalid'];

      expect(() => parseCommandLineArgs(args)).toThrow(/Invalid quotes option/);
    });
  });

  describe('quotes parsing with space-separated format', () => {
    it('should parse --quotes single', () => {
      const args = ['--quotes', 'single'];
      const { quoteConfig } = parseCommandLineArgs(args);

      expect(quoteConfig).toEqual({
        gemfile: 'single',
        gemspec: 'single',
      });
    });

    it('should parse --quotes double', () => {
      const args = ['--quotes', 'double'];
      const { quoteConfig } = parseCommandLineArgs(args);

      expect(quoteConfig).toEqual({
        gemfile: 'double',
        gemspec: 'double',
      });
    });

    it('should handle quotes with quote characters', () => {
      const args1 = ['--quotes', "'"];
      const args2 = ['--quotes', '"'];
      
      const { quoteConfig: config1 } = parseCommandLineArgs(args1);
      const { quoteConfig: config2 } = parseCommandLineArgs(args2);

      expect(config1.gemfile).toBe('single');
      expect(config2.gemfile).toBe('double');
    });

    it('should ignore incomplete quotes args at end of list', () => {
      const args = ['--quotes'];
      const { quoteConfig } = parseCommandLineArgs(args);

      // Should use default config
      expect(quoteConfig).toEqual({
        gemfile: 'single',
        gemspec: 'double',
      });
    });

    it('should throw error for invalid space-separated quotes value', () => {
      const args = ['--quotes', 'invalid'];

      expect(() => parseCommandLineArgs(args)).toThrow(/Invalid quotes option/);
    });
  });

  describe('mixed arguments parsing', () => {
    it('should parse both projects and quotes in equals format', () => {
      const args = [
        '--project=app1:/path/to/app1',
        '--quotes=double',
        '--project=app2:/path/to/app2',
      ];
      const { projects, quoteConfig } = parseCommandLineArgs(args);

      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({ name: 'app1', path: '/path/to/app1' });
      expect(projects[1]).toEqual({ name: 'app2', path: '/path/to/app2' });
      expect(quoteConfig).toEqual({
        gemfile: 'double',
        gemspec: 'double',
      });
    });

    it('should parse both projects and quotes in space-separated format', () => {
      const args = [
        '--project', 'app1:/path/to/app1',
        '--quotes', 'double',
        '--project', 'app2:/path/to/app2',
      ];
      const { projects, quoteConfig } = parseCommandLineArgs(args);

      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({ name: 'app1', path: '/path/to/app1' });
      expect(projects[1]).toEqual({ name: 'app2', path: '/path/to/app2' });
      expect(quoteConfig).toEqual({
        gemfile: 'double',
        gemspec: 'double',
      });
    });

    it('should handle mixed equals and space-separated formats', () => {
      const args = [
        '--project=app1:/path/to/app1',
        '--quotes', 'double',
        '--project', 'app2:/path/to/app2',
        '--quotes=single',
      ];
      const { projects, quoteConfig } = parseCommandLineArgs(args);

      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({ name: 'app1', path: '/path/to/app1' });
      expect(projects[1]).toEqual({ name: 'app2', path: '/path/to/app2' });
      // Last quotes setting should win
      expect(quoteConfig).toEqual({
        gemfile: 'single',
        gemspec: 'single',
      });
    });

    it('should simulate .mcp.json format exactly', () => {
      // This simulates the exact args from .mcp.json
      const args = [
        './packages/gems-mcp/dist/index.js',
        '--project',
        'dummy-rails:./fixtures/dummy-rails',
        '--project',
        'dummy-gem:./fixtures/dummy-gem',
        '--quotes',
        'double'
      ];
      const { projects, quoteConfig } = parseCommandLineArgs(args);

      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({ 
        name: 'dummy-rails', 
        path: './fixtures/dummy-rails' 
      });
      expect(projects[1]).toEqual({ 
        name: 'dummy-gem', 
        path: './fixtures/dummy-gem' 
      });
      expect(quoteConfig).toEqual({
        gemfile: 'double',
        gemspec: 'double',
      });
    });

    it('should ignore other arguments while parsing projects and quotes', () => {
      const args = [
        '--verbose',
        '--project', 'app:/path/to/app',
        '--debug',
        '--quotes', 'double',
        '--other-flag',
        'some-value',
      ];
      const { projects, quoteConfig } = parseCommandLineArgs(args);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({ name: 'app', path: '/path/to/app' });
      expect(quoteConfig).toEqual({
        gemfile: 'double',
        gemspec: 'double',
      });
    });
  });

  describe('default behavior', () => {
    it('should return default quote config when no quotes specified', () => {
      const args = ['--project=app:/path/to/app'];
      const { quoteConfig } = parseCommandLineArgs(args);

      expect(quoteConfig).toEqual({
        gemfile: 'single',
        gemspec: 'double',
      });
    });

    it('should return empty projects when no projects specified', () => {
      const args = ['--quotes=double'];
      const { projects } = parseCommandLineArgs(args);

      expect(projects).toHaveLength(0);
    });

    it('should handle empty args array', () => {
      const args: string[] = [];
      const { projects, quoteConfig } = parseCommandLineArgs(args);

      expect(projects).toHaveLength(0);
      expect(quoteConfig).toEqual({
        gemfile: 'single',
        gemspec: 'double',
      });
    });
  });
});