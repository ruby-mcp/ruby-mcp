import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { BundleToolsManager } from '../../src/tools/bundle-tools.js';
import { ProjectManager } from '../../src/project-manager.js';
import { spawn, ChildProcess } from 'child_process';

// Mock the spawn function
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

const mockSpawn = vi.mocked(spawn);

describe('BundleToolsManager', () => {
  let tempDir: string;
  let toolsManager: BundleToolsManager;
  let projectManager: ProjectManager;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(join(tmpdir(), 'bundle-tools-test-'));
    projectManager = new ProjectManager([{ name: 'test', path: tempDir }]);
    toolsManager = new BundleToolsManager({ projectManager });

    // Reset mock
    mockSpawn.mockReset();
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe('executeCheck', () => {
    describe('input validation', () => {
      it('should accept empty input (all options are optional)', async () => {
        mockSuccessfulBundleProcess('The Gemfile dependencies are satisfied');

        const result = await toolsManager.executeCheck({});

        expect(result.isError).toBeUndefined();
        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['check'],
          expect.objectContaining({
            cwd: expect.any(String),
            stdio: ['pipe', 'pipe', 'pipe'],
            env: expect.any(Object),
          })
        );
      });

      it('should validate project name length', async () => {
        const longProjectName = 'a'.repeat(101);

        const result = await toolsManager.executeCheck({
          project: longProjectName,
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error:');
      });

      it('should validate gemfile path length', async () => {
        const longPath = 'a'.repeat(501);

        const result = await toolsManager.executeCheck({
          gemfile: longPath,
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error:');
      });
    });

    describe('bundle execution', () => {
      it('should handle successful bundle check', async () => {
        mockSuccessfulBundleProcess('The Gemfile dependencies are satisfied');

        const result = await toolsManager.executeCheck({});

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Bundle check passed');
        expect(result.content[0].text).toContain('dependencies are satisfied');
      });

      it('should handle bundle check failure', async () => {
        mockFailedBundleProcess('The bundle is not locked', 1);

        const result = await toolsManager.executeCheck({});

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Bundle check failed');
        expect(result.content[0].text).toContain('bundle is not locked');
      });

      it('should add gemfile option', async () => {
        mockSuccessfulBundleProcess();

        await toolsManager.executeCheck({
          gemfile: 'custom/Gemfile',
        });

        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['check', '--gemfile', 'custom/Gemfile'],
          expect.any(Object)
        );
      });
    });
  });

  describe('executeShow', () => {
    describe('input validation', () => {
      it('should accept empty input', async () => {
        mockSuccessfulBundleProcess(
          'Gems included by the bundle:\n  rails (7.0.0)'
        );

        const result = await toolsManager.executeShow({});

        expect(result.isError).toBeUndefined();
        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['show'],
          expect.any(Object)
        );
      });

      it('should validate gem name format', async () => {
        const result = await toolsManager.executeShow({
          gem_name: 'invalid gem name!',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error:');
      });
    });

    describe('bundle execution', () => {
      it('should show all gems when no gem specified', async () => {
        mockSuccessfulBundleProcess(
          'Gems included by the bundle:\n  rails (7.0.0)'
        );

        const result = await toolsManager.executeShow({});

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Bundle show');
        expect(result.content[0].text).toContain('Gems included');
      });

      it('should show specific gem', async () => {
        mockSuccessfulBundleProcess('/path/to/gems/rails-7.0.0');

        const result = await toolsManager.executeShow({
          gem_name: 'rails',
        });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("for gem 'rails'");
        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['show', 'rails'],
          expect.any(Object)
        );
      });

      it('should add paths option', async () => {
        mockSuccessfulBundleProcess();

        await toolsManager.executeShow({
          paths: true,
        });

        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['show', '--paths'],
          expect.any(Object)
        );
      });

      it('should add outdated option', async () => {
        mockSuccessfulBundleProcess();

        await toolsManager.executeShow({
          outdated: true,
        });

        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['show', '--outdated'],
          expect.any(Object)
        );
      });

      it('should combine options', async () => {
        mockSuccessfulBundleProcess();

        await toolsManager.executeShow({
          gem_name: 'rails',
          paths: true,
          outdated: true,
        });

        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['show', 'rails', '--paths', '--outdated'],
          expect.any(Object)
        );
      });
    });
  });

  describe('executeAudit', () => {
    describe('input validation', () => {
      it('should accept empty input', async () => {
        mockSuccessfulBundleProcess('No vulnerabilities found');

        const result = await toolsManager.executeAudit({});

        expect(result.isError).toBeUndefined();
        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['audit'],
          expect.any(Object)
        );
      });

      it('should validate format enum', async () => {
        const result = await toolsManager.executeAudit({
          format: 'invalid' as 'text' | 'json',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error:');
      });
    });

    describe('bundle execution', () => {
      it('should handle successful audit with no vulnerabilities', async () => {
        mockSuccessfulBundleProcess('No vulnerabilities found');

        const result = await toolsManager.executeAudit({});

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Bundle audit completed');
        expect(result.content[0].text).toContain('No vulnerabilities found');
      });

      it('should handle audit with vulnerabilities found', async () => {
        mockFailedBundleProcess('Vulnerabilities found:\nCVE-2023-12345', 1);

        const result = await toolsManager.executeAudit({});

        expect(result.isError).toBeUndefined(); // Not an error, just vulnerabilities found
        expect(result.content[0].text).toContain('Bundle audit found issues');
        expect(result.content[0].text).toContain('CVE-2023-12345');
      });

      it('should handle command execution failure', async () => {
        // Mock failed process with empty stdout/stderr (like when command not found)
        const mockProcess = createMockProcess();
        mockSpawn.mockReturnValue(mockProcess);

        setImmediate(() => {
          // No stdout or stderr data emitted, just failure
          mockProcess.emit('close', 1);
        });

        const result = await toolsManager.executeAudit({});

        // This will be treated as "found issues" since runBundleCommand provides a default error
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Bundle audit found issues');
        expect(result.content[0].text).toContain(
          'Command failed with exit code 1'
        );
      });

      it('should add update option', async () => {
        mockSuccessfulBundleProcess();

        await toolsManager.executeAudit({
          update: true,
        });

        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['audit', '--update'],
          expect.any(Object)
        );
      });

      it('should add verbose option', async () => {
        mockSuccessfulBundleProcess();

        await toolsManager.executeAudit({
          verbose: true,
        });

        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['audit', '--verbose'],
          expect.any(Object)
        );
      });

      it('should add json format option', async () => {
        mockSuccessfulBundleProcess();

        await toolsManager.executeAudit({
          format: 'json',
        });

        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['audit', '--format', 'json'],
          expect.any(Object)
        );
      });

      it('should add gemfile-lock option', async () => {
        mockSuccessfulBundleProcess();

        await toolsManager.executeAudit({
          gemfile_lock: 'custom/Gemfile.lock',
        });

        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['audit', '--gemfile-lock', 'custom/Gemfile.lock'],
          expect.any(Object)
        );
      });
    });
  });

  describe('executeClean', () => {
    describe('input validation', () => {
      it('should accept empty input', async () => {
        mockSuccessfulBundleProcess('Cleaned up 5 unused gems');

        const result = await toolsManager.executeClean({});

        expect(result.isError).toBeUndefined();
        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['clean'],
          expect.any(Object)
        );
      });
    });

    describe('bundle execution', () => {
      it('should handle successful clean', async () => {
        mockSuccessfulBundleProcess('Cleaned up 5 unused gems');

        const result = await toolsManager.executeClean({});

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Bundle clean completed');
        expect(result.content[0].text).toContain('Cleaned up 5 unused gems');
      });

      it('should handle clean failure', async () => {
        mockFailedBundleProcess('Cannot clean without --force', 1);

        const result = await toolsManager.executeClean({});

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Bundle clean failed');
        expect(result.content[0].text).toContain(
          'Cannot clean without --force'
        );
      });

      it('should add dry-run option', async () => {
        mockSuccessfulBundleProcess('Would clean 5 unused gems');

        const result = await toolsManager.executeClean({
          dry_run: true,
        });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('(dry run)');
        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['clean', '--dry-run'],
          expect.any(Object)
        );
      });

      it('should add force option', async () => {
        mockSuccessfulBundleProcess();

        await toolsManager.executeClean({
          force: true,
        });

        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['clean', '--force'],
          expect.any(Object)
        );
      });

      it('should combine options', async () => {
        mockSuccessfulBundleProcess();

        await toolsManager.executeClean({
          dry_run: true,
          force: true,
        });

        expect(mockSpawn).toHaveBeenCalledWith(
          'bundle',
          ['clean', '--dry-run', '--force'],
          expect.any(Object)
        );
      });
    });
  });

  describe('project resolution', () => {
    it('should resolve project path using project manager', async () => {
      mockSuccessfulBundleProcess();

      await toolsManager.executeCheck({
        project: 'test',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'bundle',
        ['check'],
        expect.objectContaining({
          cwd: tempDir,
        })
      );
    });

    it('should handle non-existent project', async () => {
      const result = await toolsManager.executeCheck({
        project: 'nonexistent',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Project not found: nonexistent'
      );
    });

    it('should include project name in messages', async () => {
      mockSuccessfulBundleProcess();

      const result = await toolsManager.executeCheck({
        project: 'test',
      });

      expect(result.content[0].text).toContain("in project 'test'");
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors during check', async () => {
      const toolsManagerWithError = new BundleToolsManager();
      vi.spyOn(
        toolsManagerWithError as BundleToolsManager & {
          runBundleCommand: () => Promise<void>;
        },
        'runBundleCommand'
      ).mockRejectedValue(new Error('Unexpected error'));

      const result = await toolsManagerWithError.executeCheck({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Unexpected error running bundle check'
      );
    });

    it('should handle unexpected errors during show', async () => {
      const toolsManagerWithError = new BundleToolsManager();
      vi.spyOn(
        toolsManagerWithError as BundleToolsManager & {
          runBundleCommand: () => Promise<void>;
        },
        'runBundleCommand'
      ).mockRejectedValue(new Error('Unexpected error'));

      const result = await toolsManagerWithError.executeShow({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Unexpected error running bundle show'
      );
    });

    it('should handle unexpected errors during audit', async () => {
      const toolsManagerWithError = new BundleToolsManager();
      vi.spyOn(
        toolsManagerWithError as BundleToolsManager & {
          runBundleCommand: () => Promise<void>;
        },
        'runBundleCommand'
      ).mockRejectedValue(new Error('Unexpected error'));

      const result = await toolsManagerWithError.executeAudit({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Unexpected error running bundle audit'
      );
    });

    it('should handle unexpected errors during clean', async () => {
      const toolsManagerWithError = new BundleToolsManager();
      vi.spyOn(
        toolsManagerWithError as BundleToolsManager & {
          runBundleCommand: () => Promise<void>;
        },
        'runBundleCommand'
      ).mockRejectedValue(new Error('Unexpected error'));

      const result = await toolsManagerWithError.executeClean({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Unexpected error running bundle clean'
      );
    });
  });

  // Helper functions for mocking spawn behavior
  function mockSuccessfulBundleProcess(
    stdout = 'Command completed successfully.'
  ) {
    const mockProcess = createMockProcess();
    mockSpawn.mockReturnValue(mockProcess);

    // Simulate successful execution
    setImmediate(() => {
      mockProcess.stdout?.emit('data', stdout);
      mockProcess.emit('close', 0);
    });
  }

  function mockFailedBundleProcess(stderr = 'Command failed', exitCode = 1) {
    const mockProcess = createMockProcess();
    mockSpawn.mockReturnValue(mockProcess);

    // Simulate failed execution
    setImmediate(() => {
      mockProcess.stderr?.emit('data', stderr);
      mockProcess.emit('close', exitCode);
    });
  }

  function createMockProcess() {
    const mockEventEmitter = {
      stdout: {
        on: vi.fn(),
        emit: vi.fn((event: string, data: unknown) => {
          const handlers = mockEventEmitter.stdout.on.mock.calls
            .filter((call) => call[0] === event)
            .map((call) => call[1]);
          handlers.forEach((handler) => handler(data));
        }),
      },
      stderr: {
        on: vi.fn(),
        emit: vi.fn((event: string, data: unknown) => {
          const handlers = mockEventEmitter.stderr.on.mock.calls
            .filter((call) => call[0] === event)
            .map((call) => call[1]);
          handlers.forEach((handler) => handler(data));
        }),
      },
      on: vi.fn(),
      emit: vi.fn((event: string, ...args: unknown[]) => {
        const handlers = mockEventEmitter.on.mock.calls
          .filter((call) => call[0] === event)
          .map((call) => call[1]);
        handlers.forEach((handler) => handler(...args));
      }),
    };

    return mockEventEmitter as unknown as ChildProcess;
  }
});
