import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { WorktreeStore, WorktreeRecord } from './worktree-store.js';
import type { ToolMetadata } from '../../core/types.js';
import {
  GitCreateWorktreeInputSchema,
  GitListWorktreesInputSchema,
  GitSwitchWorktreeInputSchema,
  GitRemoveWorktreeInputSchema,
  GitCleanupStaleWorktreesInputSchema,
  validateInput,
  type GitCreateWorktreeInput,
  type GitListWorktreesInput,
  type GitSwitchWorktreeInput,
  type GitRemoveWorktreeInput,
  type GitCleanupStaleWorktreesInput,
} from '../../validation/schemas.js';
import logger from '../../utils/logger.js';

// Re-export types for backwards compatibility
export type {
  GitCreateWorktreeInput,
  GitListWorktreesInput,
  GitSwitchWorktreeInput,
  GitRemoveWorktreeInput,
  GitCleanupStaleWorktreesInput,
};

/**
 * Git Worktree Manager
 *
 * Manages isolated git worktrees for concurrent feature development.
 * Inspired by obra/superpowers git worktree integration.
 */
export class WorktreeManager {
  private store: WorktreeStore;
  private worktreeBaseDir: string = '.worktrees';

  constructor(dbPath: string = ':memory:') {
    this.store = new WorktreeStore(dbPath);
  }

  /**
   * Get tool definitions for MCP
   */
  getToolDefinitions(): ToolMetadata[] {
    return [
      {
        name: 'git_create_worktree',
        description:
          'Create an isolated git worktree for a feature branch. Allows working on multiple features simultaneously without switching branches in the main directory. Creates a new branch and worktree in .worktrees/ directory.',
        inputSchema: {
          type: 'object',
          properties: {
            featureName: {
              type: 'string',
              description: 'Name of the feature (e.g., "auth", "api-refactor"). Will be used as branch name.',
            },
            baseBranch: {
              type: 'string',
              description: 'Base branch to create from (e.g., "main", "develop"). Defaults to "main".',
              default: 'main',
            },
          },
          required: ['featureName'],
        },
        serverId: 'internal:git',
        category: 'git',
        keywords: ['git', 'worktree', 'branch', 'feature', 'isolation', 'concurrent'],
      },
      {
        name: 'git_list_worktrees',
        description:
          'List all git worktrees. Shows active worktrees with their status, paths, and whether they have uncommitted changes. Useful for managing multiple concurrent features.',
        inputSchema: {
          type: 'object',
          properties: {
            includeStale: {
              type: 'boolean',
              description: 'Include stale worktrees (not accessed for 30+ days)',
              default: false,
            },
          },
        },
        serverId: 'internal:git',
        category: 'git',
        keywords: ['git', 'worktree', 'list', 'show', 'status'],
      },
      {
        name: 'git_switch_worktree',
        description:
          'Get the path to switch to a worktree directory. Use this to change your working directory to a specific feature branch worktree. Returns the absolute path for cd command.',
        inputSchema: {
          type: 'object',
          properties: {
            featureName: {
              type: 'string',
              description: 'Name of the feature worktree to switch to',
            },
          },
          required: ['featureName'],
        },
        serverId: 'internal:git',
        category: 'git',
        keywords: ['git', 'worktree', 'switch', 'cd', 'change'],
      },
      {
        name: 'git_remove_worktree',
        description:
          'Remove a git worktree and its branch. Cleans up the worktree directory and deletes the branch. Safety check prevents removing worktrees with uncommitted changes unless forced.',
        inputSchema: {
          type: 'object',
          properties: {
            featureName: {
              type: 'string',
              description: 'Name of the feature worktree to remove',
            },
            force: {
              type: 'boolean',
              description: 'Force removal even with uncommitted changes',
              default: false,
            },
            deleteBranch: {
              type: 'boolean',
              description: 'Also delete the branch after removing worktree',
              default: true,
            },
          },
          required: ['featureName'],
        },
        serverId: 'internal:git',
        category: 'git',
        keywords: ['git', 'worktree', 'remove', 'delete', 'cleanup'],
      },
      {
        name: 'git_cleanup_stale_worktrees',
        description:
          'Automatically cleanup stale worktrees that have not been accessed for a specified number of days. Helps maintain a clean workspace by removing abandoned feature branches.',
        inputSchema: {
          type: 'object',
          properties: {
            staleDays: {
              type: 'number',
              description: 'Number of days without access to consider a worktree stale (default: 30)',
              default: 30,
            },
            dryRun: {
              type: 'boolean',
              description: 'Preview what would be removed without actually removing',
              default: true,
            },
          },
        },
        serverId: 'internal:git',
        category: 'git',
        keywords: ['git', 'worktree', 'cleanup', 'stale', 'maintenance'],
      },
    ];
  }

