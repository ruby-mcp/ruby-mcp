import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { GemAddTool } from '../../src/tools/add.js';
import { GemPinTool } from '../../src/tools/pin.js';
import { ProjectManager } from '../../src/project-manager.js';

describe('Quote Integration Tests', () => {
  let tempDir: string;
  let projectManager: ProjectManager;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(join(tmpdir(), 'quote-integration-test-'));
    projectManager = new ProjectManager([{ name: 'test', path: tempDir }]);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('GemAddTool with quotes', () => {
    it('should add gem with single quotes when configured', async () => {
      const tool = new GemAddTool({
        projectManager,
        quoteConfig: { gemfile: 'single', gemspec: 'double' },
      });

      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, 'source "https://rubygems.org"\n');

      const result = await tool.executeAddToGemfile({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain("gem 'rails', '~> 7.0.0'");
    });

    it('should add gem with double quotes when configured', async () => {
      const tool = new GemAddTool({
        projectManager,
        quoteConfig: { gemfile: 'double', gemspec: 'double' },
      });

      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, 'source "https://rubygems.org"\n');

      const result = await tool.executeAddToGemfile({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain('gem "rails", "~> 7.0.0"');
    });

    it('should override global config with quote_style parameter', async () => {
      const tool = new GemAddTool({
        projectManager,
        quoteConfig: { gemfile: 'single', gemspec: 'double' },
      });

      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, 'source "https://rubygems.org"\n');

      const result = await tool.executeAddToGemfile({
        gem_name: 'rails',
        version: '7.0.0',
        quote_style: 'double',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain('gem "rails", "~> 7.0.0"');
    });

    it('should add gem to gemspec with configured quotes', async () => {
      const tool = new GemAddTool({
        projectManager,
        quoteConfig: { gemfile: 'single', gemspec: 'single' },
      });

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
        file_path: gemspecPath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemspecPath, 'utf-8');
      expect(content).toContain("spec.add_dependency 'rails', '~> 7.0.0'");
    });

    it('should handle all complex options with quotes', async () => {
      const tool = new GemAddTool({
        projectManager,
        quoteConfig: { gemfile: 'double', gemspec: 'double' },
      });

      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, 'source "https://rubygems.org"\n');

      const result = await tool.executeAddToGemfile({
        gem_name: 'my_gem',
        version: '2.0.0',
        pin_type: '>=',
        source: 'https://github.com/user/my_gem.git',
        require: false,
        quote_style: 'single',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain(
        "gem 'my_gem', '>= 2.0.0', git: 'https://github.com/user/my_gem.git', require: false"
      );
    });
  });

  describe('GemPinTool with quotes', () => {
    it('should pin gem preserving existing quote style', async () => {
      const tool = new GemPinTool({
        projectManager,
        quoteConfig: { gemfile: 'double', gemspec: 'double' },
      });

      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(
        gemfilePath,
        'source "https://rubygems.org"\n\ngem \'rails\'\n'
      );

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain("gem 'rails', '~> 7.0.0'");
    });

    it('should pin gem with configured quote style when not detectable', async () => {
      const tool = new GemPinTool({
        projectManager,
        quoteConfig: { gemfile: 'double', gemspec: 'double' },
      });

      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(
        gemfilePath,
        'source "https://rubygems.org"\n\ngem "rails"\n'
      );

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain('gem "rails", "~> 7.0.0"');
    });

    it('should override detection with quote_style parameter', async () => {
      const tool = new GemPinTool({
        projectManager,
        quoteConfig: { gemfile: 'single', gemspec: 'double' },
      });

      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(
        gemfilePath,
        'source "https://rubygems.org"\n\ngem \'rails\'\n'
      );

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        quote_style: 'double',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain('gem "rails", "~> 7.0.0"');
    });

    it('should unpin gem preserving quote style', async () => {
      const tool = new GemPinTool({
        projectManager,
        quoteConfig: { gemfile: 'single', gemspec: 'double' },
      });

      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(
        gemfilePath,
        'source "https://rubygems.org"\n\ngem "rails", "~> 7.0.0"\n'
      );

      const result = await tool.executeUnpin({
        gem_name: 'rails',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      const content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain('gem "rails"');
      expect(content).not.toContain('"~> 7.0.0"');
    });

    it('should handle complex gem lines with quotes', async () => {
      const tool = new GemPinTool({
        projectManager,
        quoteConfig: { gemfile: 'single', gemspec: 'double' },
      });

      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(
        gemfilePath,
        `source "https://rubygems.org"

gem 'rails', require: false # web framework
gem "puma", git: "https://github.com/puma/puma.git"
`
      );

      // Pin rails
      let result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        pin_type: '>=',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      let content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain(
        "gem 'rails', '>= 7.0.0', require: false # web framework"
      );

      // Pin puma with different quote style
      result = await tool.executePin({
        gem_name: 'puma',
        version: '6.0.0',
        quote_style: 'single',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      content = await fs.readFile(gemfilePath, 'utf-8');
      // Pin tool only changes gem name and version quotes, not other attributes
      expect(content).toContain("gem 'puma', '~> 6.0.0'");
      expect(content).toContain('git: "https://github.com/puma/puma.git"');
    });
  });

  describe('Default behavior', () => {
    it('should use default quote config when none provided', async () => {
      const addTool = new GemAddTool({ projectManager });
      const pinTool = new GemPinTool({ projectManager });

      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, 'source "https://rubygems.org"\n');

      // Add gem should use single quotes (default for gemfile)
      let result = await addTool.executeAddToGemfile({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      let content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain("gem 'rails', '~> 7.0.0'");

      // Pin should also use single quotes
      result = await pinTool.executePin({
        gem_name: 'rails',
        version: '7.1.0',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeUndefined();
      content = await fs.readFile(gemfilePath, 'utf-8');
      expect(content).toContain("gem 'rails', '~> 7.1.0'");

      // Gemspec should use double quotes (default for gemspec)
      const gemspecPath = join(tempDir, 'test.gemspec');
      await fs.writeFile(
        gemspecPath,
        `Gem::Specification.new do |spec|
  spec.name = "test"
  spec.version = "1.0.0"
end
`
      );

      result = await addTool.executeAddToGemspec({
        gem_name: 'activerecord',
        version: '7.0.0',
        file_path: gemspecPath,
      });

      expect(result.isError).toBeUndefined();
      content = await fs.readFile(gemspecPath, 'utf-8');
      expect(content).toContain(
        'spec.add_dependency "activerecord", "~> 7.0.0"'
      );
    });
  });
});
