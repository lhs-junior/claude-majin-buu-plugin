import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { DatabaseRow, SqlParam } from '../../types/database.js';

export type FindingType = 'decision' | 'discovery' | 'blocker' | 'research' | 'question';

export interface FindingRecord {
  id: string;
  type: FindingType;
  content: string;
  context?: string;
  timestamp: number;
  relatedTodoId?: string;
  tags: string[];
}

export interface FindingFilter {
  type?: FindingType;
  relatedTodoId?: string;
  tags?: string[];
  since?: number;
  limit?: number;
}

export interface FindingsByType {
  decisions: FindingRecord[];
  discoveries: FindingRecord[];
  blockers: FindingRecord[];
  research: FindingRecord[];
  questions: FindingRecord[];
}

export class FindingsManager {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  /**
   * Initialize database schema for findings
   */
  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        context TEXT,
        timestamp INTEGER NOT NULL,
        related_todo_id TEXT,
        tags TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_findings_type ON findings(type);
      CREATE INDEX IF NOT EXISTS idx_findings_timestamp ON findings(timestamp);
      CREATE INDEX IF NOT EXISTS idx_findings_related_todo_id ON findings(related_todo_id);
    `);
  }

  /**
   * Add a new finding
   */
  addFinding(
    type: FindingType,
    content: string,
    options?: {
      context?: string;
      relatedTodoId?: string;
      tags?: string[];
    }
  ): FindingRecord {
    const id = randomUUID();
    const timestamp = Date.now();
    const context = options?.context || null;
    const relatedTodoId = options?.relatedTodoId || null;
    const tags = options?.tags || [];

    const stmt = this.db.prepare(`
      INSERT INTO findings (id, type, content, context, timestamp, related_todo_id, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      type,
      content,
      context,
      timestamp,
      relatedTodoId,
      JSON.stringify(tags)
    );

