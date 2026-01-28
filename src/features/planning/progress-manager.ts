/**
 * Progress Manager - Auto-log session progress and results
 *
 * Implements the progress.md concept from planning-with-files.
 * Automatically tracks work sessions, activities, and outcomes.
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { DatabaseRow, SqlParam } from '../../types/database.js';
import logger from '../../utils/logger.js';

/**
 * Progress session record
 */
export interface ProgressSession {
  id: string;
  startTime: number;
  endTime: number | null;
  summary: string | null;
  activitiesCount: number;
}

/**
 * Progress activity record
 */
export interface ProgressActivity {
  id: string;
  sessionId: string;
  timestamp: number;
  activity: string;
  result: string;
  relatedTodoId: string | null;
  duration?: number; // Duration in milliseconds
}

/**
 * Options for creating a progress activity
 */
export interface ProgressActivityInput {
  activity: string;
  result: string;
  relatedTodoId?: string;
  duration?: number;
}

/**
 * Progress manager for auto-logging session progress
 */
export class ProgressManager {
  private db: Database.Database;
  private currentSessionId: string | null = null;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  /**
   * Initialize database schema
   */
  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS progress_sessions (
        id TEXT PRIMARY KEY,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        summary TEXT,
        activities_count INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS progress_activities (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        activity TEXT NOT NULL,
        result TEXT NOT NULL,
        related_todo_id TEXT,
        duration INTEGER,
        FOREIGN KEY (session_id) REFERENCES progress_sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_progress_sessions_start_time ON progress_sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_progress_activities_session_id ON progress_activities(session_id);
      CREATE INDEX IF NOT EXISTS idx_progress_activities_timestamp ON progress_activities(timestamp);
      CREATE INDEX IF NOT EXISTS idx_progress_activities_related_todo_id ON progress_activities(related_todo_id);
    `);
  }

  /**
   * Start a new progress tracking session
   */
  startSession(): ProgressSession {
    const id = randomUUID();
    const startTime = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO progress_sessions (id, start_time, end_time, summary, activities_count)
      VALUES (?, ?, NULL, NULL, 0)
    `);

    stmt.run(id, startTime);

    this.currentSessionId = id;

    const session = this.getSession(id);
    logger.info(`Started progress session: ${id}`);

    return session!;
  }

  /**
   * Log a progress activity in the current session
   */
  logProgress(input: ProgressActivityInput): ProgressActivity {
    if (!this.currentSessionId) {
      throw new Error('No active session. Call startSession() first.');
    }

    const id = randomUUID();
    const timestamp = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO progress_activities (id, session_id, timestamp, activity, result, related_todo_id, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      this.currentSessionId,
      timestamp,
      input.activity,
      input.result,
      input.relatedTodoId || null,
      input.duration || null
    );

    // Update activities count
    this.updateActivitiesCount(this.currentSessionId);

    logger.debug(`Logged activity in session ${this.currentSessionId}: ${input.activity}`);

    return this.getActivity(id)!;
  }

  /**
   * End the current session with a summary
   */
  endSession(summary?: string): ProgressSession {
    if (!this.currentSessionId) {
      throw new Error('No active session to end.');
    }

    const endTime = Date.now();

    const stmt = this.db.prepare(`
      UPDATE progress_sessions
      SET end_time = ?, summary = ?
      WHERE id = ?
    `);

    stmt.run(endTime, summary || null, this.currentSessionId);

    const session = this.getSession(this.currentSessionId);
    logger.info(`Ended progress session: ${this.currentSessionId}`);

    this.currentSessionId = null;

    return session!;
  }

