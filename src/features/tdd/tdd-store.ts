import Database from 'better-sqlite3';

/**
 * TDD test run record
 */
export interface TDDTestRun {
  id: string;
  testPath: string;
  status: 'red' | 'green' | 'refactored'; // RED-GREEN-REFACTOR cycle
  runner: 'jest' | 'vitest' | 'mocha' | 'unknown';
  output: string;
  coverage?: number; // percentage
  timestamp: number;
  duration: number; // ms
}

/**
 * SQLite persistence layer for TDD test runs
 */
export class TDDStore {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
    // Create test_runs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS test_runs (
        id TEXT PRIMARY KEY,
        test_path TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('red', 'green', 'refactored')),
        runner TEXT NOT NULL,
        output TEXT NOT NULL,
        coverage REAL,
        timestamp INTEGER NOT NULL,
        duration INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_test_runs_test_path ON test_runs(test_path);
      CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
      CREATE INDEX IF NOT EXISTS idx_test_runs_timestamp ON test_runs(timestamp);
    `);
  }

  /**
   * Save a test run
   */
  save(run: TDDTestRun): void {
    const stmt = this.db.prepare(`
      INSERT INTO test_runs (id, test_path, status, runner, output, coverage, timestamp, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      run.id,
      run.testPath,
      run.status,
      run.runner,
      run.output,
      run.coverage ?? null,
      run.timestamp,
      run.duration
    );
  }

  /**
   * Get latest run for a test file
   */
  getLatest(testPath: string): TDDTestRun | null {
    const stmt = this.db.prepare(`
      SELECT * FROM test_runs
      WHERE test_path = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    const row = stmt.get(testPath) as any;
    if (!row) return null;

    return this.rowToTestRun(row);
  }

  /**
   * Get all runs for a test file
   */
  getHistory(testPath: string, limit: number = 10): TDDTestRun[] {
    const stmt = this.db.prepare(`
      SELECT * FROM test_runs
      WHERE test_path = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(testPath, limit) as any[];
    return rows.map((row) => this.rowToTestRun(row));
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalRuns: number;
    byStatus: { red: number; green: number; refactored: number };
    avgCoverage: number | null;
    byRunner: Record<string, number>;
  } {
    const totalRuns = this.db.prepare('SELECT COUNT(*) as count FROM test_runs').get() as { count: number };

    const byStatus = this.db.prepare(`
      SELECT status, COUNT(*) as count FROM test_runs GROUP BY status
    `).all() as { status: string; count: number }[];

    const avgCoverage = this.db.prepare(`
      SELECT AVG(coverage) as avg FROM test_runs WHERE coverage IS NOT NULL
    `).get() as { avg: number | null };

    const byRunner = this.db.prepare(`
      SELECT runner, COUNT(*) as count FROM test_runs GROUP BY runner
    `).all() as { runner: string; count: number }[];

    return {
      totalRuns: totalRuns.count,
      byStatus: {
        red: byStatus.find((s) => s.status === 'red')?.count ?? 0,
        green: byStatus.find((s) => s.status === 'green')?.count ?? 0,
        refactored: byStatus.find((s) => s.status === 'refactored')?.count ?? 0,
      },
      avgCoverage: avgCoverage.avg,
      byRunner: Object.fromEntries(byRunner.map((r) => [r.runner, r.count])),
    };
  }

  /**
   * Clear all test runs (for testing)
   */
  clear(): void {
    this.db.exec('DELETE FROM test_runs');
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  private rowToTestRun(row: any): TDDTestRun {
    return {
      id: row.id,
      testPath: row.test_path,
      status: row.status,
      runner: row.runner,
      output: row.output,
      coverage: row.coverage ?? undefined,
      timestamp: row.timestamp,
      duration: row.duration,
    };
  }
}
