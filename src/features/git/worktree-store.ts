import Database from 'better-sqlite3';

/**
 * Git worktree record
 */
export interface WorktreeRecord {
  id: string;
  featureName: string;
  branchName: string;
  path: string;
  baseBranch: string;
  status: 'active' | 'stale' | 'removed';
  createdAt: number;
  lastAccessedAt: number;
  hasUncommittedChanges: boolean;
}

/**
 * SQLite persistence layer for Git worktrees
 */
export class WorktreeStore {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
    // Create worktrees table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS worktrees (
        id TEXT PRIMARY KEY,
        feature_name TEXT NOT NULL UNIQUE,
        branch_name TEXT NOT NULL,
        path TEXT NOT NULL,
        base_branch TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('active', 'stale', 'removed')),
        created_at INTEGER NOT NULL,
        last_accessed_at INTEGER NOT NULL,
        has_uncommitted_changes INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_worktrees_feature_name ON worktrees(feature_name);
      CREATE INDEX IF NOT EXISTS idx_worktrees_status ON worktrees(status);
      CREATE INDEX IF NOT EXISTS idx_worktrees_last_accessed ON worktrees(last_accessed_at);
    `);
  }

  /**
   * Save or update a worktree record
   */
  save(worktree: WorktreeRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO worktrees (
        id, feature_name, branch_name, path, base_branch, status,
        created_at, last_accessed_at, has_uncommitted_changes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(feature_name) DO UPDATE SET
        branch_name = excluded.branch_name,
        path = excluded.path,
        status = excluded.status,
        last_accessed_at = excluded.last_accessed_at,
        has_uncommitted_changes = excluded.has_uncommitted_changes
    `);

    stmt.run(
      worktree.id,
      worktree.featureName,
      worktree.branchName,
      worktree.path,
      worktree.baseBranch,
      worktree.status,
      worktree.createdAt,
      worktree.lastAccessedAt,
      worktree.hasUncommittedChanges ? 1 : 0
    );
  }

  /**
   * Get worktree by feature name
   */
  getByFeatureName(featureName: string): WorktreeRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM worktrees WHERE feature_name = ?
    `);

    const row = stmt.get(featureName) as any;
    if (!row) return null;

    return this.rowToWorktree(row);
  }

  /**
   * Get worktree by ID
   */
  getById(id: string): WorktreeRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM worktrees WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return this.rowToWorktree(row);
  }

  /**
   * List all worktrees with optional status filter
   */
  list(status?: 'active' | 'stale' | 'removed'): WorktreeRecord[] {
    const query = status
      ? 'SELECT * FROM worktrees WHERE status = ? ORDER BY last_accessed_at DESC'
      : 'SELECT * FROM worktrees ORDER BY last_accessed_at DESC';

    const stmt = this.db.prepare(query);
    const rows = status ? stmt.all(status) : stmt.all();

    return (rows as any[]).map((row) => this.rowToWorktree(row));
  }

  /**
   * Update worktree status
   */
  updateStatus(featureName: string, status: 'active' | 'stale' | 'removed'): boolean {
    const stmt = this.db.prepare(`
      UPDATE worktrees
      SET status = ?, last_accessed_at = ?
      WHERE feature_name = ?
    `);

    const result = stmt.run(status, Date.now(), featureName);
    return result.changes > 0;
  }

  /**
   * Update last accessed timestamp
   */
  updateLastAccessed(featureName: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE worktrees
      SET last_accessed_at = ?
      WHERE feature_name = ?
    `);

    const result = stmt.run(Date.now(), featureName);
    return result.changes > 0;
  }

  /**
   * Update uncommitted changes flag
   */
  updateUncommittedChanges(featureName: string, hasChanges: boolean): boolean {
    const stmt = this.db.prepare(`
      UPDATE worktrees
      SET has_uncommitted_changes = ?
      WHERE feature_name = ?
    `);

    const result = stmt.run(hasChanges ? 1 : 0, featureName);
    return result.changes > 0;
  }

  /**
   * Delete worktree record
   */
  delete(featureName: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM worktrees WHERE feature_name = ?
    `);

    const result = stmt.run(featureName);
    return result.changes > 0;
  }

  /**
   * Get stale worktrees (not accessed for over 30 days)
   */
  getStaleWorktrees(staleDays: number = 30): WorktreeRecord[] {
    const staleTimestamp = Date.now() - staleDays * 24 * 60 * 60 * 1000;

    const stmt = this.db.prepare(`
      SELECT * FROM worktrees
      WHERE last_accessed_at < ? AND status = 'active'
      ORDER BY last_accessed_at ASC
    `);

    const rows = stmt.all(staleTimestamp) as any[];
    return rows.map((row) => this.rowToWorktree(row));
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    active: number;
    stale: number;
    removed: number;
    withUncommittedChanges: number;
  } {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM worktrees').get() as { count: number };

    const byStatus = this.db.prepare(`
      SELECT status, COUNT(*) as count FROM worktrees GROUP BY status
    `).all() as { status: string; count: number }[];

    const uncommitted = this.db.prepare(`
      SELECT COUNT(*) as count FROM worktrees WHERE has_uncommitted_changes = 1
    `).get() as { count: number };

    return {
      total: total.count,
      active: byStatus.find((s) => s.status === 'active')?.count ?? 0,
      stale: byStatus.find((s) => s.status === 'stale')?.count ?? 0,
      removed: byStatus.find((s) => s.status === 'removed')?.count ?? 0,
      withUncommittedChanges: uncommitted.count,
    };
  }

  /**
   * Clear all worktree records (for testing)
   */
  clear(): void {
    this.db.exec('DELETE FROM worktrees');
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  private rowToWorktree(row: any): WorktreeRecord {
    return {
      id: row.id,
      featureName: row.feature_name,
      branchName: row.branch_name,
      path: row.path,
      baseBranch: row.base_branch,
      status: row.status,
      createdAt: row.created_at,
      lastAccessedAt: row.last_accessed_at,
      hasUncommittedChanges: row.has_uncommitted_changes === 1,
    };
  }
}