  /**
   * Get session history (most recent first)
   */
  getSessionHistory(limit: number = 10): ProgressSession[] {
    const stmt = this.db.prepare(`
      SELECT * FROM progress_sessions
      ORDER BY start_time DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as DatabaseRow[];
    return rows.map((row) => this.rowToSession(row));
  }

  /**
   * Get activities for a session
   */
  getSessionActivities(sessionId: string): ProgressActivity[] {
    const stmt = this.db.prepare(`
      SELECT * FROM progress_activities
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(sessionId) as DatabaseRow[];
    return rows.map((row) => this.rowToActivity(row));
  }

  /**
   * Get a single session by ID
   */
  getSession(id: string): ProgressSession | null {
    const stmt = this.db.prepare('SELECT * FROM progress_sessions WHERE id = ?');
    const row = stmt.get(id) as DatabaseRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToSession(row);
  }

  /**
   * Get a single activity by ID
   */
  getActivity(id: string): ProgressActivity | null {
    const stmt = this.db.prepare('SELECT * FROM progress_activities WHERE id = ?');
    const row = stmt.get(id) as DatabaseRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToActivity(row);
  }

  /**
   * Get the current active session
   */
  getCurrentSession(): ProgressSession | null {
    if (!this.currentSessionId) {
      return null;
    }

    return this.getSession(this.currentSessionId);
  }

  /**
   * Export progress as Markdown
   */
  exportMarkdown(options?: { limit?: number }): string {
    const sessions = this.getSessionHistory(options?.limit || 10);

    const lines: string[] = [];
    lines.push('# Project Progress Log\n');

    if (sessions.length === 0) {
      lines.push('No sessions recorded yet.\n');
      return lines.join('\n');
    }

    for (const session of sessions) {
      const startDate = new Date(session.startTime);
      const dateStr = startDate.toISOString().split('T')[0]!; // YYYY-MM-DD
      const timeStr = startDate.toTimeString().split(' ')[0]!.substring(0, 5); // HH:MM

      lines.push(`## Session ${dateStr} ${timeStr}`);

      // Calculate duration if session ended
      if (session.endTime) {
        const durationMs = session.endTime - session.startTime;
        const durationStr = this.formatDuration(durationMs);
        lines.push(`**Duration:** ${durationStr}\n`);
      } else {
        lines.push('**Status:** In Progress\n');
      }

      // Get activities for this session
      const activities = this.getSessionActivities(session.id);

      if (activities.length > 0) {
        for (const activity of activities) {
          const icon = this.getActivityIcon(activity.result);
          const durationStr = activity.duration
            ? ` (${this.formatDuration(activity.duration)})`
            : '';
          lines.push(`- ${icon} ${activity.activity}${durationStr}`);
        }
        lines.push('');
      }

      // Add summary if available
      if (session.summary) {
        lines.push(`**Summary:** ${session.summary}\n`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get statistics about progress tracking
   */
  getStatistics(): {
    totalSessions: number;
    activeSessions: number;
    totalActivities: number;
    avgActivitiesPerSession: number;
  } {
    const totalSessionsStmt = this.db.prepare('SELECT COUNT(*) as count FROM progress_sessions');
    const totalSessions = (totalSessionsStmt.get() as any).count;

    const activeSessionsStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM progress_sessions WHERE end_time IS NULL'
    );
    const activeSessions = (activeSessionsStmt.get() as any).count;

    const totalActivitiesStmt = this.db.prepare('SELECT COUNT(*) as count FROM progress_activities');
    const totalActivities = (totalActivitiesStmt.get() as any).count;

    const avgActivitiesPerSession =
      totalSessions > 0 ? totalActivities / totalSessions : 0;

    return {
      totalSessions,
      activeSessions,
      totalActivities,
      avgActivitiesPerSession: Math.round(avgActivitiesPerSession * 100) / 100,
    };
  }

  /**
   * Update activities count for a session
   */
  private updateActivitiesCount(sessionId: string): void {
    const stmt = this.db.prepare(`
      UPDATE progress_sessions
      SET activities_count = (
        SELECT COUNT(*) FROM progress_activities WHERE session_id = ?
      )
      WHERE id = ?
    `);

    stmt.run(sessionId, sessionId);
  }

  /**
   * Convert database row to ProgressSession
   */
  private rowToSession(row: DatabaseRow): ProgressSession {
    return {
      id: String(row.id),
      startTime: Number(row.start_time),
      endTime: row.end_time !== null ? Number(row.end_time) : null,
      summary: row.summary !== null ? String(row.summary) : null,
      activitiesCount: Number(row.activities_count),
    };
  }

  /**
   * Convert database row to ProgressActivity
   */
  private rowToActivity(row: DatabaseRow): ProgressActivity {
    return {
      id: String(row.id),
      sessionId: String(row.session_id),
      timestamp: Number(row.timestamp),
      activity: String(row.activity),
      result: String(row.result),
      relatedTodoId: row.related_todo_id !== null ? String(row.related_todo_id) : null,
      duration: row.duration !== null ? Number(row.duration) : undefined,
    };
  }

  /**
   * Format duration in a human-readable way
   */
  private formatDuration(durationMs: number): string {
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}min`;
    } else if (minutes > 0) {
      return `${minutes}min`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get icon for activity based on result
   */
  private getActivityIcon(result: string): string {
    const lowerResult = result.toLowerCase();

    if (lowerResult.includes('fail') || lowerResult.includes('error')) {
      return '❌';
    } else if (lowerResult.includes('fix') || lowerResult.includes('refactor')) {
      return '🔧';
    } else if (lowerResult.includes('test')) {
      return '🧪';
    } else if (lowerResult.includes('plan')) {
      return '📋';
    } else if (lowerResult.includes('agent')) {
      return '🤖';
    } else if (lowerResult.includes('success') || lowerResult.includes('completed') || lowerResult.includes('passed')) {
      return '✅';
    } else {
      return '📝';
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
