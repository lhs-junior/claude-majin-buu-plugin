import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorktreeManager } from '../../../../src/features/git/worktree-manager.js';
import { WorktreeStore } from '../../../../src/features/git/worktree-store.js';

// Mock child_process spawn
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

import { spawn } from 'child_process';
import { existsSync } from 'fs';

describe('WorktreeManager', () => {
  let manager: WorktreeManager;
  let mockSpawn: any;

  beforeEach(() => {
    manager = new WorktreeManager(':memory:');
    mockSpawn = spawn as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    manager.close();
  });

  describe('Initialization', () => {
    it('should initialize with in-memory database', () => {
      expect(manager).toBeDefined();
      const stats = manager.getStatistics();
      expect(stats.total).toBe(0);
    });

    it('should have tool definitions', () => {
      const tools = manager.getToolDefinitions();
      expect(tools).toHaveLength(5);
      expect(tools[0].name).toBe('git_create_worktree');
      expect(tools[1].name).toBe('git_list_worktrees');
      expect(tools[2].name).toBe('git_switch_worktree');
      expect(tools[3].name).toBe('git_remove_worktree');
      expect(tools[4].name).toBe('git_cleanup_stale_worktrees');
    });

    it('should have correct serverId for all tools', () => {
      const tools = manager.getToolDefinitions();
      tools.forEach((tool) => {
        expect(tool.serverId).toBe('internal:git');
      });
    });

    it('should have git category for all tools', () => {
      const tools = manager.getToolDefinitions();
      tools.forEach((tool) => {
        expect(tool.category).toBe('git');
      });
    });
  });

  describe('Tool Definitions', () => {
    it('should have git_create_worktree with correct schema', () => {
      const tools = manager.getToolDefinitions();
      const createTool = tools.find((t) => t.name === 'git_create_worktree');
      expect(createTool).toBeDefined();
      expect(createTool!.inputSchema.properties).toHaveProperty('featureName');
      expect(createTool!.inputSchema.properties).toHaveProperty('baseBranch');
      expect(createTool!.inputSchema.required).toContain('featureName');
    });

    it('should have git_list_worktrees with correct schema', () => {
      const tools = manager.getToolDefinitions();
      const listTool = tools.find((t) => t.name === 'git_list_worktrees');
      expect(listTool).toBeDefined();
      expect(listTool!.inputSchema.properties).toHaveProperty('includeStale');
    });

    it('should have git_switch_worktree with correct schema', () => {
      const tools = manager.getToolDefinitions();
      const switchTool = tools.find((t) => t.name === 'git_switch_worktree');
      expect(switchTool).toBeDefined();
      expect(switchTool!.inputSchema.properties).toHaveProperty('featureName');
      expect(switchTool!.inputSchema.required).toContain('featureName');
    });

    it('should have git_remove_worktree with correct schema', () => {
      const tools = manager.getToolDefinitions();
      const removeTool = tools.find((t) => t.name === 'git_remove_worktree');
      expect(removeTool).toBeDefined();
      expect(removeTool!.inputSchema.properties).toHaveProperty('featureName');
      expect(removeTool!.inputSchema.properties).toHaveProperty('force');
      expect(removeTool!.inputSchema.properties).toHaveProperty('deleteBranch');
      expect(removeTool!.inputSchema.required).toContain('featureName');
    });

    it('should have git_cleanup_stale_worktrees with correct schema', () => {
      const tools = manager.getToolDefinitions();
      const cleanupTool = tools.find((t) => t.name === 'git_cleanup_stale_worktrees');
      expect(cleanupTool).toBeDefined();
      expect(cleanupTool!.inputSchema.properties).toHaveProperty('staleDays');
      expect(cleanupTool!.inputSchema.properties).toHaveProperty('dryRun');
    });
  });

  describe('Create Worktree - Validation', () => {
    it('should reject invalid tool call with missing featureName', async () => {
      await expect(
        manager.handleToolCall('git_create_worktree', {})
      ).rejects.toThrow(/Validation failed/);
    });

    it('should reject invalid tool call with empty featureName', async () => {
      await expect(
        manager.handleToolCall('git_create_worktree', { featureName: '' })
      ).rejects.toThrow(/Validation failed/);
    });

    it('should accept valid input with default baseBranch', async () => {
      // Mock git commands to fail at git repo check for this test
      mockSpawn.mockImplementation(() => {
        const mockProcess: any = {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
          on: vi.fn((event, handler) => {
            if (event === 'close') {
              handler(1); // failure code
            }
          }),
        };
        return mockProcess;
      });

      const result = await manager.handleToolCall('git_create_worktree', {
        featureName: 'test-feature',
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });
  });

  describe('List Worktrees', () => {
    it('should list empty worktrees initially', async () => {
      // Mock git worktree list
      mockSpawn.mockImplementation(() => {
        const mockProcess: any = {
          stdout: { on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(''); // empty list
            }
          }) },
          stderr: { on: vi.fn() },
          on: vi.fn((event, handler) => {
            if (event === 'close') {
              handler(0); // success
            }
          }),
        };
        return mockProcess;
      });

      const result = await manager.handleToolCall('git_list_worktrees', {});
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('worktrees');
      expect((result as any).worktrees).toHaveLength(0);
    });

    it('should reject invalid includeStale type', async () => {
      await expect(
        manager.handleToolCall('git_list_worktrees', { includeStale: 'yes' })
      ).rejects.toThrow(/Validation failed/);
    });
  });

  describe('Switch Worktree - Validation', () => {
    it('should reject missing featureName', async () => {
      await expect(
        manager.handleToolCall('git_switch_worktree', {})
      ).rejects.toThrow(/Validation failed/);
    });

    it('should reject empty featureName', async () => {
      await expect(
        manager.handleToolCall('git_switch_worktree', { featureName: '' })
      ).rejects.toThrow(/Validation failed/);
    });

    it('should return error for non-existent worktree', async () => {
      const result = await manager.handleToolCall('git_switch_worktree', {
        featureName: 'non-existent',
      });
      expect(result).toHaveProperty('success', false);
      expect((result as any).message).toContain('not found');
    });
  });

  describe('Remove Worktree - Validation', () => {
    it('should reject missing featureName', async () => {
      await expect(
        manager.handleToolCall('git_remove_worktree', {})
      ).rejects.toThrow(/Validation failed/);
    });

    it('should accept valid input with defaults', async () => {
      const result = await manager.handleToolCall('git_remove_worktree', {
        featureName: 'non-existent',
      });
      expect(result).toHaveProperty('success', false);
      expect((result as any).message).toContain('not found');
    });

    it('should reject invalid force type', async () => {
      await expect(
        manager.handleToolCall('git_remove_worktree', {
          featureName: 'test',
          force: 'yes',
        })
      ).rejects.toThrow(/Validation failed/);
    });

    it('should reject invalid deleteBranch type', async () => {
      await expect(
        manager.handleToolCall('git_remove_worktree', {
          featureName: 'test',
          deleteBranch: 'yes',
        })
      ).rejects.toThrow(/Validation failed/);
    });
  });

  describe('Cleanup Stale Worktrees - Validation', () => {
    it('should accept empty input with defaults', async () => {
      // Mock git worktree list
      mockSpawn.mockImplementation(() => {
        const mockProcess: any = {
          stdout: { on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(''); // empty list
            }
          }) },
          stderr: { on: vi.fn() },
          on: vi.fn((event, handler) => {
            if (event === 'close') {
              handler(0); // success
            }
          }),
        };
        return mockProcess;
      });

      const result = await manager.handleToolCall('git_cleanup_stale_worktrees', {});
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('staleWorktrees');
    });

    it('should reject negative staleDays', async () => {
      await expect(
        manager.handleToolCall('git_cleanup_stale_worktrees', { staleDays: -1 })
      ).rejects.toThrow(/Validation failed/);
    });

    it('should reject invalid dryRun type', async () => {
      await expect(
        manager.handleToolCall('git_cleanup_stale_worktrees', { dryRun: 'yes' })
      ).rejects.toThrow(/Validation failed/);
    });
  });

  describe('Unknown Tool', () => {
    it('should throw error for unknown tool', async () => {
      await expect(
        manager.handleToolCall('git_unknown_tool', {})
      ).rejects.toThrow(/Unknown git worktree tool/);
    });
  });

  describe('Get Worktree Path', () => {
    it('should return null for non-existent worktree', () => {
      const path = manager.getWorktreePath('non-existent');
      expect(path).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should return correct initial statistics', () => {
      const stats = manager.getStatistics();
      expect(stats).toHaveProperty('total', 0);
      expect(stats).toHaveProperty('active', 0);
      expect(stats).toHaveProperty('stale', 0);
      expect(stats).toHaveProperty('removed', 0);
      expect(stats).toHaveProperty('withUncommittedChanges', 0);
    });
  });

  describe('Close', () => {
    it('should close without errors', () => {
      expect(() => manager.close()).not.toThrow();
    });

    it('should close multiple times without errors', () => {
      manager.close();
      expect(() => manager.close()).not.toThrow();
    });
  });
});

