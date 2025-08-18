/**
 * Tests for GemPinTool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { GemPinTool } from '../../src/tools/pin.js';

describe('GemPinTool', () => {
  let tool: GemPinTool;
  let tempDir: string;

  beforeEach(async () => {
    tool = new GemPinTool();
    tempDir = await fs.mkdtemp(join(tmpdir(), 'gem-pin-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  describe('executePin - input validation', () => {
    it('should reject empty gem name', async () => {
      const result = await tool.executePin({ gem_name: '', version: '1.0.0' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(
        /Error:.*Gem name cannot be empty/
      );
    });

    it('should reject missing gem_name parameter', async () => {
      const result = await tool.executePin({ version: '1.0.0' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error:/);
    });

    it('should reject empty version', async () => {
      const result = await tool.executePin({ gem_name: 'rails', version: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error:.*Version cannot be empty/);
    });

    it('should reject missing version parameter', async () => {
      const result = await tool.executePin({ gem_name: 'rails' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error:/);
    });

    it('should reject invalid gem name format', async () => {
      const result = await tool.executePin({
        gem_name: 'invalid-gem!',
        version: '1.0.0',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error:.*Invalid gem name format/);
    });

    it('should reject invalid version format', async () => {
      const result = await tool.executePin({
        gem_name: 'rails',
        version: 'invalid-version!',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error:.*Invalid version format/);
    });

    it('should accept valid pin types', async () => {
      const gemfileContent = `gem 'rails', '6.0.0'\n`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const pinTypes = ['~>', '>=', '>', '<', '<=', '='];

      for (const pinType of pinTypes) {
        const result = await tool.executePin({
          gem_name: 'rails',
          version: '7.0.0',
          pin_type: pinType,
          file_path: gemfilePath,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain(
          `Successfully pinned 'rails' to '${pinType} 7.0.0'`
        );
      }
    });

    it('should default to ~> pin type', async () => {
      const gemfileContent = `gem 'rails', '6.0.0'\n`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain(
        "Successfully pinned 'rails' to '~> 7.0.0'"
      );
    });

    it('should default to Gemfile path', async () => {
      const gemfileContent = `gem 'rails', '6.0.0'\n`;
      const gemfilePath = join(process.cwd(), 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
      });

      // Clean up the default Gemfile
      await fs.unlink(gemfilePath);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain(
        "Successfully pinned 'rails' to '~> 7.0.0' in Gemfile"
      );
    });
  });

  describe('executePin - file system errors', () => {
    it('should handle non-existent files', async () => {
      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: '/non/existent/file',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error: File not found/);
    });

    it('should handle directory instead of file', async () => {
      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: tempDir,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error:.*is not a file/);
    });
  });

  describe('executePin - gem pinning functionality', () => {
    it('should pin a gem with no existing version constraint', async () => {
      const gemfileContent = `source 'https://rubygems.org'

gem 'rails'
gem 'pg'
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        pin_type: '~>',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(
        "Successfully pinned 'rails' to '~> 7.0.0' in " + gemfilePath
      );

      const updatedContent = await fs.readFile(gemfilePath, 'utf-8');
      expect(updatedContent).toContain("gem 'rails', '~> 7.0.0'");
      expect(updatedContent).toContain("gem 'pg'"); // Should preserve other gems
    });

    it('should update existing version constraint', async () => {
      const gemfileContent = `source 'https://rubygems.org'

gem 'rails', '6.0.0'
gem 'pg'
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        pin_type: '>=',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(
        "Successfully pinned 'rails' to '>= 7.0.0' in " + gemfilePath
      );

      const updatedContent = await fs.readFile(gemfilePath, 'utf-8');
      expect(updatedContent).toContain("gem 'rails', '>= 7.0.0'");
      expect(updatedContent).not.toContain("gem 'rails', '6.0.0'");
    });

    it('should preserve gem options when pinning', async () => {
      const gemfileContent = `source 'https://rubygems.org'

gem 'rails', '6.0.0', require: false
gem 'pg', platform: :ruby
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeFalsy();

      const updatedContent = await fs.readFile(gemfilePath, 'utf-8');
      expect(updatedContent).toContain(
        "gem 'rails', '~> 7.0.0', require: false"
      );
    });

    it('should preserve indentation', async () => {
      const gemfileContent = `source 'https://rubygems.org'

  gem 'rails', '6.0.0'
    gem 'pg'
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeFalsy();

      const updatedContent = await fs.readFile(gemfilePath, 'utf-8');
      expect(updatedContent).toContain("  gem 'rails', '~> 7.0.0'");
      expect(updatedContent).toContain("    gem 'pg'");
    });

    it('should handle gems with complex options', async () => {
      const gemfileContent = `source 'https://rubygems.org'

gem 'rails', '6.0.0', git: 'https://github.com/rails/rails.git', branch: 'main'
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeFalsy();

      const updatedContent = await fs.readFile(gemfilePath, 'utf-8');
      expect(updatedContent).toContain(
        "gem 'rails', '~> 7.0.0', git: 'https://github.com/rails/rails.git', branch: 'main'"
      );
    });

    it('should return error when gem is not found', async () => {
      const gemfileContent = `source 'https://rubygems.org'

gem 'pg'
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: gemfilePath,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        "Error: Gem 'rails' not found in " + gemfilePath
      );
    });

    it('should handle comments and preserve them', async () => {
      const gemfileContent = `source 'https://rubygems.org'

# Main framework
gem 'rails', '6.0.0' # Core Rails gem
gem 'pg' # Database
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeFalsy();

      const updatedContent = await fs.readFile(gemfilePath, 'utf-8');
      expect(updatedContent).toContain('# Main framework');
      expect(updatedContent).toContain(
        "gem 'rails', '~> 7.0.0' # Core Rails gem"
      );
      expect(updatedContent).toContain("gem 'pg' # Database");
    });
  });

  describe('executeUnpin - input validation', () => {
    it('should reject empty gem name', async () => {
      const result = await tool.executeUnpin({ gem_name: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(
        /Error:.*Gem name cannot be empty/
      );
    });

    it('should reject missing gem_name parameter', async () => {
      const result = await tool.executeUnpin({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error:/);
    });

    it('should reject invalid gem name format', async () => {
      const result = await tool.executeUnpin({ gem_name: 'invalid-gem!' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error:.*Invalid gem name format/);
    });

    it('should default to Gemfile path', async () => {
      const gemfileContent = `gem 'rails', '6.0.0'\n`;
      const gemfilePath = join(process.cwd(), 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executeUnpin({ gem_name: 'rails' });

      // Clean up the default Gemfile
      await fs.unlink(gemfilePath);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain(
        "Successfully unpinned 'rails' (removed version constraints) in Gemfile"
      );
    });
  });

  describe('executeUnpin - file system errors', () => {
    it('should handle non-existent files', async () => {
      const result = await tool.executeUnpin({
        gem_name: 'rails',
        file_path: '/non/existent/file',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error: File not found/);
    });

    it('should handle directory instead of file', async () => {
      const result = await tool.executeUnpin({
        gem_name: 'rails',
        file_path: tempDir,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Error:.*is not a file/);
    });
  });

  describe('executeUnpin - gem unpinning functionality', () => {
    it('should remove version constraint from gem', async () => {
      const gemfileContent = `source 'https://rubygems.org'

gem 'rails', '~> 7.0.0'
gem 'pg'
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executeUnpin({
        gem_name: 'rails',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(
        "Successfully unpinned 'rails' (removed version constraints) in " +
          gemfilePath
      );

      const updatedContent = await fs.readFile(gemfilePath, 'utf-8');
      expect(updatedContent).toContain("gem 'rails'");
      expect(updatedContent).not.toContain("gem 'rails', '~> 7.0.0'");
      expect(updatedContent).toContain("gem 'pg'"); // Should preserve other gems
    });

    it('should preserve gem options when unpinning', async () => {
      const gemfileContent = `source 'https://rubygems.org'

gem 'rails', '~> 7.0.0', require: false
gem 'pg', platform: :ruby
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executeUnpin({
        gem_name: 'rails',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeFalsy();

      const updatedContent = await fs.readFile(gemfilePath, 'utf-8');
      expect(updatedContent).toContain("gem 'rails', require: false");
      expect(updatedContent).not.toContain("'~> 7.0.0'");
    });

    it('should preserve indentation', async () => {
      const gemfileContent = `source 'https://rubygems.org'

  gem 'rails', '~> 7.0.0'
    gem 'pg'
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executeUnpin({
        gem_name: 'rails',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeFalsy();

      const updatedContent = await fs.readFile(gemfilePath, 'utf-8');
      expect(updatedContent).toContain("  gem 'rails'");
      expect(updatedContent).toContain("    gem 'pg'");
    });

    it('should handle gems with complex options', async () => {
      const gemfileContent = `source 'https://rubygems.org'

gem 'rails', '~> 7.0.0', git: 'https://github.com/rails/rails.git', branch: 'main'
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executeUnpin({
        gem_name: 'rails',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeFalsy();

      const updatedContent = await fs.readFile(gemfilePath, 'utf-8');
      expect(updatedContent).toContain(
        "gem 'rails', git: 'https://github.com/rails/rails.git', branch: 'main'"
      );
      expect(updatedContent).not.toContain("'~> 7.0.0'");
    });

    it('should return error when gem is not found', async () => {
      const gemfileContent = `source 'https://rubygems.org'

gem 'pg'
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executeUnpin({
        gem_name: 'rails',
        file_path: gemfilePath,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        "Error: Gem 'rails' not found in " + gemfilePath
      );
    });

    it('should handle gem with no version constraints gracefully', async () => {
      const gemfileContent = `source 'https://rubygems.org'

gem 'rails'
gem 'pg'
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executeUnpin({
        gem_name: 'rails',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(
        "No version constraints found to remove for 'rails' in " + gemfilePath
      );

      const updatedContent = await fs.readFile(gemfilePath, 'utf-8');
      expect(updatedContent).toBe(gemfileContent); // Should remain unchanged
    });

    it('should handle comments and preserve them', async () => {
      const gemfileContent = `source 'https://rubygems.org'

# Main framework
gem 'rails', '~> 7.0.0' # Core Rails gem
gem 'pg' # Database
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executeUnpin({
        gem_name: 'rails',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeFalsy();

      const updatedContent = await fs.readFile(gemfilePath, 'utf-8');
      expect(updatedContent).toContain('# Main framework');
      expect(updatedContent).toContain("gem 'rails' # Core Rails gem");
      expect(updatedContent).toContain("gem 'pg' # Database");
    });
  });

  describe('edge cases', () => {
    it('should handle empty files', async () => {
      const emptyPath = join(tempDir, 'empty_gemfile');
      await fs.writeFile(emptyPath, '');

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: emptyPath,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        "Error: Gem 'rails' not found in " + emptyPath
      );
    });

    it('should handle files with only comments', async () => {
      const commentOnlyContent = `
# This is a comment
# Another comment
# Yet another comment
`;
      const commentOnlyPath = join(tempDir, 'comments_only');
      await fs.writeFile(commentOnlyPath, commentOnlyContent);

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: commentOnlyPath,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        "Error: Gem 'rails' not found in " + commentOnlyPath
      );
    });

    it('should handle malformed gem lines gracefully', async () => {
      const malformedContent = `source 'https://rubygems.org'

gem 'valid_gem'
gem # malformed
gem invalid syntax here
gem 'rails', '6.0.0'
`;
      const malformedPath = join(tempDir, 'malformed');
      await fs.writeFile(malformedPath, malformedContent);

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: malformedPath,
      });

      expect(result.isError).toBeFalsy();

      const updatedContent = await fs.readFile(malformedPath, 'utf-8');
      expect(updatedContent).toContain("gem 'rails', '~> 7.0.0'");
      expect(updatedContent).toContain("gem 'valid_gem'"); // Should preserve other valid gems
    });

    it('should handle different quote styles', async () => {
      const gemfileContent = `source 'https://rubygems.org'

gem "rails", "6.0.0"
gem 'pg'
`;
      const gemfilePath = join(tempDir, 'Gemfile');
      await fs.writeFile(gemfilePath, gemfileContent);

      const result = await tool.executePin({
        gem_name: 'rails',
        version: '7.0.0',
        file_path: gemfilePath,
      });

      expect(result.isError).toBeFalsy();

      const updatedContent = await fs.readFile(gemfilePath, 'utf-8');
      // Tool should preserve existing quote style (double quotes in this case)
      expect(updatedContent).toContain('gem "rails", "~> 7.0.0"');
    });

    it('should handle file not found errors', async () => {
      // Try to unpin from a non-existent file
      const result = await tool.executeUnpin({
        gem_name: 'rails',
        file_path: '/nonexistent/path/Gemfile',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: File not found');
    });
  });
});
