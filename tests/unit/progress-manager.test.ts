import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ProgressManager,
  type ProgressSession,
  type ProgressActivity,
} from '../../src/features/planning/progress-manager.js';
import * as fs from 'fs';
import * as path from 'path';

describe('ProgressManager', () => {
  let progressManager: ProgressManager;
  const testDbPath = path.join('/tmp', `test-progress-${Date.now()}.db`);

  beforeEach(() => {
    progressManager = new ProgressManager(':memory:');
  });

  afterEach(() => {
    if (progressManager) {
      progressManager.close();
    }

    // Clean up test database file if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Session Management', () => {
    it('should start a new session', () => {
      const session = progressManager.startSession();

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.startTime).toBeDefined();
      expect(session.endTime).toBeNull();
      expect(session.summary).toBeNull();
      expect(session.activitiesCount).toBe(0);
    });

    it('should track current session', () => {
      const session = progressManager.startSession();
      const currentSession = progressManager.getCurrentSession();

      expect(currentSession).toBeDefined();
      expect(currentSession?.id).toBe(session.id);
    });

    it('should end a session without summary', async () => {
      const session = progressManager.startSession();
      // Add small delay to ensure endTime > startTime
      await new Promise(resolve => setTimeout(resolve, 10));
      const endedSession = progressManager.endSession();

      expect(endedSession.id).toBe(session.id);
      expect(endedSession.endTime).toBeDefined();
      expect(endedSession.endTime).toBeGreaterThanOrEqual(session.startTime);
      expect(endedSession.summary).toBeNull();
    });

    it('should end a session with summary', () => {
      progressManager.startSession();
      const summary = 'Completed auth feature, all tests passing';
      const endedSession = progressManager.endSession(summary);

      expect(endedSession.summary).toBe(summary);
      expect(endedSession.endTime).toBeDefined();
    });

    it('should clear current session after ending', () => {
      progressManager.startSession();
      progressManager.endSession();

      const currentSession = progressManager.getCurrentSession();
      expect(currentSession).toBeNull();
    });

    it('should throw error when ending without active session', () => {
      expect(() => progressManager.endSession()).toThrow('No active session to end');
    });

    it('should get session history', () => {
      const session1 = progressManager.startSession();
      progressManager.endSession('Session 1');

      const session2 = progressManager.startSession();
      progressManager.endSession('Session 2');

      const history = progressManager.getSessionHistory(10);

      expect(history.length).toBe(2);
      // Most recent first
      expect(history[0].id).toBe(session2.id);
      expect(history[1].id).toBe(session1.id);
    });

    it('should limit session history', () => {
      // Create 5 sessions
      for (let i = 0; i < 5; i++) {
        progressManager.startSession();
        progressManager.endSession(`Session ${i + 1}`);
      }

      const history = progressManager.getSessionHistory(3);
      expect(history.length).toBe(3);
    });

    it('should get specific session by id', () => {
      const session = progressManager.startSession();
      progressManager.endSession();

      const retrieved = progressManager.getSession(session.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(session.id);
    });

    it('should return null for non-existent session', () => {
      const retrieved = progressManager.getSession('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('Activity Logging', () => {
    it('should log activity in active session', () => {
      progressManager.startSession();

      const activity = progressManager.logProgress({
        activity: 'Implemented user authentication',
        result: 'Success: All tests passing',
      });

      expect(activity).toBeDefined();
      expect(activity.id).toBeDefined();
      expect(activity.activity).toBe('Implemented user authentication');
      expect(activity.result).toBe('Success: All tests passing');
      expect(activity.timestamp).toBeDefined();
      expect(activity.relatedTodoId).toBeNull();
    });

    it('should log activity with related todo', () => {
      progressManager.startSession();

      const todoId = 'todo-123';
      const activity = progressManager.logProgress({
        activity: 'Completed authentication task',
        result: 'Success',
        relatedTodoId: todoId,
      });

      expect(activity.relatedTodoId).toBe(todoId);
    });

    it('should log activity with duration', () => {
      progressManager.startSession();

      const duration = 7200000; // 2 hours in ms
      const activity = progressManager.logProgress({
        activity: 'Implemented feature',
        result: 'Completed',
        duration,
      });

      expect(activity.duration).toBe(duration);
    });

    it('should throw error when logging without active session', () => {
      expect(() =>
        progressManager.logProgress({
          activity: 'Test',
          result: 'Result',
        })
      ).toThrow('No active session');
    });

    it('should update activities count', () => {
      const session = progressManager.startSession();

      progressManager.logProgress({
        activity: 'Activity 1',
        result: 'Success',
      });

      progressManager.logProgress({
        activity: 'Activity 2',
        result: 'Success',
      });

      const updatedSession = progressManager.getSession(session.id);
      expect(updatedSession?.activitiesCount).toBe(2);
    });

    it('should get activities for session', () => {
      const session = progressManager.startSession();

      progressManager.logProgress({
        activity: 'Activity 1',
        result: 'Success',
      });

      progressManager.logProgress({
        activity: 'Activity 2',
        result: 'Failed',
      });

      const activities = progressManager.getSessionActivities(session.id);

      expect(activities.length).toBe(2);
      expect(activities[0].activity).toBe('Activity 1');
      expect(activities[1].activity).toBe('Activity 2');
    });

    it('should get specific activity by id', () => {
      progressManager.startSession();

      const activity = progressManager.logProgress({
        activity: 'Test activity',
        result: 'Result',
      });

      const retrieved = progressManager.getActivity(activity.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(activity.id);
      expect(retrieved?.activity).toBe('Test activity');
    });

    it('should return null for non-existent activity', () => {
      const retrieved = progressManager.getActivity('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('Markdown Export', () => {
    it('should export empty progress as markdown', () => {
      const markdown = progressManager.exportMarkdown();

      expect(markdown).toBeDefined();
      expect(markdown).toContain('# Project Progress Log');
      expect(markdown).toContain('No sessions recorded yet');
    });

    it('should export session without activities', () => {
      progressManager.startSession();
      progressManager.endSession('Session summary');

      const markdown = progressManager.exportMarkdown();

      expect(markdown).toContain('# Project Progress Log');
      expect(markdown).toContain('## Session');
      expect(markdown).toContain('**Duration:**');
      expect(markdown).toContain('**Summary:** Session summary');
    });

    it('should export session with activities', () => {
      progressManager.startSession();

      progressManager.logProgress({
        activity: 'Implemented user authentication',
        result: 'Success',
        duration: 7200000, // 2 hours
      });

      progressManager.logProgress({
        activity: 'Added unit tests',
        result: 'Tests passing',
        duration: 1800000, // 30 minutes
      });

      progressManager.endSession('Completed auth feature');

      const markdown = progressManager.exportMarkdown();

      expect(markdown).toContain('# Project Progress Log');
      expect(markdown).toContain('## Session');
      expect(markdown).toContain('Implemented user authentication');
      expect(markdown).toContain('(2h 0min)');
      expect(markdown).toContain('Added unit tests');
      expect(markdown).toContain('(30min)');
      expect(markdown).toContain('**Summary:** Completed auth feature');
    });

    it('should show appropriate icons for activities', () => {
      progressManager.startSession();

      progressManager.logProgress({
        activity: 'Task 1',
        result: 'Success',
      });

      progressManager.logProgress({
        activity: 'Task 2',
        result: 'Failed',
      });

      progressManager.logProgress({
        activity: 'Task 3',
        result: 'Fixed bug',
      });

      progressManager.logProgress({
        activity: 'Task 4',
        result: 'Test passed',
      });

      progressManager.endSession();

      const markdown = progressManager.exportMarkdown();

      expect(markdown).toContain('✅'); // Success
      expect(markdown).toContain('❌'); // Failed
      expect(markdown).toContain('🔧'); // Fixed
      expect(markdown).toContain('🧪'); // Test
    });

    it('should export in-progress session', () => {
      progressManager.startSession();

      progressManager.logProgress({
        activity: 'Working on feature',
        result: 'In progress',
      });

      const markdown = progressManager.exportMarkdown();

      expect(markdown).toContain('**Status:** In Progress');
    });

    it('should limit exported sessions', () => {
      // Create 5 sessions
      for (let i = 0; i < 5; i++) {
        progressManager.startSession();
        progressManager.logProgress({
          activity: `Activity ${i + 1}`,
          result: 'Success',
        });
        progressManager.endSession(`Session ${i + 1}`);
      }

      const markdown = progressManager.exportMarkdown({ limit: 2 });

      // Should contain 2 sessions
      const sessionMatches = markdown.match(/## Session/g);
      expect(sessionMatches?.length).toBe(2);
    });

    it('should format durations correctly', () => {
      progressManager.startSession();

      // 3 hours 45 minutes
      progressManager.logProgress({
        activity: 'Long task',
        result: 'Success',
        duration: 13500000, // 3h 45min in ms
      });

      // 90 seconds
      progressManager.logProgress({
        activity: 'Quick task',
        result: 'Success',
        duration: 90000, // 90s in ms
      });

      progressManager.endSession();

      const markdown = progressManager.exportMarkdown();

      expect(markdown).toContain('(3h 45min)');
      expect(markdown).toContain('(1min)');
    });
  });

  describe('Statistics', () => {
    it('should get statistics with no data', () => {
      const stats = progressManager.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalSessions).toBe(0);
      expect(stats.activeSessions).toBe(0);
      expect(stats.totalActivities).toBe(0);
      expect(stats.avgActivitiesPerSession).toBe(0);
    });

    it('should calculate statistics correctly', () => {
      // Session 1: 3 activities
      progressManager.startSession();
      progressManager.logProgress({ activity: 'A1', result: 'R1' });
      progressManager.logProgress({ activity: 'A2', result: 'R2' });
      progressManager.logProgress({ activity: 'A3', result: 'R3' });
      progressManager.endSession();

      // Session 2: 1 activity (in progress)
      progressManager.startSession();
      progressManager.logProgress({ activity: 'A4', result: 'R4' });

      const stats = progressManager.getStatistics();

      expect(stats.totalSessions).toBe(2);
      expect(stats.activeSessions).toBe(1); // One session is still in progress
      expect(stats.totalActivities).toBe(4);
      expect(stats.avgActivitiesPerSession).toBe(2); // 4 activities / 2 sessions
    });

    it('should track multiple sessions', () => {
      // Create 3 sessions with varying activities
      progressManager.startSession();
      progressManager.logProgress({ activity: 'A1', result: 'R1' });
      progressManager.endSession();

      progressManager.startSession();
      progressManager.logProgress({ activity: 'A2', result: 'R2' });
      progressManager.logProgress({ activity: 'A3', result: 'R3' });
      progressManager.endSession();

      progressManager.startSession();
      progressManager.logProgress({ activity: 'A4', result: 'R4' });
      progressManager.logProgress({ activity: 'A5', result: 'R5' });
      progressManager.logProgress({ activity: 'A6', result: 'R6' });
      progressManager.endSession();

      const stats = progressManager.getStatistics();

      expect(stats.totalSessions).toBe(3);
      expect(stats.activeSessions).toBe(0);
      expect(stats.totalActivities).toBe(6);
      expect(stats.avgActivitiesPerSession).toBe(2); // 6 / 3
    });
  });

  describe('Database Persistence', () => {
    it('should persist sessions to database', () => {
      const manager1 = new ProgressManager(testDbPath);

      manager1.startSession();
      manager1.logProgress({
        activity: 'Test activity',
        result: 'Success',
      });
      manager1.endSession('Test session');
      manager1.close();

      // Reopen with same database
      const manager2 = new ProgressManager(testDbPath);
      const history = manager2.getSessionHistory(10);

      expect(history.length).toBe(1);
      expect(history[0].summary).toBe('Test session');
      expect(history[0].activitiesCount).toBe(1);

      manager2.close();
    });

    it('should persist activities to database', () => {
      const manager1 = new ProgressManager(testDbPath);

      const session = manager1.startSession();
      manager1.logProgress({
        activity: 'Activity 1',
        result: 'Result 1',
      });
      manager1.logProgress({
        activity: 'Activity 2',
        result: 'Result 2',
      });
      manager1.close();

      // Reopen with same database
      const manager2 = new ProgressManager(testDbPath);
      const activities = manager2.getSessionActivities(session.id);

      expect(activities.length).toBe(2);
      expect(activities[0].activity).toBe('Activity 1');
      expect(activities[1].activity).toBe('Activity 2');

      manager2.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle getting activities for non-existent session', () => {
      const activities = progressManager.getSessionActivities('non-existent');
      expect(activities).toEqual([]);
    });

    it('should handle database with existing schema', () => {
      const manager1 = new ProgressManager(testDbPath);
      manager1.close();

      // Reopen should not fail
      const manager2 = new ProgressManager(testDbPath);
      const session = manager2.startSession();
      expect(session).toBeDefined();
      manager2.close();
    });
  });
});
