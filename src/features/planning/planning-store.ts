import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { DatabaseRow, SqlParam } from '../../types/database.js';

export interface TodoRecord {
  id: string;
  parentId: string | null;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  type?: 'todo' | 'tdd'; // NEW: Task type (default: todo)
  tddStatus?: 'red' | 'green' | 'refactored'; // NEW: TDD cycle phase
  testPath?: string; // NEW: Path to test file (for TDD tasks)
  tags: string[];
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface TodoFilter {
  status?: 'pending' | 'in_progress' | 'completed';
  tags?: string[];
  parentId?: string | null;
  since?: number;
  limit?: number;
}

export class PlanningStore {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  /**
   * Initialize database schema
   */
  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        type TEXT DEFAULT 'todo',
        tdd_status TEXT,
        test_path TEXT,
        tags TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER,
        FOREIGN KEY (parent_id) REFERENCES todos(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
      CREATE INDEX IF NOT EXISTS idx_todos_parent_id ON todos(parent_id);
      CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
      CREATE INDEX IF NOT EXISTS idx_todos_type ON todos(type);
      CREATE INDEX IF NOT EXISTS idx_todos_tdd_status ON todos(tdd_status);
    `);
  }

  /**
   * Create a new TODO
   */
  create(
    content: string,
    options?: {
      parentId?: string;
      tags?: string[];
      status?: 'pending' | 'in_progress' | 'completed';
      type?: 'todo' | 'tdd'; // NEW
      tddStatus?: 'red' | 'green' | 'refactored'; // NEW
      testPath?: string; // NEW
    }
  ): TodoRecord {
    const id = randomUUID();
    const now = Date.now();
    const status = options?.status || 'pending';
    const parentId = options?.parentId || null;
    const tags = options?.tags || [];
    const type = options?.type || 'todo';
    const tddStatus = options?.tddStatus || null;
    const testPath = options?.testPath || null;

    // Verify parent exists if specified
    if (parentId) {
      const parent = this.get(parentId);
      if (!parent) {
        throw new Error(`Parent TODO ${parentId} not found`);
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO todos (id, parent_id, content, status, type, tdd_status, test_path, tags, created_at, updated_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      parentId,
      content,
      status,
      type,
      tddStatus,
      testPath,
      JSON.stringify(tags),
      now,
      now,
      status === 'completed' ? now : null
    );

    return this.get(id)!;
  }

  /**
   * Get a TODO by ID
   */
  get(id: string): TodoRecord | null {
    const stmt = this.db.prepare('SELECT * FROM todos WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return this.rowToRecord(row);
  }

  /**
   * Update a TODO
   */
  update(
    id: string,
    updates: {
      content?: string;
      status?: 'pending' | 'in_progress' | 'completed';
      tags?: string[];
      parentId?: string;
      tddStatus?: 'red' | 'green' | 'refactored'; // NEW
      testPath?: string; // NEW
    }
  ): TodoRecord | null {
    const existing = this.get(id);
    if (!existing) {
      return null;
    }

    const now = Date.now();
    const content = updates.content ?? existing.content;
    const status = updates.status ?? existing.status;
    const tags = updates.tags ?? existing.tags;
    const parentId = updates.parentId !== undefined ? updates.parentId : existing.parentId;
    const tddStatus = updates.tddStatus !== undefined ? updates.tddStatus : existing.tddStatus;
    const testPath = updates.testPath !== undefined ? updates.testPath : existing.testPath;

    // Verify parent exists if specified
    if (parentId && parentId !== id) {
      const parent = this.get(parentId);
      if (!parent) {
        throw new Error(`Parent TODO ${parentId} not found`);
      }

      // Prevent circular dependencies
      if (this.wouldCreateCycle(id, parentId)) {
        throw new Error('Cannot create circular dependency');
      }
    }

    const completedAt = status === 'completed' && existing.status !== 'completed'
      ? now
      : existing.completedAt;

    const stmt = this.db.prepare(`
      UPDATE todos
      SET content = ?, status = ?, tags = ?, parent_id = ?, tdd_status = ?, test_path = ?, updated_at = ?, completed_at = ?
      WHERE id = ?
    `);

    stmt.run(content, status, JSON.stringify(tags), parentId, tddStatus, testPath, now, completedAt, id);

    return this.get(id);
  }

  /**
   * Delete a TODO (and all its children due to CASCADE)
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM todos WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * List TODOs with optional filters
   */
  list(filter?: TodoFilter): TodoRecord[] {
    let query = 'SELECT * FROM todos WHERE 1=1';
    const params: SqlParam[] = [];

    if (filter?.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }

    if (filter?.parentId !== undefined) {
      if (filter.parentId === null) {
        query += ' AND parent_id IS NULL';
      } else {
        query += ' AND parent_id = ?';
        params.push(filter.parentId);
      }
    }

    if (filter?.since) {
      query += ' AND created_at >= ?';
      params.push(filter.since);
    }

    query += ' ORDER BY created_at DESC';

    if (filter?.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as DatabaseRow[];

    let todos = rows.map((row) => this.rowToRecord(row));

    // Filter by tags if specified
    if (filter?.tags && filter.tags.length > 0) {
      todos = todos.filter((todo) =>
        filter.tags!.some((tag) => todo.tags.includes(tag))
      );
    }

    return todos;
  }

  /**
   * Get all children of a TODO
   */
  getChildren(parentId: string): TodoRecord[] {
    const stmt = this.db.prepare('SELECT * FROM todos WHERE parent_id = ? ORDER BY created_at ASC');
    const rows = stmt.all(parentId) as any[];
    return rows.map((row) => this.rowToRecord(row));
  }

  /**
   * Get dependency tree starting from root TODOs
   */
  getTree(): TodoRecord[] {
    // Get all root todos (no parent)
    return this.list({ parentId: null });
  }

  /**
   * Check if adding parentId to todoId would create a cycle
   */
  private wouldCreateCycle(todoId: string, parentId: string): boolean {
    let current: string | null = parentId;
    const visited = new Set<string>();

    while (current) {
      if (current === todoId) {
        return true; // Cycle detected
      }

      if (visited.has(current)) {
        return false; // Already checked this branch
      }

      visited.add(current);

      const parent = this.get(current);
      current = parent?.parentId || null;
    }

    return false;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM todos');
    const total = (totalStmt.get() as any).count;

    const byStatusStmt = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM todos
      GROUP BY status
    `);
    const byStatus = byStatusStmt.all();

    const rootsStmt = this.db.prepare('SELECT COUNT(*) as count FROM todos WHERE parent_id IS NULL');
    const roots = (rootsStmt.get() as any).count;

    return {
      totalTodos: total,
      rootTodos: roots,
      byStatus,
    };
  }

  /**
   * Convert database row to TodoRecord
   */
  private rowToRecord(row: DatabaseRow): TodoRecord {
    return {
      id: String(row.id),
      parentId: row.parent_id !== null ? String(row.parent_id) : null,
      content: String(row.content),
      status: row.status as 'pending' | 'in_progress' | 'completed',
      type: (row.type as 'todo' | 'tdd' | undefined) || 'todo',
      tddStatus: row.tdd_status as 'red' | 'green' | 'refactored' | undefined || undefined,
      testPath: row.test_path ? String(row.test_path) : undefined,
      tags: JSON.parse(String(row.tags || '[]')),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      completedAt: row.completed_at !== null ? Number(row.completed_at) : null,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
