import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GemsServer } from '../../src/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RubyGemsClient } from '../../src/api/client.js';

describe('GemsServer E2E Tests', () => {
  let server: GemsServer;

  beforeAll(() => {
    server = new GemsServer();
  });

  afterAll(() => {
    if (server) {
      const client = server.getClient();
      client.clearCache();
    }
  });

  describe('Server Initialization', () => {
    it('should initialize server with correct configuration', () => {
      const mcpServer = server.getServer();
      expect(mcpServer).toBeInstanceOf(McpServer);
      expect(mcpServer).toBeDefined();
    });

    it('should initialize RubyGems client with correct settings', () => {
      const client = server.getClient();
      expect(client).toBeInstanceOf(RubyGemsClient);
      expect(client).toBeDefined();
    });

    it('should have server metadata available', () => {
      const mcpServer = server.getServer();
      expect(mcpServer.constructor.name).toBe('McpServer');
    });

    it('should have client properly configured', () => {
      const client = server.getClient();
      expect(client.constructor.name).toBe('RubyGemsClient');
      expect(() => client.clearCache()).not.toThrow();
    });

    it('should support MCP protocol connection', () => {
      const mcpServer = server.getServer();
      expect(typeof mcpServer.connect).toBe('function');
    });
  });

  describe('Tool Integration', () => {
    it('should support search tool execution', async () => {
      const client = server.getClient();
      const SearchTool = (await import('../../src/tools/search.js')).SearchTool;
      const tool = new SearchTool({ client });

      const result = await tool.execute({ query: 'rails' });
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should support details tool execution', async () => {
      const client = server.getClient();
      const DetailsTool = (await import('../../src/tools/details.js'))
        .DetailsTool;
      const tool = new DetailsTool({ client });

      const result = await tool.execute({ name: 'rails' });
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should support versions tool execution', async () => {
      const client = server.getClient();
      const VersionsTool = (await import('../../src/tools/versions.js'))
        .VersionsTool;
      const tool = new VersionsTool({ client });

      const result = await tool.executeGetVersions({ name: 'rails' });
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });
  });
});