describe('WorktreeStore', () => {
  let store: WorktreeStore;

  beforeEach(() => {
    store = new WorktreeStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  describe('Initialization', () => {
    it('should initialize with empty database', () => {
      const stats = store.getStatistics();
      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.stale).toBe(0);
      expect(stats.removed).toBe(0);
    });
  });

  describe('Save and Retrieve', () => {
    it('should save and retrieve worktree by feature name', () => {
      const worktree = {
        id: '123',
        featureName: 'test-feature',
        branchName: 'test-feature',
        path: '/path/to/worktree',
        baseBranch: 'main',
        status: 'active' as const,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        hasUncommittedChanges: false,
      };

      store.save(worktree);
      const retrieved = store.getByFeatureName('test-feature');

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe('123');
      expect(retrieved!.featureName).toBe('test-feature');
      expect(retrieved!.branchName).toBe('test-feature');
      expect(retrieved!.status).toBe('active');
    });

    it('should save and retrieve worktree by ID', () => {
      const worktree = {
        id: '123',
        featureName: 'test-feature',
        branchName: 'test-feature',
        path: '/path/to/worktree',
        baseBranch: 'main',
        status: 'active' as const,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        hasUncommittedChanges: false,
      };

      store.save(worktree);
      const retrieved = store.getById('123');

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe('123');
      expect(retrieved!.featureName).toBe('test-feature');
    });

    it('should return null for non-existent feature', () => {
      const retrieved = store.getByFeatureName('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should return null for non-existent ID', () => {
      const retrieved = store.getById('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('List Worktrees', () => {
    beforeEach(() => {
      const worktrees = [
        {
          id: '1',
          featureName: 'feature-1',
          branchName: 'feature-1',
          path: '/path/1',
          baseBranch: 'main',
          status: 'active' as const,
          createdAt: Date.now() - 1000,
          lastAccessedAt: Date.now() - 1000,
          hasUncommittedChanges: false,
        },
        {
          id: '2',
          featureName: 'feature-2',
          branchName: 'feature-2',
          path: '/path/2',
          baseBranch: 'main',
          status: 'stale' as const,
          createdAt: Date.now() - 2000,
          lastAccessedAt: Date.now() - 2000,
          hasUncommittedChanges: false,
        },
        {
          id: '3',
          featureName: 'feature-3',
          branchName: 'feature-3',
          path: '/path/3',
          baseBranch: 'main',
          status: 'removed' as const,
          createdAt: Date.now() - 3000,
          lastAccessedAt: Date.now() - 3000,
          hasUncommittedChanges: false,
        },
      ];

      worktrees.forEach((wt) => store.save(wt));
    });

    it('should list all worktrees without filter', () => {
      const list = store.list();
      expect(list).toHaveLength(3);
    });

    it('should list only active worktrees', () => {
      const list = store.list('active');
      expect(list).toHaveLength(1);
      expect(list[0].status).toBe('active');
    });

    it('should list only stale worktrees', () => {
      const list = store.list('stale');
      expect(list).toHaveLength(1);
      expect(list[0].status).toBe('stale');
    });

    it('should list only removed worktrees', () => {
      const list = store.list('removed');
      expect(list).toHaveLength(1);
      expect(list[0].status).toBe('removed');
    });

    it('should list in descending order by last accessed', () => {
      const list = store.list();
      expect(list[0].featureName).toBe('feature-1');
      expect(list[1].featureName).toBe('feature-2');
      expect(list[2].featureName).toBe('feature-3');
    });
  });

  describe('Update Operations', () => {
    beforeEach(() => {
      const worktree = {
        id: '123',
        featureName: 'test-feature',
        branchName: 'test-feature',
        path: '/path/to/worktree',
        baseBranch: 'main',
        status: 'active' as const,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        hasUncommittedChanges: false,
      };
      store.save(worktree);
    });

    it('should update status', () => {
      const success = store.updateStatus('test-feature', 'stale');
      expect(success).toBe(true);

      const retrieved = store.getByFeatureName('test-feature');
      expect(retrieved!.status).toBe('stale');
    });

    it('should update last accessed timestamp', async () => {
      const oldTimestamp = store.getByFeatureName('test-feature')!.lastAccessedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const success = store.updateLastAccessed('test-feature');
      expect(success).toBe(true);

      const retrieved = store.getByFeatureName('test-feature');
      expect(retrieved!.lastAccessedAt).toBeGreaterThan(oldTimestamp);
    });

    it('should update uncommitted changes flag', () => {
      const success = store.updateUncommittedChanges('test-feature', true);
      expect(success).toBe(true);

      const retrieved = store.getByFeatureName('test-feature');
      expect(retrieved!.hasUncommittedChanges).toBe(true);
    });

    it('should return false when updating non-existent worktree', () => {
      const success = store.updateStatus('non-existent', 'stale');
      expect(success).toBe(false);
    });
  });

  describe('Delete Worktree', () => {
    beforeEach(() => {
      const worktree = {
        id: '123',
        featureName: 'test-feature',
        branchName: 'test-feature',
        path: '/path/to/worktree',
        baseBranch: 'main',
        status: 'active' as const,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        hasUncommittedChanges: false,
      };
      store.save(worktree);
    });

    it('should delete worktree', () => {
      const success = store.delete('test-feature');
      expect(success).toBe(true);

      const retrieved = store.getByFeatureName('test-feature');
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent worktree', () => {
      const success = store.delete('non-existent');
      expect(success).toBe(false);
    });
  });

  describe('Get Stale Worktrees', () => {
    it('should find stale worktrees', () => {
      const oldDate = Date.now() - 31 * 24 * 60 * 60 * 1000; // 31 days ago
      const worktree = {
        id: '123',
        featureName: 'old-feature',
        branchName: 'old-feature',
        path: '/path/to/old',
        baseBranch: 'main',
        status: 'active' as const,
        createdAt: oldDate,
        lastAccessedAt: oldDate,
        hasUncommittedChanges: false,
      };
      store.save(worktree);

      const stale = store.getStaleWorktrees(30);
      expect(stale).toHaveLength(1);
      expect(stale[0].featureName).toBe('old-feature');
    });

    it('should not find recent worktrees as stale', () => {
      const worktree = {
        id: '123',
        featureName: 'recent-feature',
        branchName: 'recent-feature',
        path: '/path/to/recent',
        baseBranch: 'main',
        status: 'active' as const,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        hasUncommittedChanges: false,
      };
      store.save(worktree);

      const stale = store.getStaleWorktrees(30);
      expect(stale).toHaveLength(0);
    });

    it('should not include non-active worktrees', () => {
      const oldDate = Date.now() - 31 * 24 * 60 * 60 * 1000;
      const worktree = {
        id: '123',
        featureName: 'old-removed',
        branchName: 'old-removed',
        path: '/path/to/old',
        baseBranch: 'main',
        status: 'removed' as const,
        createdAt: oldDate,
        lastAccessedAt: oldDate,
        hasUncommittedChanges: false,
      };
      store.save(worktree);

      const stale = store.getStaleWorktrees(30);
      expect(stale).toHaveLength(0);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      const worktrees = [
        {
          id: '1',
          featureName: 'active-1',
          branchName: 'active-1',
          path: '/path/1',
          baseBranch: 'main',
          status: 'active' as const,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          hasUncommittedChanges: true,
        },
        {
          id: '2',
          featureName: 'active-2',
          branchName: 'active-2',
          path: '/path/2',
          baseBranch: 'main',
          status: 'active' as const,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          hasUncommittedChanges: false,
        },
        {
          id: '3',
          featureName: 'stale-1',
          branchName: 'stale-1',
          path: '/path/3',
          baseBranch: 'main',
          status: 'stale' as const,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          hasUncommittedChanges: false,
        },
      ];

      worktrees.forEach((wt) => store.save(wt));
    });

    it('should calculate correct statistics', () => {
      const stats = store.getStatistics();
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.stale).toBe(1);
      expect(stats.removed).toBe(0);
      expect(stats.withUncommittedChanges).toBe(1);
    });
  });

  describe('Clear', () => {
    it('should clear all worktrees', () => {
      const worktree = {
        id: '123',
        featureName: 'test-feature',
        branchName: 'test-feature',
        path: '/path/to/worktree',
        baseBranch: 'main',
        status: 'active' as const,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        hasUncommittedChanges: false,
      };
      store.save(worktree);

      store.clear();
      const stats = store.getStatistics();
      expect(stats.total).toBe(0);
    });
  });

  describe('Update Existing Worktree', () => {
    it('should update existing worktree on conflict', () => {
      const worktree = {
        id: '123',
        featureName: 'test-feature',
        branchName: 'test-feature',
        path: '/path/to/worktree',
        baseBranch: 'main',
        status: 'active' as const,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        hasUncommittedChanges: false,
      };
      store.save(worktree);

      // Save again with updated data
      const updated = {
        ...worktree,
        status: 'stale' as const,
        hasUncommittedChanges: true,
      };
      store.save(updated);

      const retrieved = store.getByFeatureName('test-feature');
      expect(retrieved!.status).toBe('stale');
      expect(retrieved!.hasUncommittedChanges).toBe(true);
      expect(retrieved!.id).toBe('123'); // ID should remain same
    });
  });
});
