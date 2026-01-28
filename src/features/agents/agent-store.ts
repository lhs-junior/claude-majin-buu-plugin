import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export type AgentType =
  | 'researcher' | 'coder' | 'tester' | 'reviewer'  // existing base agents
  | 'architect' | 'frontend' | 'backend' | 'database'  // new specialist agents
  | 'devops' | 'security' | 'performance' | 'documentation'
  | 'bugfix' | 'refactor';

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout';

export interface AgentRecord {
  id: string;
  type: AgentType;
  task: string;
  status: AgentStatus;
  result?: any;
  error?: string;
  startedAt: number;
  completedAt?: number;
  timeout?: number;
  progress?: string;
  specialistConfig?: string; // JSON config for specialist-specific settings
  parentTaskId?: string | null; // For task hierarchies
  memoryKeys?: string; // JSON array of related memory IDs
}

export interface AgentFilter {
  status?: AgentStatus;
  type?: AgentType;
  since?: number;
  limit?: number;
}

export class AgentStore {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    const dbOptions: Database.Options = {};
    this.db = new Database(dbPath, dbOptions);
    this.initSchema();
  }

  /**
   * Initialize database schema with migration support
   */
  private initSchema(): void {
    // Create base table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        task TEXT NOT NULL,
        status TEXT NOT NULL,
        result TEXT,
        error TEXT,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        timeout INTEGER,
        progress TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
      CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
      CREATE INDEX IF NOT EXISTS idx_agents_started ON agents(started_at);
    `);

    // Migrate schema for specialist agent support
    this.migrateToSpecialistSchema();
  }

  /**
   * Migrate schema to add specialist agent fields
   */
  private migrateToSpecialistSchema(): void {
    // Check if specialist_config column exists
    const checkColumn = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM pragma_table_info('agents')
      WHERE name='specialist_config'
    `).get() as { count: number };

    if (checkColumn.count === 0) {
      // Add new columns for specialist agents
      this.db.exec(`
        ALTER TABLE agents ADD COLUMN specialist_config TEXT;
        ALTER TABLE agents ADD COLUMN parent_task_id TEXT;
        ALTER TABLE agents ADD COLUMN memory_keys TEXT;

        CREATE INDEX IF NOT EXISTS idx_agents_parent_task ON agents(parent_task_id);
      `);
    }
  }

  /**
   * Create a new agent
   */
  create(
    type: AgentType,
    task: string,
    options?: {
      timeout?: number;
      specialistConfig?: Record<string, any>;
      parentTaskId?: string | null;
      memoryKeys?: string[];
    }
  ): AgentRecord {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO agents (id, type, task, status, started_at, timeout, specialist_config, parent_task_id, memory_keys)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)
    `);

    const specialistConfigJson = options?.specialistConfig ? JSON.stringify(options.specialistConfig) : null;
    const memoryKeysJson = options?.memoryKeys ? JSON.stringify(options.memoryKeys) : null;

    stmt.run(
      id,
      type,
      task,
      now,
      options?.timeout || null,
      specialistConfigJson,
      options?.parentTaskId || null,
      memoryKeysJson
    );

    return {
      id,
      type,
      task,
      status: 'pending',
      startedAt: now,
      timeout: options?.timeout,
      specialistConfig: specialistConfigJson || undefined,
      parentTaskId: options?.parentTaskId || null,
      memoryKeys: memoryKeysJson || undefined,
    };
  }

  /**
   * Get agent by ID
   */
  get(id: string): AgentRecord | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM agents WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return undefined;

    return this.rowToRecord(row);
  }

  /**
   * Update agent status
   */
  updateStatus(id: string, status: AgentStatus, data?: { result?: any; error?: string; progress?: string }): void {
    const updates: string[] = ['status = ?'];
    const params: any[] = [status];

    if (data?.result !== undefined) {
      updates.push('result = ?');
      params.push(JSON.stringify(data.result));
    }

    if (data?.error) {
      updates.push('error = ?');
      params.push(data.error);
    }

    if (data?.progress) {
      updates.push('progress = ?');
      params.push(data.progress);
    }

    if (status === 'completed' || status === 'failed' || status === 'timeout') {
      updates.push('completed_at = ?');
      params.push(Date.now());
    }

    const sql = `UPDATE agents SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    const stmt = this.db.prepare(sql);
    stmt.run(...params);
  }

  /**
   * List agents with filters
   */
  list(filter?: AgentFilter): AgentRecord[] {
    let sql = `SELECT * FROM agents WHERE 1=1`;
    const params: any[] = [];

    if (filter?.status) {
      sql += ` AND status = ?`;
      params.push(filter.status);
    }

    if (filter?.type) {
      sql += ` AND type = ?`;
      params.push(filter.type);
    }

    if (filter?.since) {
      sql += ` AND started_at >= ?`;
      params.push(filter.since);
    }

    sql += ` ORDER BY started_at DESC`;

    if (filter?.limit) {
      sql += ` LIMIT ?`;
      params.push(filter.limit);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map(this.rowToRecord.bind(this));
  }

  /**
   * Delete agent
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM agents WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const total = this.db.prepare(`SELECT COUNT(*) as count FROM agents`).get() as { count: number };

    const byStatus = this.db
      .prepare(`
      SELECT status, COUNT(*) as count
      FROM agents
      GROUP BY status
    `)
      .all() as Array<{ status: string; count: number }>;

    const byType = this.db
      .prepare(`
      SELECT type, COUNT(*) as count
      FROM agents
      GROUP BY type
    `)
      .all() as Array<{ type: string; count: number }>;

    const avgDuration = this.db
      .prepare(`
      SELECT AVG(completed_at - started_at) as avg
      FROM agents
      WHERE completed_at IS NOT NULL
    `)
      .get() as { avg: number | null };

    return {
      total: total.count,
      byStatus,
      byType,
      avgDurationMs: avgDuration.avg || 0,
    };
  }

  /**
   * Convert database row to AgentRecord
   */
  private rowToRecord(row: any): AgentRecord {
    return {
      id: row.id,
      type: row.type,
      task: row.task,
      status: row.status,
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error || undefined,
      startedAt: row.started_at,
      completedAt: row.completed_at || undefined,
      timeout: row.timeout || undefined,
      progress: row.progress || undefined,
      specialistConfig: row.specialist_config || undefined,
      parentTaskId: row.parent_task_id || null,
      memoryKeys: row.memory_keys || undefined,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
