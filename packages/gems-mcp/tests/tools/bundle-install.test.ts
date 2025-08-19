import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { BundleInstallTool } from '../../src/tools/bundle-install.js';
import { ProjectManager } from '../../src/project-manager.js';
import { spawn, ChildProcess } from 'child_process';

// Mock the spawn function
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

const mockSpawn = vi.mocked(spawn);

describe('BundleInstallTool', () => {
  let tempDir: string;
  let tool: BundleInstallTool;
  let projectManager: ProjectManager;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(join(tmpdir(), 'bundle-install-test-'));
    projectManager = new ProjectManager([{ name: 'test', path: tempDir }]);
    tool = new BundleInstallTool({ projectManager });

    // Reset mock
    mockSpawn.mockReset();
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should accept empty input (all options are optional)', async () => {
      // Mock successful bundle install
      mockSuccessfulBundleProcess();

      const result = await tool.execute({});

      expect(result.isError).toBeUndefined();
      expect(mockSpawn).toHaveBeenCalledWith(
        'bundle',
        ['install'],
        expect.objectContaining({
          cwd: expect.any(String),
          stdio: ['pipe', 'pipe', 'pipe'],
          env: expect.any(Object),
        })
      );
    });

    it('should validate project name length', async () => {
      const longProjectName = 'a'.repeat(101);

      const result = await tool.execute({
        project: longProjectName,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('should validate without array string lengths', async () => {
      const result = await tool.execute({
        without: ['a'.repeat(51)],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('should validate gemfile path length', async () => {
      const longPath = 'a'.repeat(501);

      const result = await tool.execute({
        gemfile: longPath,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });
  });

  describe('project resolution', () => {
    it('should use default project when no project specified', async () => {
      mockSuccessfulBundleProcess();

      const result = await tool.execute({});

      expect(result.isError).toBeUndefined();
      expect(mockSpawn).toHaveBeenCalledWith(
        'bundle',
        ['install'],
        expect.objectContaining({
          cwd: expect.any(String), // Should use the project manager's default path
          stdio: ['pipe', 'pipe', 'pipe'],
          env: expect.any(Object),
        })
      );
    });

    it('should resolve project path using project manager', async () => {
      mockSuccessfulBundleProcess();

      const result = await tool.execute({
        project: 'test',
      });

      expect(result.isError).toBeUndefined();
      expect(mockSpawn).toHaveBeenCalledWith(
        'bundle',
        ['install'],
        expect.objectContaining({
          cwd: tempDir,
        })
      );
    });

    it('should handle non-existent project', async () => {
      const result = await tool.execute({
        project: 'nonexistent',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Project not found: nonexistent'
      );
    });
  });

  describe('bundle command options', () => {
    it('should add deployment flag when deployment is true', async () => {
      mockSuccessfulBundleProcess();

      await tool.execute({
        deployment: true,
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'bundle',
        ['install', '--deployment'],
        expect.any(Object)
      );
    });

    it('should add without groups', async () => {
      mockSuccessfulBundleProcess();

      await tool.execute({
        without: ['development', 'test'],
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'bundle',
        ['install', '--without', 'development,test'],
        expect.any(Object)
      );
    });

    it('should add gemfile path', async () => {
      mockSuccessfulBundleProcess();

      await tool.execute({
        gemfile: 'custom/Gemfile',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'bundle',
        ['install', '--gemfile', 'custom/Gemfile'],
        expect.any(Object)
      );
    });

    it('should add clean flag when clean is true', async () => {
      mockSuccessfulBundleProcess();

      await tool.execute({
        clean: true,
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'bundle',
        ['install', '--clean'],
        expect.any(Object)
      );
    });

    it('should add frozen flag when frozen is true', async () => {
      mockSuccessfulBundleProcess();

      await tool.execute({
        frozen: true,
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'bundle',
        ['install', '--frozen'],
        expect.any(Object)
      );
    });

    it('should add quiet flag when quiet is true', async () => {
      mockSuccessfulBundleProcess();

      await tool.execute({
        quiet: true,
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'bundle',
        ['install', '--quiet'],
        expect.any(Object)
      );
    });

    it('should combine multiple options', async () => {
      mockSuccessfulBundleProcess();

      await tool.execute({
        deployment: true,
        without: ['development'],
        clean: true,
        frozen: true,
        quiet: true,
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'bundle',
        [
          'install',
          '--deployment',
          '--without',
          'development',
          '--clean',
          '--frozen',
          '--quiet',
        ],
        expect.any(Object)
      );
    });
  });

  describe('bundle execution', () => {
    it('should handle successful bundle install', async () => {
      mockSuccessfulBundleProcess(
        'Bundle complete! 42 Gemfile dependencies installed.'
      );

      const result = await tool.execute({});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain(
        'Successfully ran bundle install'
      );
      expect(result.content[0].text).toContain(
        'Bundle complete! 42 Gemfile dependencies installed.'
      );
    });

    it('should handle bundle install failure', async () => {
      mockFailedBundleProcess('Could not find gem "missing-gem"', 1);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Bundle install failed');
      expect(result.content[0].text).toContain(
        'Could not find gem "missing-gem"'
      );
    });

    it('should handle bundle command not found', async () => {
      mockBundleProcessError(new Error('command not found: bundle'));

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Failed to start bundle command'
      );
    });

    it('should include project name in success message', async () => {
      mockSuccessfulBundleProcess();

      const result = await tool.execute({
        project: 'test',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("in project 'test'");
    });

    it('should include options in success message', async () => {
      mockSuccessfulBundleProcess();

      const result = await tool.execute({
        deployment: true,
        without: ['development', 'test'],
        clean: true,
      });

      expect(result.isError).toBeUndefined();
      const message = result.content[0].text;
      expect(message).toContain('deployment mode');
      expect(message).toContain('without groups: development, test');
      expect(message).toContain('with cleanup');
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors', async () => {
      // Mock a tool that throws an unexpected error
      const toolWithError = new BundleInstallTool();
      vi.spyOn(
        toolWithError as unknown as { runBundleCommand: () => Promise<void> },
        'runBundleCommand'
      ).mockRejectedValue(new Error('Unexpected error'));

      const result = await toolWithError.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Unexpected error running bundle install'
      );
      expect(result.content[0].text).toContain('Unexpected error');
    });
  });

  // Helper functions for mocking spawn behavior
  function mockSuccessfulBundleProcess(stdout = 'Bundle install completed.') {
    const mockProcess = createMockProcess();
    mockSpawn.mockReturnValue(mockProcess);

    // Simulate successful execution
    setImmediate(() => {
      mockProcess.stdout?.emit('data', stdout);
      mockProcess.emit('close', 0);
    });
  }

  function mockFailedBundleProcess(
    stderr = 'Bundle install failed',
    exitCode = 1
  ) {
    const mockProcess = createMockProcess();
    mockSpawn.mockReturnValue(mockProcess);

    // Simulate failed execution
    setImmediate(() => {
      mockProcess.stderr?.emit('data', stderr);
      mockProcess.emit('close', exitCode);
    });
  }

  function mockBundleProcessError(error: Error) {
    const mockProcess = createMockProcess();
    mockSpawn.mockReturnValue(mockProcess);

    // Simulate process error
    setImmediate(() => {
      mockProcess.emit('error', error);
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
