/**
 * Tests for GemfileParserTool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { GemfileParserTool } from '../../src/tools/gemfile-parser.js';

describe('GemfileParserTool', () => {
  let tool: GemfileParserTool;
  let tempDir: string;

  beforeEach(async () => {
    tool = new GemfileParserTool();
    tempDir = await fs.mkdtemp(join(tmpdir(), 'gemfile-parser-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true });
  });

  describe('input validation', () => {
    it('should reject empty file path', async () => {
      const result = await tool.execute({ file_path: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(
        /Error:.*File path cannot be empty/
      );
    });

    it('should reject missing file_path parameter', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error:/);
    });

    it('should reject very long file paths', async () => {
      const longPath = 'a'.repeat(501);
      const result = await tool.execute({ file_path: longPath });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error:.*File path too long/);
    });
  });

  describe('file system errors', () => {
    it('should handle non-existent files', async () => {
      const result = await tool.execute({ file_path: '/non/existent/file' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error: File not found/);
    });

    it('should handle directory instead of file', async () => {
      const result = await tool.execute({ file_path: tempDir });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error:.*is not a file/);
    });
  });

  describe('Gemfile parsing', () => {
    it('should parse basic Gemfile', async () => {
      const gemfileContent = `
source 'https://rubygems.org'

ruby '3.0.0'

gem 'rails', '7.0.0'
gem 'pg'
gem 'puma', '~> 5.0'
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.execute({ file_path: gemfilePath });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.type).toBe('gemfile');
      expect(parsed.path).toBe(gemfilePath);
      expect(parsed.ruby_version).toBe('3.0.0');
      expect(parsed.source).toBe('https://rubygems.org');
      expect(parsed.gems).toHaveLength(3);

      expect(parsed.gems[0]).toEqual({
        name: 'rails',
        requirement: '7.0.0',
      });

      expect(parsed.gems[1]).toEqual({
        name: 'pg',
      });

      expect(parsed.gems[2]).toEqual({
        name: 'puma',
        requirement: '~> 5.0',
      });
    });

    it('should parse Gemfile with groups', async () => {
      const gemfileContent = `
source 'https://rubygems.org'

gem 'rails'

group :development do
  gem 'byebug'
  gem 'listen'
end

group :test, :development do
  gem 'rspec'
end

group [:production] do
  gem 'pg'
end
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.execute({ file_path: gemfilePath });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.gems).toHaveLength(5);

      // Rails should have no group
      expect(parsed.gems[0]).toEqual({
        name: 'rails',
      });

      // Byebug should be in development group
      expect(parsed.gems[1]).toEqual({
        name: 'byebug',
        group: ['development'],
      });

      // Listen should be in development group
      expect(parsed.gems[2]).toEqual({
        name: 'listen',
        group: ['development'],
      });

      // RSpec should be in test and development groups
      expect(parsed.gems[3]).toEqual({
        name: 'rspec',
        group: ['test', 'development'],
      });

      // PG should be in production group
      expect(parsed.gems[4]).toEqual({
        name: 'pg',
        group: ['production'],
      });
    });

    it('should parse Gemfile with platform restrictions', async () => {
      const gemfileContent = `
source 'https://rubygems.org'

gem 'rails'
gem 'pg', platform: :ruby
gem 'activerecord-jdbcpostgresql-adapter', platforms: [:jruby]
gem 'sqlite3', platforms: [:ruby, :mswin]
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.execute({ file_path: gemfilePath });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.gems).toHaveLength(4);

      expect(parsed.gems[1]).toEqual({
        name: 'pg',
        platform: ['ruby'],
      });

      expect(parsed.gems[2]).toEqual({
        name: 'activerecord-jdbcpostgresql-adapter',
        platform: ['jruby'],
      });

      expect(parsed.gems[3]).toEqual({
        name: 'sqlite3',
        platform: ['ruby', 'mswin'],
      });
    });

    it('should parse Gemfile with git and path sources', async () => {
      const gemfileContent = `
source 'https://rubygems.org'

gem 'rails'
gem 'my_gem', git: 'https://github.com/user/my_gem.git'
gem 'local_gem', path: '../local_gem'
gem 'custom_gem', source: 'https://gems.example.com'
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.execute({ file_path: gemfilePath });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.gems).toHaveLength(4);

      expect(parsed.gems[1]).toEqual({
        name: 'my_gem',
        source: 'https://github.com/user/my_gem.git',
      });

      expect(parsed.gems[2]).toEqual({
        name: 'local_gem',
        source: '../local_gem',
      });

      expect(parsed.gems[3]).toEqual({
        name: 'custom_gem',
        source: 'https://gems.example.com',
      });
    });

    it('should handle comments and empty lines', async () => {
      const gemfileContent = `
# This is a comment
source 'https://rubygems.org'

# Another comment
ruby '3.0.0'

# Main gems
gem 'rails', '7.0.0' # inline comment

# Empty line above
gem 'pg'
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.execute({ file_path: gemfilePath });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.ruby_version).toBe('3.0.0');
      expect(parsed.source).toBe('https://rubygems.org');
      expect(parsed.gems).toHaveLength(2);
      expect(parsed.gems[0].name).toBe('rails');
      expect(parsed.gems[1].name).toBe('pg');
    });
  });

  describe('.gemspec parsing', () => {
    it('should parse basic gemspec', async () => {
      const gemspecContent = `
# -*- encoding: utf-8 -*-
require_relative 'lib/my_gem/version'

Gem::Specification.new do |spec|
  spec.name = 'my_gem'
  spec.version = MyGem::VERSION
  spec.required_ruby_version = '>= 2.7.0'

  spec.add_dependency 'activesupport', '~> 7.0'
  spec.add_dependency 'nokogiri'

  spec.add_development_dependency 'rspec', '~> 3.10'
  spec.add_development_dependency 'rubocop'
end
`;
      const gemspecPath = join(tempDir, 'my_gem.gemspec');
      await fs.writeFile(gemspecPath, gemspecContent);

      const result = await tool.execute({ file_path: gemspecPath });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.type).toBe('gemspec');
      expect(parsed.path).toBe(gemspecPath);
      expect(parsed.ruby_version).toBe('>= 2.7.0');
      expect(parsed.gems).toHaveLength(4);

      expect(parsed.gems[0]).toEqual({
        name: 'activesupport',
        requirement: '~> 7.0',
      });

      expect(parsed.gems[1]).toEqual({
        name: 'nokogiri',
      });

      expect(parsed.gems[2]).toEqual({
        name: 'rspec',
        requirement: '~> 3.10',
        group: ['development'],
      });

      expect(parsed.gems[3]).toEqual({
        name: 'rubocop',
        group: ['development'],
      });
    });
  });

  describe('file type detection', () => {
    it('should detect Gemfile by name', async () => {
      const gemfileContent = 'gem "rails"';
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.execute({ file_path: gemfilePath });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.type).toBe('gemfile');
    });

    it('should detect gemspec by extension', async () => {
      const gemspecContent = 'spec.add_dependency "rails"';
      const gemspecPath = join(tempDir, 'test.gemspec');
      await fs.writeFile(gemspecPath, gemspecContent);

      const result = await tool.execute({ file_path: gemspecPath });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.type).toBe('gemspec');
    });

    it('should auto-detect gemspec by content', async () => {
      const gemspecContent = `
Gem::Specification.new do |spec|
  spec.add_dependency "rails"
end
`;
      const unknownPath = join(tempDir, 'unknown_file.rb');
      await fs.writeFile(unknownPath, gemspecContent);

      const result = await tool.execute({ file_path: unknownPath });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.type).toBe('gemspec');
    });

    it('should default to gemfile parsing for unknown files', async () => {
      const gemfileContent = 'gem "rails"';
      const unknownPath = join(tempDir, 'unknown_file.txt');
      await fs.writeFile(unknownPath, gemfileContent);

      const result = await tool.execute({ file_path: unknownPath });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.type).toBe('gemfile');
    });
  });

  describe('real fixture files', () => {
    it('should parse the dummy Rails Gemfile', async () => {
      const railsGemfilePath = join(
        process.cwd(),
        '../../fixtures/dummy-rails/Gemfile'
      );

      const result = await tool.execute({ file_path: railsGemfilePath });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.type).toBe('gemfile');
      expect(parsed.source).toBe('https://rubygems.org');
      expect(parsed.gems.length).toBeGreaterThan(0);

      // Check that it found some common Rails gems
      const gemNames = parsed.gems.map((gem: { name: string }) => gem.name);
      expect(gemNames).toContain('rails');
    });

    it('should parse the dummy gem gemspec', async () => {
      const gemspecPath = join(
        process.cwd(),
        '../../fixtures/dummy-gem/dummy-gem.gemspec'
      );

      const result = await tool.execute({ file_path: gemspecPath });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.type).toBe('gemspec');
      expect(parsed.ruby_version).toBe('>= 3.1.0');

      // The dummy gem has no dependencies since they're commented out in the template
      // This is expected behavior - the parser should handle files with no dependencies gracefully
      expect(parsed.gems.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty files', async () => {
      const emptyPath = join(tempDir, 'empty.gemfile');
      await fs.writeFile(emptyPath, '');

      const result = await tool.execute({ file_path: emptyPath });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.gems).toHaveLength(0);
      expect(parsed.type).toBe('gemfile');
    });

    it('should handle files with only comments', async () => {
      const commentOnlyContent = `
# This is a comment
# Another comment
# Yet another comment
`;
      const commentOnlyPath = join(tempDir, 'comments_only.gemfile');
      await fs.writeFile(commentOnlyPath, commentOnlyContent);

      const result = await tool.execute({ file_path: commentOnlyPath });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.gems).toHaveLength(0);
      expect(parsed.type).toBe('gemfile');
    });

    it('should handle malformed gem declarations gracefully', async () => {
      const malformedContent = `
source 'https://rubygems.org'
gem 'valid_gem'
gem # malformed
gem invalid syntax here
gem 'another_valid_gem', '1.0.0'
`;
      const malformedPath = join(tempDir, 'malformed.gemfile');
      await fs.writeFile(malformedPath, malformedContent);

      const result = await tool.execute({ file_path: malformedPath });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      // Should only parse the valid gems
      expect(parsed.gems).toHaveLength(2);
      expect(parsed.gems[0].name).toBe('valid_gem');
      expect(parsed.gems[1].name).toBe('another_valid_gem');
    });
  });
});