  /**
   * Handle tool calls with Zod validation
   */
  async handleToolCall(toolName: string, args: unknown): Promise<unknown> {
    switch (toolName) {
      case 'git_create_worktree': {
        const validation = validateInput(GitCreateWorktreeInputSchema, args);
        if (!validation.success) {
          throw new Error(validation.error);
        }
        return this.createWorktree(validation.data!.featureName, validation.data!.baseBranch);
      }
      case 'git_list_worktrees': {
        const validation = validateInput(GitListWorktreesInputSchema, args);
        if (!validation.success) {
          throw new Error(validation.error);
        }
        return this.listWorktrees(validation.data!.includeStale);
      }
      case 'git_switch_worktree': {
        const validation = validateInput(GitSwitchWorktreeInputSchema, args);
        if (!validation.success) {
          throw new Error(validation.error);
        }
        return this.switchWorktree(validation.data!.featureName);
      }
      case 'git_remove_worktree': {
        const validation = validateInput(GitRemoveWorktreeInputSchema, args);
        if (!validation.success) {
          throw new Error(validation.error);
        }
        return this.removeWorktree(
          validation.data!.featureName,
          validation.data!.force,
          validation.data!.deleteBranch
        );
      }
      case 'git_cleanup_stale_worktrees': {
        const validation = validateInput(GitCleanupStaleWorktreesInputSchema, args);
        if (!validation.success) {
          throw new Error(validation.error);
        }
        return this.cleanupStaleWorktrees(validation.data!.staleDays, validation.data!.dryRun);
      }
      default:
        throw new Error(`Unknown git worktree tool: ${toolName}`);
    }
  }

  /**
   * Create a new worktree for a feature branch
   */
  private async createWorktree(
    featureName: string,
    baseBranch: string = 'main'
  ): Promise<{
    success: boolean;
    message: string;
    worktree?: {
      featureName: string;
      branchName: string;
      path: string;
      baseBranch: string;
    };
  }> {
    try {
      // Verify we're in a git repository
      const isGitRepo = await this.executeGitCommand(['rev-parse', '--git-dir']);
      if (!isGitRepo.success) {
        return {
          success: false,
          message: 'Not a git repository. Initialize git first with: git init',
        };
      }

      // Validate feature name (no special characters)
      if (!this.validateFeatureName(featureName)) {
        return {
          success: false,
          message: 'Invalid feature name. Use only alphanumeric characters, hyphens, and underscores.',
        };
      }

      // Check if worktree already exists
      const existing = this.store.getByFeatureName(featureName);
      if (existing && existing.status === 'active') {
        return {
          success: false,
          message: `Worktree for feature "${featureName}" already exists at: ${existing.path}`,
        };
      }

      // Check if base branch exists
      const branchExists = await this.executeGitCommand(['rev-parse', '--verify', baseBranch]);
      if (!branchExists.success) {
        return {
          success: false,
          message: `Base branch "${baseBranch}" does not exist. Create it first or use an existing branch.`,
        };
      }

      // Create worktree path
      const worktreePath = join(this.worktreeBaseDir, featureName);
      const branchName = featureName;

      // Check for uncommitted changes in main worktree
      const statusCheck = await this.executeGitCommand(['status', '--porcelain']);
      if (statusCheck.success && statusCheck.output.trim()) {
        logger.warn(`Uncommitted changes detected in main worktree. Consider committing or stashing first.`);
      }

      // Create the worktree with new branch
      const createResult = await this.executeGitCommand([
        'worktree',
        'add',
        worktreePath,
        '-b',
        branchName,
        baseBranch,
      ]);

      if (!createResult.success) {
        return {
          success: false,
          message: `Failed to create worktree: ${createResult.output}`,
        };
      }

      // Save to database
      const worktreeRecord: WorktreeRecord = {
        id: randomUUID(),
        featureName,
        branchName,
        path: resolve(worktreePath),
        baseBranch,
        status: 'active',
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        hasUncommittedChanges: false,
      };
      this.store.save(worktreeRecord);

      return {
        success: true,
        message: `✅ Worktree created successfully!\n\nFeature: ${featureName}\nBranch: ${branchName}\nPath: ${worktreeRecord.path}\n\nSwitch to it with: git_switch_worktree`,
        worktree: {
          featureName,
          branchName,
          path: worktreeRecord.path,
          baseBranch,
        },
      };
    } catch (error: any) {
      logger.error('Failed to create worktree:', error);
      return {
        success: false,
        message: `Error creating worktree: ${error.message}`,
      };
    }
  }