    return this.get(id)!;
  }

  /**
   * Get a finding by ID
   */
  get(id: string): FindingRecord | null {
    const stmt = this.db.prepare('SELECT * FROM findings WHERE id = ?');
    const row = stmt.get(id) as DatabaseRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToRecord(row);
  }

  /**
   * Get all findings sorted by timestamp (newest first)
   */
  getAllFindings(options?: { limit?: number; since?: number }): FindingRecord[] {
    let query = 'SELECT * FROM findings WHERE 1=1';
    const params: SqlParam[] = [];

    if (options?.since) {
      query += ' AND timestamp >= ?';
      params.push(options.since);
    }

    query += ' ORDER BY timestamp DESC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as DatabaseRow[];

    return rows.map((row) => this.rowToRecord(row));
  }

  /**
   * Get findings filtered by type
   */
  getFindingsByType(type: FindingType, options?: { limit?: number }): FindingRecord[] {
    let query = 'SELECT * FROM findings WHERE type = ? ORDER BY timestamp DESC';
    const params: SqlParam[] = [type];

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as DatabaseRow[];

    return rows.map((row) => this.rowToRecord(row));
  }

  /**
   * Get findings with filters
   */
  list(filter?: FindingFilter): FindingRecord[] {
    let query = 'SELECT * FROM findings WHERE 1=1';
    const params: SqlParam[] = [];

    if (filter?.type) {
      query += ' AND type = ?';
      params.push(filter.type);
    }

    if (filter?.relatedTodoId !== undefined) {
      if (filter.relatedTodoId === null) {
        query += ' AND related_todo_id IS NULL';
      } else {
        query += ' AND related_todo_id = ?';
        params.push(filter.relatedTodoId);
      }
    }

    if (filter?.since) {
      query += ' AND timestamp >= ?';
      params.push(filter.since);
    }

    query += ' ORDER BY timestamp DESC';

    if (filter?.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as DatabaseRow[];

    let findings = rows.map((row) => this.rowToRecord(row));

    // Filter by tags if specified
    if (filter?.tags && filter.tags.length > 0) {
      findings = findings.filter((finding) =>
        filter.tags!.some((tag) => finding.tags.includes(tag))
      );
    }

    return findings;
  }

  /**
   * Get findings grouped by type
   */
  getGroupedByType(options?: { since?: number }): FindingsByType {
    const types: FindingType[] = ['decision', 'discovery', 'blocker', 'research', 'question'];
    const grouped: FindingsByType = {
      decisions: [],
      discoveries: [],
      blockers: [],
      research: [],
      questions: [],
    };

    // Map singular type to plural key
    const typeToKey: Record<FindingType, keyof FindingsByType> = {
      decision: 'decisions',
      discovery: 'discoveries',
      blocker: 'blockers',
      research: 'research', // Plural is same as singular
      question: 'questions',
    };

    for (const type of types) {
      const findings = this.list({ type, since: options?.since });
      const key = typeToKey[type];
      grouped[key] = findings;
    }

    return grouped;
  }

  /**
   * Delete a finding
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM findings WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Export findings as markdown format
   */
  exportMarkdown(options?: { since?: number; includeContext?: boolean }): string {
    const includeContext = options?.includeContext ?? true;
    const grouped = this.getGroupedByType({ since: options?.since });

    const lines: string[] = ['# Project Findings', ''];

    // Helper to format timestamp
    const formatDate = (timestamp: number): string => {
      const date = new Date(timestamp);
      return date.toISOString().split('T')[0]!; // YYYY-MM-DD
    };

    // Export each section
    const sections: Array<{ title: string; key: keyof FindingsByType }> = [
      { title: 'Decisions', key: 'decisions' },
      { title: 'Discoveries', key: 'discoveries' },
      { title: 'Blockers', key: 'blockers' },
      { title: 'Research', key: 'research' },
      { title: 'Questions', key: 'questions' },
    ];

    for (const section of sections) {
      const findings = grouped[section.key];

      if (findings.length > 0) {
        lines.push(`## ${section.title}`, '');

        for (const finding of findings) {
          const date = formatDate(finding.timestamp);
          const tags = finding.tags.length > 0 ? ` #${finding.tags.join(' #')}` : '';
          lines.push(`- [${date}] ${finding.content}${tags}`);

          if (includeContext && finding.context) {
            // Indent context
            const contextLines = finding.context.split('\n').map(line => `  ${line}`);
            lines.push(...contextLines);
          }

          if (finding.relatedTodoId) {
            lines.push(`  Related TODO: ${finding.relatedTodoId}`);
          }

          lines.push('');
        }
      }
    }

    // Add summary
    const total = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
    if (total === 0) {
      lines.push('*No findings recorded yet.*', '');
    } else {
      lines.push('---', '');
      lines.push(`**Total Findings:** ${total}`, '');
      for (const section of sections) {
        const count = grouped[section.key].length;
        if (count > 0) {
          lines.push(`- ${section.title}: ${count}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM findings');
    const total = (totalStmt.get() as any).count;

    const byTypeStmt = this.db.prepare(`
      SELECT type, COUNT(*) as count
      FROM findings
      GROUP BY type
    `);
    const byType = byTypeStmt.all() as Array<{ type: string; count: number }>;

    const withTodoStmt = this.db.prepare('SELECT COUNT(*) as count FROM findings WHERE related_todo_id IS NOT NULL');
    const withTodo = (withTodoStmt.get() as any).count;

    return {
      totalFindings: total,
      linkedToTodos: withTodo,
      byType,
    };
  }

  /**
   * Convert database row to FindingRecord
   */
  private rowToRecord(row: DatabaseRow): FindingRecord {
    return {
      id: String(row.id),
      type: row.type as FindingType,
      content: String(row.content),
      context: row.context ? String(row.context) : undefined,
      timestamp: Number(row.timestamp),
      relatedTodoId: row.related_todo_id ? String(row.related_todo_id) : undefined,
      tags: JSON.parse(String(row.tags || '[]')),
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
