import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { GemsServer } from '../../src/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

describe('MCP Protocol Integration Tests', () => {
  let server: GemsServer;

  beforeAll(async () => {
    server = new GemsServer();
  });

  afterAll(() => {
    if (server) {
      const apiClient = server.getClient();
      apiClient.clearCache();
    }
  });

  describe('Server Protocol Support', () => {
    it('should support MCP server connection', () => {
      const mcpServer = server.getServer();
      expect(typeof mcpServer.connect).toBe('function');
    });

    it('should start server with stdio transport', async () => {
      const mcpServer = server.getServer();
      const connectSpy = vi.spyOn(mcpServer, 'connect').mockResolvedValue();
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await expect(server.start()).resolves.toBeUndefined();

      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(expect.any(StdioServerTransport));
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Gems MCP Server running on stdio'
      );

      connectSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Server Configuration', () => {
    it('should have proper server instance', () => {
      const mcpServer = server.getServer();
      expect(mcpServer).toBeDefined();
      expect(mcpServer.constructor.name).toBe('McpServer');
    });

    it('should have proper client instance', () => {
      const client = server.getClient();
      expect(client).toBeDefined();
      expect(client.constructor.name).toBe('RubyGemsClient');
    });
  });

  describe('Server Integration', () => {
    it('should integrate server and client properly', () => {
      const mcpServer = server.getServer();
      const client = server.getClient();

      expect(mcpServer).toBeDefined();
      expect(client).toBeDefined();

      expect(typeof mcpServer.connect).toBe('function');
      expect(typeof client.clearCache).toBe('function');
    });

    it('should support tool execution through direct instantiation', async () => {
      const client = server.getClient();
      const SearchTool = (await import('../../src/tools/search.js')).SearchTool;
      const searchTool = new SearchTool({ client });

      const result = await searchTool.execute({ query: 'rails' });
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle tool errors gracefully', async () => {
      const client = server.getClient();
      const DetailsTool = (await import('../../src/tools/details.js'))
        .DetailsTool;
      const detailsTool = new DetailsTool({ client });

      const result = await detailsTool.execute({
        name: 'xyzabc123nonexistent',
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('should handle validation errors', async () => {
      const client = server.getClient();
      const SearchTool = (await import('../../src/tools/search.js')).SearchTool;
      const searchTool = new SearchTool({ client });

      const result = await searchTool.execute({ query: '' });

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });
  });

  describe('Cache Integration', () => {
    it('should support cache operations', () => {
      const client = server.getClient();
      expect(() => client.clearCache()).not.toThrow();
    });

    it('should maintain cache state across tool executions', async () => {
      const client = server.getClient();
      const DetailsTool = (await import('../../src/tools/details.js'))
        .DetailsTool;
      const detailsTool = new DetailsTool({ client });

      const result1 = await detailsTool.execute({ name: 'rails' });
      const result2 = await detailsTool.execute({ name: 'rails' });

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.content[0].text).toBe(result2.content[0].text);
    });
  });

  describe('Tool Integration via Server', () => {
    it('should support search tool integration', async () => {
      const client = server.getClient();
      const SearchTool = (await import('../../src/tools/search.js')).SearchTool;
      const tool = new SearchTool({ client });

      const result = await tool.execute({ query: 'rails' });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should support details tool integration', async () => {
      const client = server.getClient();
      const DetailsTool = (await import('../../src/tools/details.js'))
        .DetailsTool;
      const tool = new DetailsTool({ client });

      const result = await tool.execute({ name: 'rails' });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      if (result.isError) {
        expect(result.content[0].text).toContain('Error:');
      } else {
        expect(result.content[0].text).toContain('rails');
      }
    });

    it('should support versions tool integration', async () => {
      const client = server.getClient();
      const VersionsTool = (await import('../../src/tools/versions.js'))
        .VersionsTool;
      const tool = new VersionsTool({ client });

      const result = await tool.executeGetVersions({
        name: 'rails',
        includePrerelease: false,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);

      if (result.isError) {
        expect(result.content[0].text).toContain('Error:');
      } else {
        expect(result.content[0].text).toContain('Versions for rails');
      }
    });

    it('should support latest version tool integration', async () => {
      const client = server.getClient();
      const VersionsTool = (await import('../../src/tools/versions.js'))
        .VersionsTool;
      const tool = new VersionsTool({ client });

      const result = await tool.executeGetLatestVersion({ name: 'rails' });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);

      if (result.isError) {
        expect(result.content[0].text).toContain('Error:');
      } else {
        expect(result.content[0].text).toContain('Latest version of rails');
      }
    });

    it('should support dependencies tool integration', async () => {
      const client = server.getClient();
      const VersionsTool = (await import('../../src/tools/versions.js'))
        .VersionsTool;
      const tool = new VersionsTool({ client });

      const result = await tool.executeGetDependencies({ name: 'rack' });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);

      if (result.isError) {
        expect(result.content[0].text).toContain('Error:');
      } else {
        expect(result.content[0].text).toContain(
          'Reverse dependencies for rack'
        );
      }
    });
  });
});