  /**
   * List all worktrees
   */
  private async listWorktrees(includeStale: boolean = false): Promise<{
    success: boolean;
    worktrees: Array<{
      featureName: string;
      branchName: string;
      path: string;
      baseBranch: string;
      status: string;
      hasUncommittedChanges: boolean;
      createdAt: number;
      lastAccessedAt: number;
    }>;
    summary: string;
  }> {
    try {
      // Sync with git worktree list
      await this.syncWithGit();

      // Get worktrees from database
      const statusFilter = includeStale ? undefined : 'active';
      const worktrees = this.store.list(statusFilter);

      // Check for uncommitted changes
      for (const worktree of worktrees) {
        if (worktree.status === 'active' && existsSync(worktree.path)) {
          const hasChanges = await this.checkUncommittedChanges(worktree.path);
          worktree.hasUncommittedChanges = hasChanges;
          this.store.updateUncommittedChanges(worktree.featureName, hasChanges);
        }
      }

      // Build summary
      const active = worktrees.filter((w) => w.status === 'active');
      const stale = worktrees.filter((w) => w.status === 'stale');
      const withChanges = worktrees.filter((w) => w.hasUncommittedChanges);

      let summary = `📂 Git Worktrees Summary\n`;
      summary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      summary += `Active: ${active.length} | Stale: ${stale.length} | With changes: ${withChanges.length}\n\n`;

      if (worktrees.length === 0) {
        summary += 'No worktrees found. Create one with: git_create_worktree';
      } else {
        for (const wt of worktrees) {
          const changeFlag = wt.hasUncommittedChanges ? '⚠️  ' : '✓ ';
          const statusIcon = wt.status === 'active' ? '🟢' : '🔴';
          summary += `${statusIcon} ${changeFlag}${wt.featureName}\n`;
          summary += `   Branch: ${wt.branchName}\n`;
          summary += `   Path: ${wt.path}\n`;
          summary += `   Base: ${wt.baseBranch}\n`;
          summary += `   Last accessed: ${new Date(wt.lastAccessedAt).toLocaleString()}\n\n`;
        }
      }

      return {
        success: true,
        worktrees: worktrees.map((w) => ({
          featureName: w.featureName,
          branchName: w.branchName,
          path: w.path,
          baseBranch: w.baseBranch,
          status: w.status,
          hasUncommittedChanges: w.hasUncommittedChanges,
          createdAt: w.createdAt,
          lastAccessedAt: w.lastAccessedAt,
        })),
        summary,
      };
    } catch (error: any) {
      logger.error('Failed to list worktrees:', error);
      return {
        success: false,
        worktrees: [],
        summary: `Error listing worktrees: ${error.message}`,
      };
    }
  }

