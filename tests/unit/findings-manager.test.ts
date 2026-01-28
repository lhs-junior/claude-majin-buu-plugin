import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FindingsManager, FindingType } from '../../src/features/planning/findings-manager.js';
import * as fs from 'fs';
import * as path from 'path';

describe('FindingsManager', () => {
  let manager: FindingsManager;
  const testDbPath = path.join('/tmp', `test-findings-${Date.now()}.db`);

  beforeEach(() => {
    // Use in-memory database for most tests
    manager = new FindingsManager(':memory:');
  });

  afterEach(() => {
    manager.close();

    // Clean up test database file if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Initialization', () => {
    it('should initialize with in-memory database', () => {
      expect(manager).toBeDefined();
      const stats = manager.getStatistics();
      expect(stats.totalFindings).toBe(0);
    });

    it('should initialize with file-based database', () => {
      const fileManager = new FindingsManager(testDbPath);
      expect(fileManager).toBeDefined();

      const stats = fileManager.getStatistics();
      expect(stats.totalFindings).toBe(0);

      fileManager.close();
    });

    it('should create tables on initialization', () => {
      const stats = manager.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalFindings).toBe(0);
      expect(stats.linkedToTodos).toBe(0);
    });
  });

  describe('Finding Creation', () => {
    it('should create a basic finding', () => {
      const finding = manager.addFinding('decision', 'Chose PostgreSQL over MongoDB');

      expect(finding).toBeDefined();
      expect(finding.id).toBeDefined();
      expect(finding.type).toBe('decision');
      expect(finding.content).toBe('Chose PostgreSQL over MongoDB');
      expect(finding.timestamp).toBeDefined();
      expect(finding.tags).toEqual([]);
    });

    it('should create finding with context', () => {
      const finding = manager.addFinding('discovery', 'Found N+1 query issue', {
        context: 'In the user profile page, loading relationships causes multiple queries',
      });

      expect(finding.context).toBe('In the user profile page, loading relationships causes multiple queries');
    });

    it('should create finding with tags', () => {
      const finding = manager.addFinding('blocker', 'Waiting for API key', {
        tags: ['external', 'high-priority'],
      });

      expect(finding.tags).toEqual(['external', 'high-priority']);
    });

    it('should create finding linked to TODO', () => {
      const todoId = 'todo-123';
      const finding = manager.addFinding('research', 'Investigated React 19 features', {
        relatedTodoId: todoId,
      });

      expect(finding.relatedTodoId).toBe(todoId);
    });

    it('should support all finding types', () => {
      const types: FindingType[] = ['decision', 'discovery', 'blocker', 'research', 'question'];

      types.forEach((type) => {
        const finding = manager.addFinding(type, `Test ${type}`);
        expect(finding.type).toBe(type);
      });
    });
  });

  describe('Finding Retrieval', () => {
    beforeEach(() => {
      // Add test data
      manager.addFinding('decision', 'Use TypeScript strict mode');
      manager.addFinding('discovery', 'Performance bottleneck in rendering');
      manager.addFinding('blocker', 'Missing database credentials');
      manager.addFinding('research', 'Evaluated testing frameworks');
      manager.addFinding('question', 'Should we use GraphQL?');
    });

    it('should get finding by ID', () => {
      const finding = manager.addFinding('decision', 'Test decision');
      const retrieved = manager.get(finding.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(finding.id);
      expect(retrieved?.content).toBe('Test decision');
    });

    it('should return null for non-existent finding', () => {
      const finding = manager.get('non-existent-id');
      expect(finding).toBeNull();
    });

    it('should get all findings', () => {
      const findings = manager.getAllFindings();
      expect(findings.length).toBe(5);
    });

    it('should get all findings sorted by timestamp (newest first)', () => {
      const findings = manager.getAllFindings();

      // Check that timestamps are in descending order
      for (let i = 1; i < findings.length; i++) {
        expect(findings[i - 1]!.timestamp).toBeGreaterThanOrEqual(findings[i]!.timestamp);
      }
    });

    it('should limit findings', () => {
      const findings = manager.getAllFindings({ limit: 3 });
      expect(findings.length).toBe(3);
    });

    it('should filter findings by timestamp', () => {
      const now = Date.now();
      const findings = manager.getAllFindings({ since: now });

      findings.forEach((finding) => {
        expect(finding.timestamp).toBeGreaterThanOrEqual(now);
      });
    });
  });

  describe('Finding Filtering by Type', () => {
    beforeEach(() => {
      manager.addFinding('decision', 'Decision 1');
      manager.addFinding('decision', 'Decision 2');
      manager.addFinding('discovery', 'Discovery 1');
      manager.addFinding('blocker', 'Blocker 1');
    });

    it('should filter findings by type', () => {
      const decisions = manager.getFindingsByType('decision');
      expect(decisions.length).toBe(2);
      decisions.forEach((finding) => {
        expect(finding.type).toBe('decision');
      });
    });

    it('should return empty array for type with no findings', () => {
      const questions = manager.getFindingsByType('question');
      expect(questions).toEqual([]);
    });

    it('should limit findings by type', () => {
      const decisions = manager.getFindingsByType('decision', { limit: 1 });
      expect(decisions.length).toBe(1);
    });
  });

  describe('Finding List with Filters', () => {
    beforeEach(() => {
      manager.addFinding('decision', 'Decision 1', { tags: ['backend'] });
      manager.addFinding('decision', 'Decision 2', { tags: ['frontend'] });
      manager.addFinding('discovery', 'Discovery 1', { relatedTodoId: 'todo-1' });
      manager.addFinding('blocker', 'Blocker 1', { tags: ['backend', 'urgent'] });
    });

    it('should filter by type', () => {
      const findings = manager.list({ type: 'decision' });
      expect(findings.length).toBe(2);
    });

    it('should filter by tags', () => {
      const findings = manager.list({ tags: ['backend'] });
      expect(findings.length).toBe(2);
    });

    it('should filter by multiple tags (OR logic)', () => {
      const findings = manager.list({ tags: ['backend', 'frontend'] });
      expect(findings.length).toBe(3); // Decision 1, Decision 2, Blocker 1
    });

    it('should filter by related TODO', () => {
      const findings = manager.list({ relatedTodoId: 'todo-1' });
      expect(findings.length).toBe(1);
      expect(findings[0]?.type).toBe('discovery');
    });

    it('should combine multiple filters', () => {
      const findings = manager.list({
        type: 'decision',
        tags: ['backend'],
      });
      expect(findings.length).toBe(1);
      expect(findings[0]?.content).toBe('Decision 1');
    });

    it('should filter findings without related TODO', () => {
      const findings = manager.list({ relatedTodoId: null });
      expect(findings.length).toBe(3); // All except Discovery 1
    });
  });

  describe('Finding Grouping', () => {
    beforeEach(() => {
      manager.addFinding('decision', 'Decision 1');
      manager.addFinding('decision', 'Decision 2');
      manager.addFinding('discovery', 'Discovery 1');
      manager.addFinding('blocker', 'Blocker 1');
      manager.addFinding('research', 'Research 1');
    });

    it('should group findings by type', () => {
      const grouped = manager.getGroupedByType();

      expect(grouped.decisions.length).toBe(2);
      expect(grouped.discoveries.length).toBe(1);
      expect(grouped.blockers.length).toBe(1);
      expect(grouped.research.length).toBe(1);
      expect(grouped.questions.length).toBe(0);
    });

    it('should filter grouped findings by timestamp', () => {
      const now = Date.now();
      const grouped = manager.getGroupedByType({ since: now });

      const totalCount = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
      expect(totalCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Finding Deletion', () => {
    it('should delete a finding', () => {
      const finding = manager.addFinding('decision', 'Test decision');
      const deleted = manager.delete(finding.id);

      expect(deleted).toBe(true);

      const retrieved = manager.get(finding.id);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent finding', () => {
      const deleted = manager.delete('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should update statistics after deletion', () => {
      const finding = manager.addFinding('decision', 'Test decision');

      let stats = manager.getStatistics();
      expect(stats.totalFindings).toBe(1);

      manager.delete(finding.id);

      stats = manager.getStatistics();
      expect(stats.totalFindings).toBe(0);
    });
  });

  describe('Markdown Export', () => {
    beforeEach(() => {
      manager.addFinding('decision', 'Chose PostgreSQL over MongoDB', {
        context: 'Better transaction support and ACID compliance',
        tags: ['database', 'architecture'],
      });
      manager.addFinding('discovery', 'Found N+1 query bottleneck', {
        tags: ['performance'],
      });
      manager.addFinding('blocker', 'Waiting for API key from vendor', {
        relatedTodoId: 'todo-123',
      });
      manager.addFinding('research', 'Evaluated testing frameworks');
      manager.addFinding('question', 'Should we use GraphQL?');
    });

    it('should export findings as markdown', () => {
      const markdown = manager.exportMarkdown();

      expect(markdown).toContain('# Project Findings');
      expect(markdown).toContain('## Decisions');
      expect(markdown).toContain('## Discoveries');
      expect(markdown).toContain('## Blockers');
      expect(markdown).toContain('## Research');
      expect(markdown).toContain('## Questions');
    });

    it('should include content in markdown', () => {
      const markdown = manager.exportMarkdown();

      expect(markdown).toContain('Chose PostgreSQL over MongoDB');
      expect(markdown).toContain('Found N+1 query bottleneck');
      expect(markdown).toContain('Waiting for API key from vendor');
    });

    it('should include tags in markdown', () => {
      const markdown = manager.exportMarkdown();

      expect(markdown).toContain('#database #architecture');
      expect(markdown).toContain('#performance');
    });

    it('should include context when enabled', () => {
      const markdown = manager.exportMarkdown({ includeContext: true });

      expect(markdown).toContain('Better transaction support and ACID compliance');
    });

    it('should exclude context when disabled', () => {
      const markdown = manager.exportMarkdown({ includeContext: false });

      expect(markdown).not.toContain('Better transaction support and ACID compliance');
    });

    it('should include related TODO references', () => {
      const markdown = manager.exportMarkdown();

      expect(markdown).toContain('Related TODO: todo-123');
    });

    it('should include date in markdown', () => {
      const markdown = manager.exportMarkdown();
      const today = new Date().toISOString().split('T')[0];

      expect(markdown).toContain(`[${today}]`);
    });

    it('should include summary statistics', () => {
      const markdown = manager.exportMarkdown();

      expect(markdown).toContain('**Total Findings:**');
      expect(markdown).toContain('Decisions: 1');
      expect(markdown).toContain('Discoveries: 1');
      expect(markdown).toContain('Blockers: 1');
    });

    it('should handle empty findings gracefully', () => {
      const emptyManager = new FindingsManager(':memory:');
      const markdown = emptyManager.exportMarkdown();

      expect(markdown).toContain('# Project Findings');
      expect(markdown).toContain('*No findings recorded yet.*');

      emptyManager.close();
    });

    it('should filter by timestamp in export', () => {
      const futureTime = Date.now() + 10000;
      const markdown = manager.exportMarkdown({ since: futureTime });

      expect(markdown).toContain('*No findings recorded yet.*');
    });
  });

  describe('Statistics', () => {
    it('should return statistics for empty database', () => {
      const stats = manager.getStatistics();

      expect(stats.totalFindings).toBe(0);
      expect(stats.linkedToTodos).toBe(0);
      expect(stats.byType).toEqual([]);
    });

    it('should return correct statistics', () => {
      manager.addFinding('decision', 'Decision 1');
      manager.addFinding('decision', 'Decision 2');
      manager.addFinding('discovery', 'Discovery 1', { relatedTodoId: 'todo-1' });
      manager.addFinding('blocker', 'Blocker 1', { relatedTodoId: 'todo-2' });

      const stats = manager.getStatistics();

      expect(stats.totalFindings).toBe(4);
      expect(stats.linkedToTodos).toBe(2);
      expect(stats.byType.length).toBeGreaterThan(0);
    });

    it('should include findings count by type', () => {
      manager.addFinding('decision', 'Decision 1');
      manager.addFinding('decision', 'Decision 2');
      manager.addFinding('discovery', 'Discovery 1');

      const stats = manager.getStatistics();
      const decisionCount = stats.byType.find((t) => t.type === 'decision')?.count;
      const discoveryCount = stats.byType.find((t) => t.type === 'discovery')?.count;

      expect(decisionCount).toBe(2);
      expect(discoveryCount).toBe(1);
    });
  });

  describe('TODO Linkage', () => {
    it('should link finding to TODO', () => {
      const todoId = 'todo-abc-123';
      const finding = manager.addFinding('decision', 'Architecture decision', {
        relatedTodoId: todoId,
      });

      expect(finding.relatedTodoId).toBe(todoId);
    });

    it('should retrieve findings by TODO ID', () => {
      const todoId = 'todo-123';
      manager.addFinding('decision', 'Decision for TODO', { relatedTodoId: todoId });
      manager.addFinding('discovery', 'Discovery for TODO', { relatedTodoId: todoId });
      manager.addFinding('blocker', 'Unrelated blocker');

      const findings = manager.list({ relatedTodoId: todoId });

      expect(findings.length).toBe(2);
      findings.forEach((finding) => {
        expect(finding.relatedTodoId).toBe(todoId);
      });
    });

    it('should allow null related TODO ID', () => {
      const finding = manager.addFinding('question', 'General question');
      expect(finding.relatedTodoId).toBeUndefined();
    });
  });

  describe('Database Persistence', () => {
    it('should persist findings to file database', () => {
      const fileManager = new FindingsManager(testDbPath);

      fileManager.addFinding('decision', 'Persistent decision');
      fileManager.close();

      // Reopen database
      const reopenedManager = new FindingsManager(testDbPath);
      const findings = reopenedManager.getAllFindings();

      expect(findings.length).toBe(1);
      expect(findings[0]?.content).toBe('Persistent decision');

      reopenedManager.close();
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in content', () => {
      const finding = manager.addFinding('decision', 'Use "strict" mode & handle <special> chars');
      const retrieved = manager.get(finding.id);

      expect(retrieved?.content).toBe('Use "strict" mode & handle <special> chars');
    });

    it('should handle multiline context', () => {
      const context = `Line 1
Line 2
Line 3`;
      const finding = manager.addFinding('research', 'Research note', { context });

      expect(finding.context).toBe(context);
    });

    it('should handle empty tags array', () => {
      const finding = manager.addFinding('decision', 'No tags', { tags: [] });
      expect(finding.tags).toEqual([]);
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000);
      const finding = manager.addFinding('research', longContent);

      expect(finding.content.length).toBe(10000);
    });
  });
});
