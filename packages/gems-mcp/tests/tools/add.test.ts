import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { GemAddTool } from '../../src/tools/add.js';
import { ProjectManager } from '../../src/project-manager.js';

describe('GemAddTool', () => {
  let tempDir: string;
  let tool: GemAddTool;
  let projectManager: ProjectManager;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(join(tmpdir(), 'gem-add-test-'));
    projectManager = new ProjectManager([{ name: 'test', path: tempDir }]);
    tool = new GemAddTool({ projectManager });
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('executeAddToGemfile', () => {
    it('should add a gem without version to an empty Gemfile', async () => {
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, 'source "https://rubygems.org"\n');

      const result = await tool.executeAddToGemfile({
        gem_name: 'rails',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain("gem 'rails'");
    });

    it('should add a gem with version constraint', async () => {
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, 'source "https://rubygems.org"\n');

      const result = await tool.executeAddToGemfile({
        gem_name: 'rails',
        version: '7.0.0',
        pin_type: '~>',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain("gem 'rails', '~> 7.0.0'");
    });

    it('should add a gem to a specific group', async () => {
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(
        gemfilePath,
        'source "https://rubygems.org"\n\ngem "rails"\n'
      );

      const result = await tool.executeAddToGemfile({
        gem_name: 'rspec',
        group: ['test'],
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain('group :test do');
      expect(content).toContain("  gem 'rspec'");
      expect(content).toContain('end');
    });

    it('should add a gem to multiple groups', async () => {
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, 'source "https://rubygems.org"\n');

      const result = await tool.executeAddToGemfile({
        gem_name: 'pry',
        group: ['development', 'test'],
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain('group :development, :test do');
      expect(content).toContain("  gem 'pry'");
    });

    it('should add a gem with git source', async () => {
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, 'source "https://rubygems.org"\n');

      const result = await tool.executeAddToGemfile({
        gem_name: 'my_gem',
        source: 'https://github.com/user/my_gem.git',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain(
        "gem 'my_gem', git: 'https://github.com/user/my_gem.git'"
      );
    });

    it('should add a gem with path source', async () => {
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, 'source "https://rubygems.org"\n');

      const result = await tool.executeAddToGemfile({
        gem_name: 'local_gem',
        source: '../local_gem',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain("gem 'local_gem', path: '../local_gem'");
    });

    it('should add a gem with require: false', async () => {
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, 'source "https://rubygems.org"\n');

      const result = await tool.executeAddToGemfile({
        gem_name: 'bootsnap',
        require: false,
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain("gem 'bootsnap', require: false");
    });

    it('should add a gem with custom require path', async () => {
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, 'source "https://rubygems.org"\n');

      const result = await tool.executeAddToGemfile({
        gem_name: 'my_gem',
        require: 'my_gem/custom',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain("gem 'my_gem', require: 'my_gem/custom'");
    });

    it('should add to existing group', async () => {
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(
        gemfilePath,
        `source "https://rubygems.org"

group :test do
  gem 'rspec'
end
`
      );

      const result = await tool.executeAddToGemfile({
        gem_name: 'capybara',
        group: ['test'],
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toMatch(
        /group :test do\s+gem 'rspec'\s+gem 'capybara'\s+end/
      );
    });

    it('should error if gem already exists', async () => {
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(
        gemfilePath,
        'source "https://rubygems.org"\n\ngem "rails"\n'
      );

      const result = await tool.executeAddToGemfile({
        gem_name: 'rails',
        file_path: gemfilePath,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('already exists');
    });

    it('should use project manager to resolve file path', async () => {
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, 'source "https://rubygems.org"\n');

      const result = await tool.executeAddToGemfile({
        gem_name: 'rails',
        file_path: 'Gemfile',
        project: 'test',
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain("gem 'rails'");
    });

    it('should handle file not found error', async () => {
      const result = await tool.executeAddToGemfile({
        gem_name: 'rails',
        file_path: join(tempDir, 'nonexistent.rb'),
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File not found');
    });

    it('should validate input parameters', async () => {
      const result = await tool.executeAddToGemfile({
        gem_name: '',
        file_path: 'Gemfile',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });
  });

  describe('executeAddToGemspec', () => {
    it('should add a runtime dependency without version', async () => {
      const gemspecPath = join(tempDir, 'test.gemspec');
      await fs.writeFile(
        gemspecPath,
        `Gem::Specification.new do |spec|
  spec.name = "test"
  spec.version = "1.0.0"
end
`
      );

      const result = await tool.executeAddToGemspec({
        gem_name: 'activesupport',
        file_path: gemspecPath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemspecPath, 'utf-8');
      expect(content).toContain('spec.add_dependency "activesupport"');
    });

    it('should add a runtime dependency with version', async () => {
      const gemspecPath = join(tempDir, 'test.gemspec');
      await fs.writeFile(
        gemspecPath,
        `Gem::Specification.new do |spec|
  spec.name = "test"
  spec.version = "1.0.0"
end
`
      );

      const result = await tool.executeAddToGemspec({
        gem_name: 'rails',
        version: '7.0.0',
        pin_type: '>=',
        file_path: gemspecPath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemspecPath, 'utf-8');
      expect(content).toContain('spec.add_dependency "rails", ">= 7.0.0"');
    });

    it('should add a development dependency', async () => {
      const gemspecPath = join(tempDir, 'test.gemspec');
      await fs.writeFile(
        gemspecPath,
        `Gem::Specification.new do |spec|
  spec.name = "test"
  spec.version = "1.0.0"
end
`
      );

      const result = await tool.executeAddToGemspec({
        gem_name: 'rspec',
        dependency_type: 'development',
        file_path: gemspecPath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemspecPath, 'utf-8');
      expect(content).toContain('spec.add_development_dependency "rspec"');
    });

    it('should add after existing dependencies', async () => {
      const gemspecPath = join(tempDir, 'test.gemspec');
      await fs.writeFile(
        gemspecPath,
        `Gem::Specification.new do |spec|
  spec.name = "test"
  spec.version = "1.0.0"
  spec.add_dependency "rails", "~> 7.0"
end
`
      );

      const result = await tool.executeAddToGemspec({
        gem_name: 'activerecord',
        file_path: gemspecPath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemspecPath, 'utf-8');
      expect(content).toMatch(
        /spec\.add_dependency "rails".*\n.*spec\.add_dependency "activerecord"/
      );
    });

    it('should error if dependency already exists', async () => {
      const gemspecPath = join(tempDir, 'test.gemspec');
      await fs.writeFile(
        gemspecPath,
        `Gem::Specification.new do |spec|
  spec.name = "test"
  spec.version = "1.0.0"
  spec.add_dependency "rails"
end
`
      );

      const result = await tool.executeAddToGemspec({
        gem_name: 'rails',
        file_path: gemspecPath,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('already exists');
    });

    it('should use project manager to resolve file path', async () => {
      const gemspecPath = join(tempDir, 'test.gemspec');
      await fs.writeFile(
        gemspecPath,
        `Gem::Specification.new do |spec|
  spec.name = "test"
  spec.version = "1.0.0"
end
`
      );

      const result = await tool.executeAddToGemspec({
        gem_name: 'rails',
        file_path: 'test.gemspec',
        project: 'test',
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemspecPath, 'utf-8');
      expect(content).toContain('spec.add_dependency "rails"');
    });

    it('should handle missing Gem::Specification block', async () => {
      const gemspecPath = join(tempDir, 'invalid.gemspec');
      await fs.writeFile(gemspecPath, '# Just a comment\n');

      const result = await tool.executeAddToGemspec({
        gem_name: 'rails',
        file_path: gemspecPath,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Could not find Gem::Specification block'
      );
    });

    it('should handle file not found error', async () => {
      const result = await tool.executeAddToGemspec({
        gem_name: 'rails',
        file_path: join(tempDir, 'nonexistent.gemspec'),
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File not found');
    });

    it('should validate input parameters', async () => {
      const result = await tool.executeAddToGemspec({
        gem_name: '',
        file_path: 'test.gemspec',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('should handle different pin types', async () => {
      const gemspecPath = join(tempDir, 'test.gemspec');
      const pinTypes = ['~>', '>=', '>', '<', '<=', '='];

      for (const pin_type of pinTypes) {
        await fs.writeFile(
          gemspecPath,
          `Gem::Specification.new do |spec|
  spec.name = "test"
  spec.version = "1.0.0"
end
`
        );

        const result = await tool.executeAddToGemspec({
          gem_name: `gem_${pin_type.replace(/[<>=~]/g, '')}`,
          version: '1.0.0',
          pin_type: pin_type as '~>' | '>=' | '>' | '<' | '<=' | '=',
          file_path: gemspecPath,
        });

        expect(result.isError).toBeUndefined();
        const content = await fs.readFile(gemspecPath, 'utf-8');
        expect(content).toContain(`"${pin_type} 1.0.0"`);
      }
    });

    it('should handle file not found errors', async () => {
      // Try to add to a non-existent file in a read-only path
      const result = await tool.executeAddToGemfile({
        gem_name: 'rails',
        version: '7.0.0',
        pin_type: '~>',
        file_path: '/nonexistent/path/Gemfile',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: File not found');
    });

    it('should handle non-Error exceptions', async () => {
      const badProjectManager: Pick<
        ProjectManager,
        'getProjectPath' | 'resolveFilePath'
      > = {
        getProjectPath: vi.fn().mockReturnValue(tempDir),
        resolveFilePath: vi.fn().mockImplementation(() => {
          throw 'string error in add tool';
        }),
      };
      const badTool = new GemAddTool({
        projectManager: badProjectManager as ProjectManager,
      });

      const result = await badTool.executeAddToGemfile({
        gem_name: 'rails',
        version: '7.0.0',
        pin_type: '~>',
        file_path: 'Gemfile',
        project: 'test',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Error: Unknown error');
    });
  });
});