  /**
   * Switch to a worktree (returns path for cd)
   */
  private async switchWorktree(featureName: string): Promise<{
    success: boolean;
    message: string;
    path?: string;
  }> {
    try {
      const worktree = this.store.getByFeatureName(featureName);

      if (!worktree) {
        return {
          success: false,
          message: `Worktree "${featureName}" not found. Create it first with: git_create_worktree`,
        };
      }

      if (worktree.status !== 'active') {
        return {
          success: false,
          message: `Worktree "${featureName}" is ${worktree.status}. Cannot switch to it.`,
        };
      }

      if (!existsSync(worktree.path)) {
        return {
          success: false,
          message: `Worktree path does not exist: ${worktree.path}. It may have been manually removed.`,
        };
      }

      // Update last accessed
      this.store.updateLastAccessed(featureName);

      return {
        success: true,
        message: `🔄 Switch to worktree:\n\ncd "${worktree.path}"\n\nThen work on your feature: ${featureName}`,
        path: worktree.path,
      };
    } catch (error: any) {
      logger.error('Failed to switch worktree:', error);
      return {
        success: false,
        message: `Error switching worktree: ${error.message}`,
      };
    }
  }

  /**
   * Remove a worktree
   */
  private async removeWorktree(
    featureName: string,
    force: boolean = false,
    deleteBranch: boolean = true
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const worktree = this.store.getByFeatureName(featureName);

      if (!worktree) {
        return {
          success: false,
          message: `Worktree "${featureName}" not found.`,
        };
      }

      // Check for uncommitted changes
      if (!force && existsSync(worktree.path)) {
        const hasChanges = await this.checkUncommittedChanges(worktree.path);
        if (hasChanges) {
          return {
            success: false,
            message: `⚠️  Worktree "${featureName}" has uncommitted changes.\n\nEither:\n1. Commit or stash changes first\n2. Use force: true to remove anyway`,
          };
        }
      }

      // Remove the worktree
      const removeArgs = force ? ['worktree', 'remove', worktree.path, '--force'] : ['worktree', 'remove', worktree.path];
      const removeResult = await this.executeGitCommand(removeArgs);

      if (!removeResult.success) {
        return {
          success: false,
          message: `Failed to remove worktree: ${removeResult.output}`,
        };
      }

      // Delete the branch if requested
      if (deleteBranch) {
        const branchDeleteArgs = force
          ? ['branch', '-D', worktree.branchName]
          : ['branch', '-d', worktree.branchName];
        const deleteResult = await this.executeGitCommand(branchDeleteArgs);

        if (!deleteResult.success) {
          logger.warn(`Failed to delete branch ${worktree.branchName}: ${deleteResult.output}`);
        }
      }

      // Update database
      this.store.updateStatus(featureName, 'removed');

      return {
        success: true,
        message: `✅ Worktree "${featureName}" removed successfully!\n\n${deleteBranch ? `Branch "${worktree.branchName}" has been deleted.` : `Branch "${worktree.branchName}" kept.`}`,
      };
    } catch (error: any) {
      logger.error('Failed to remove worktree:', error);
      return {
        success: false,
        message: `Error removing worktree: ${error.message}`,
      };
    }
  }

  /**
   * Cleanup stale worktrees
   */
  private async cleanupStaleWorktrees(staleDays: number = 30, dryRun: boolean = true): Promise<{
    success: boolean;
    message: string;
    staleWorktrees: string[];
    removed: string[];
  }> {
    try {
      const staleWorktrees = this.store.getStaleWorktrees(staleDays);

      if (staleWorktrees.length === 0) {
        return {
          success: true,
          message: `✅ No stale worktrees found (older than ${staleDays} days).`,
          staleWorktrees: [],
          removed: [],
        };
      }

      const staleNames = staleWorktrees.map((w) => w.featureName);
      let message = `Found ${staleWorktrees.length} stale worktree(s) (not accessed for ${staleDays}+ days):\n\n`;

      for (const wt of staleWorktrees) {
        message += `- ${wt.featureName} (last accessed: ${new Date(wt.lastAccessedAt).toLocaleString()})\n`;
      }

      if (dryRun) {
        message += `\n⚠️  DRY RUN: No worktrees removed. Set dryRun: false to actually remove them.`;
        return {
          success: true,
          message,
          staleWorktrees: staleNames,
          removed: [],
        };
      }

      // Remove stale worktrees
      const removed: string[] = [];
      for (const wt of staleWorktrees) {
        const result = await this.removeWorktree(wt.featureName, true, true);
        if (result.success) {
          removed.push(wt.featureName);
        }
      }

      message += `\n✅ Removed ${removed.length} stale worktree(s).`;

      return {
        success: true,
        message,
        staleWorktrees: staleNames,
        removed,
      };
    } catch (error: any) {
      logger.error('Failed to cleanup stale worktrees:', error);
      return {
        success: false,
        message: `Error cleaning up stale worktrees: ${error.message}`,
        staleWorktrees: [],
        removed: [],
      };
    }
  }

  /**
   * Get worktree path for a feature
   */
  getWorktreePath(featureName: string): string | null {
    const worktree = this.store.getByFeatureName(featureName);
    return worktree ? worktree.path : null;
  }

  /**
   * Get statistics
   */
  getStatistics(): ReturnType<WorktreeStore['getStatistics']> {
    return this.store.getStatistics();
  }

  /**
   * Sync database with actual git worktree state
   */
  private async syncWithGit(): Promise<void> {
    try {
      const result = await this.executeGitCommand(['worktree', 'list', '--porcelain']);
      if (!result.success) return;

      // Parse git worktree list output
      const gitWorktrees = this.parseWorktreeList(result.output);
      const dbWorktrees = this.store.list();

      // Mark worktrees as stale if they don't exist in git anymore
      for (const dbWt of dbWorktrees) {
        const exists = gitWorktrees.some((gw) => gw.path === dbWt.path);
        if (!exists && dbWt.status === 'active') {
          this.store.updateStatus(dbWt.featureName, 'stale');
        }
      }
    } catch (error) {
      logger.error('Failed to sync with git:', error);
    }
  }

  /**
   * Parse git worktree list --porcelain output
   */
  private parseWorktreeList(output: string): Array<{ path: string; branch: string }> {
    const worktrees: Array<{ path: string; branch: string }> = [];
    const lines = output.split('\n');
    let currentWorktree: { path?: string; branch?: string } = {};

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (currentWorktree.path && currentWorktree.branch) {
          worktrees.push(currentWorktree as { path: string; branch: string });
        }
        currentWorktree = { path: line.substring(9) };
      } else if (line.startsWith('branch ')) {
        currentWorktree.branch = line.substring(7);
      }
    }

    if (currentWorktree.path && currentWorktree.branch) {
      worktrees.push(currentWorktree as { path: string; branch: string });
    }

    return worktrees;
  }

  /**
   * Check if worktree has uncommitted changes
   */
  private async checkUncommittedChanges(worktreePath: string): Promise<boolean> {
    try {
      const result = await this.executeGitCommand(['status', '--porcelain'], worktreePath);
      return result.success && result.output.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate feature name
   */
  private validateFeatureName(name: string): boolean {
    // Only allow alphanumeric characters, hyphens, and underscores
    const validNamePattern = /^[a-zA-Z0-9_-]+$/;
    return validNamePattern.test(name);
  }

  /**
   * Execute git command safely
   */
  private executeGitCommand(
    args: string[],
    cwd?: string
  ): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      const child = spawn('git', args, {
        shell: false,
        cwd: cwd || process.cwd(),
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const output = stdout + (stderr ? `\n${stderr}` : '');
        resolve({
          success: code === 0,
          output,
        });
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          output: `Error executing git command: ${error.message}`,
        });
      });
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    this.store.close();
  }
}
