import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import {
  GuideRecord,
  GuideCategory,
  DifficultyLevel,
  TutorialStep,
  LearningProgress,
  LearningStatus,
  GuideFilter,
} from './guide-types.js';

export class GuideStore {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    const dbOptions: Database.Options = {};
    this.db = new Database(dbPath, dbOptions);
    this.initSchema();
  }

  /**
   * Initialize database schema
   */
  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS guides (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        content_path TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        tags TEXT,
        related_tools TEXT,
        related_guides TEXT,
        difficulty TEXT NOT NULL,
        estimated_time INTEGER NOT NULL,
        prerequisites TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        version TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tutorial_steps (
        id TEXT PRIMARY KEY,
        guide_id TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        code_example TEXT,
        expected_output TEXT,
        check_command TEXT,
        hints TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE,
        UNIQUE(guide_id, step_number)
      );

      CREATE TABLE IF NOT EXISTS learning_progress (
        id TEXT PRIMARY KEY,
        guide_id TEXT NOT NULL,
        current_step INTEGER NOT NULL,
        total_steps INTEGER NOT NULL,
        status TEXT NOT NULL,
        completed_steps TEXT,
        started_at INTEGER NOT NULL,
        last_accessed_at INTEGER NOT NULL,
        completed_at INTEGER,
        FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE,
        UNIQUE(guide_id)
      );

      CREATE INDEX IF NOT EXISTS idx_guides_category ON guides(category);
      CREATE INDEX IF NOT EXISTS idx_guides_difficulty ON guides(difficulty);
      CREATE INDEX IF NOT EXISTS idx_guides_slug ON guides(slug);
      CREATE INDEX IF NOT EXISTS idx_tutorial_steps_guide_id ON tutorial_steps(guide_id);
      CREATE INDEX IF NOT EXISTS idx_tutorial_steps_step_number ON tutorial_steps(guide_id, step_number);
      CREATE INDEX IF NOT EXISTS idx_learning_progress_guide_id ON learning_progress(guide_id);
      CREATE INDEX IF NOT EXISTS idx_learning_progress_status ON learning_progress(status);
    `);
  }

  /**
   * Create a new guide
   */
  createGuide(
    slug: string,
    title: string,
    category: GuideCategory,
    contentPath: string,
    excerpt: string,
    options?: {
      tags?: string[];
      relatedTools?: string[];
      relatedGuides?: string[];
      difficulty?: DifficultyLevel;
      estimatedTime?: number;
      prerequisites?: string[];
      version?: string;
    }
  ): GuideRecord {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO guides (
        id, slug, title, category, content_path, excerpt,
        tags, related_tools, related_guides, difficulty,
        estimated_time, prerequisites, created_at, updated_at, version
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      slug,
      title,
      category,
      contentPath,
      excerpt,
      options?.tags ? JSON.stringify(options.tags) : JSON.stringify([]),
      options?.relatedTools ? JSON.stringify(options.relatedTools) : JSON.stringify([]),
      options?.relatedGuides ? JSON.stringify(options.relatedGuides) : JSON.stringify([]),
      options?.difficulty || 'beginner',
      options?.estimatedTime || 10,
      options?.prerequisites ? JSON.stringify(options.prerequisites) : JSON.stringify([]),
      now,
      now,
      options?.version || '1.0.0'
    );

    return {
      id,
      slug,
      title,
      category,
      contentPath,
      excerpt,
      tags: options?.tags || [],
      relatedTools: options?.relatedTools || [],
      relatedGuides: options?.relatedGuides || [],
      difficulty: options?.difficulty || 'beginner',
      estimatedTime: options?.estimatedTime || 10,
      prerequisites: options?.prerequisites || [],
      createdAt: now,
      updatedAt: now,
      version: options?.version || '1.0.0',
    };
  }

  /**
   * Get guide by ID
   */
  getGuide(id: string): GuideRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM guides WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return undefined;

    return this.guideRowToRecord(row);
  }

  /**
   * Get guide by slug
   */
  getGuideBySlug(slug: string): GuideRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM guides WHERE slug = ?');
    const row = stmt.get(slug) as any;

    if (!row) return undefined;

    return this.guideRowToRecord(row);
  }

  /**
   * List guides with filters
   */
  listGuides(filter?: GuideFilter): GuideRecord[] {
    let sql = 'SELECT * FROM guides WHERE 1=1';
    const params: any[] = [];

    if (filter?.category) {
      sql += ' AND category = ?';
      params.push(filter.category);
    }

    if (filter?.difficulty) {
      sql += ' AND difficulty = ?';
      params.push(filter.difficulty);
    }

    sql += ' ORDER BY created_at DESC';

    if (filter?.limit) {
      sql += ' LIMIT ?';
      params.push(filter.limit);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    let guides: GuideRecord[] = rows.map(this.guideRowToRecord.bind(this));

    // Filter by tags if specified
    if (filter?.tags && filter.tags.length > 0) {
      guides = guides.filter((guide: GuideRecord) =>
        filter.tags!.some((tag: string) => guide.tags.includes(tag))
      );
    }

    return guides;
  }

  /**
   * Search guides by keyword
   */
  searchGuides(query: string, options?: { limit?: number }): GuideRecord[] {
    const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

    let sql = 'SELECT * FROM guides WHERE 1=1';
    const params: any[] = [];

    if (keywords.length > 0) {
      const conditions = keywords
        .map(() => '(LOWER(title) LIKE ? OR LOWER(excerpt) LIKE ? OR LOWER(tags) LIKE ?)')
        .join(' AND ');
      sql += ` AND (${conditions})`;
      keywords.forEach((keyword) => {
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      });
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map(this.guideRowToRecord.bind(this));
  }

  /**
   * Update a guide
   */
  updateGuide(id: string, updates: Partial<Omit<GuideRecord, 'id' | 'createdAt'>>): GuideRecord | undefined {
    const existing = this.getGuide(id);
    if (!existing) return undefined;

    const now = Date.now();

    const stmt = this.db.prepare(`
      UPDATE guides
      SET slug = ?, title = ?, category = ?, content_path = ?, excerpt = ?,
          tags = ?, related_tools = ?, related_guides = ?, difficulty = ?,
          estimated_time = ?, prerequisites = ?, updated_at = ?, version = ?
      WHERE id = ?
    `);

    stmt.run(
      updates.slug ?? existing.slug,
      updates.title ?? existing.title,
      updates.category ?? existing.category,
      updates.contentPath ?? existing.contentPath,
      updates.excerpt ?? existing.excerpt,
      updates.tags ? JSON.stringify(updates.tags) : JSON.stringify(existing.tags),
      updates.relatedTools ? JSON.stringify(updates.relatedTools) : JSON.stringify(existing.relatedTools),
      updates.relatedGuides ? JSON.stringify(updates.relatedGuides) : JSON.stringify(existing.relatedGuides),
      updates.difficulty ?? existing.difficulty,
      updates.estimatedTime ?? existing.estimatedTime,
      updates.prerequisites ? JSON.stringify(updates.prerequisites) : JSON.stringify(existing.prerequisites),
      now,
      updates.version ?? existing.version,
      id
    );

    return this.getGuide(id);
  }

  /**
   * Delete a guide
   */
  deleteGuide(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM guides WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Create a tutorial step
   */
  createStep(
    guideId: string,
    stepNumber: number,
    title: string,
    content: string,
    options?: {
      codeExample?: string;
      expectedOutput?: string;
      checkCommand?: string;
      hints?: string[];
    }
  ): TutorialStep {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO tutorial_steps (
        id, guide_id, step_number, title, content,
        code_example, expected_output, check_command, hints,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      guideId,
      stepNumber,
      title,
      content,
      options?.codeExample || null,
      options?.expectedOutput || null,
      options?.checkCommand || null,
      options?.hints ? JSON.stringify(options.hints) : JSON.stringify([]),
      now,
      now
    );

    return {
      id,
      guideId,
      stepNumber,
      title,
      content,
      codeExample: options?.codeExample,
      expectedOutput: options?.expectedOutput,
      checkCommand: options?.checkCommand,
      hints: options?.hints || [],
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get steps for a guide
   */
  getSteps(guideId: string): TutorialStep[] {
    const stmt = this.db.prepare(
      'SELECT * FROM tutorial_steps WHERE guide_id = ? ORDER BY step_number ASC'
    );
    const rows = stmt.all(guideId) as any[];

    return rows.map(this.stepRowToRecord.bind(this));
  }

  /**
   * Get a specific step
   */
  getStep(guideId: string, stepNumber: number): TutorialStep | undefined {
    const stmt = this.db.prepare(
      'SELECT * FROM tutorial_steps WHERE guide_id = ? AND step_number = ?'
    );
    const row = stmt.get(guideId, stepNumber) as any;

    if (!row) return undefined;

    return this.stepRowToRecord(row);
  }

  /**
   * Update a tutorial step
   */
  updateStep(id: string, updates: Partial<Omit<TutorialStep, 'id' | 'guideId' | 'createdAt'>>): TutorialStep | undefined {
    const stmt = this.db.prepare('SELECT * FROM tutorial_steps WHERE id = ?');
    const existing = stmt.get(id) as any;

    if (!existing) return undefined;

    const now = Date.now();

    const updateStmt = this.db.prepare(`
      UPDATE tutorial_steps
      SET step_number = ?, title = ?, content = ?, code_example = ?,
          expected_output = ?, check_command = ?, hints = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      updates.stepNumber ?? existing.step_number,
      updates.title ?? existing.title,
      updates.content ?? existing.content,
      updates.codeExample !== undefined ? updates.codeExample : existing.code_example,
      updates.expectedOutput !== undefined ? updates.expectedOutput : existing.expected_output,
      updates.checkCommand !== undefined ? updates.checkCommand : existing.check_command,
      updates.hints ? JSON.stringify(updates.hints) : existing.hints,
      now,
      id
    );

    const updated = stmt.get(id) as any;
    return this.stepRowToRecord(updated);
  }

  /**
   * Delete a tutorial step
   */
  deleteStep(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM tutorial_steps WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Update learning progress
   */
  updateProgress(
    guideId: string,
    updates: {
      currentStep?: number;
      totalSteps?: number;
      status?: LearningStatus;
      completedSteps?: number[];
    }
  ): LearningProgress {
    const existing = this.getProgress(guideId);
    const now = Date.now();

    if (!existing) {
      // Create new progress
      const id = randomUUID();
      const stmt = this.db.prepare(`
        INSERT INTO learning_progress (
          id, guide_id, current_step, total_steps, status,
          completed_steps, started_at, last_accessed_at, completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const status = updates.status || 'in-progress';
      const completedAt = status === 'completed' ? now : null;

      stmt.run(
        id,
        guideId,
        updates.currentStep || 0,
        updates.totalSteps || 0,
        status,
        updates.completedSteps ? JSON.stringify(updates.completedSteps) : JSON.stringify([]),
        now,
        now,
        completedAt
      );

      return {
        id,
        guideId,
        currentStep: updates.currentStep || 0,
        totalSteps: updates.totalSteps || 0,
        status,
        completedSteps: updates.completedSteps || [],
        startedAt: now,
        lastAccessedAt: now,
        completedAt: completedAt || undefined,
      };
    }

    // Update existing progress
    const status = updates.status ?? existing.status;
    const completedAt = status === 'completed' && existing.status !== 'completed'
      ? now
      : existing.completedAt;

    const stmt = this.db.prepare(`
      UPDATE learning_progress
      SET current_step = ?, total_steps = ?, status = ?,
          completed_steps = ?, last_accessed_at = ?, completed_at = ?
      WHERE guide_id = ?
    `);

    stmt.run(
      updates.currentStep ?? existing.currentStep,
      updates.totalSteps ?? existing.totalSteps,
      status,
      updates.completedSteps ? JSON.stringify(updates.completedSteps) : JSON.stringify(existing.completedSteps),
      now,
      completedAt || null,
      guideId
    );

    return this.getProgress(guideId)!;
  }

  /**
   * Get learning progress for a guide
   */
  getProgress(guideId: string): LearningProgress | undefined {
    const stmt = this.db.prepare('SELECT * FROM learning_progress WHERE guide_id = ?');
    const row = stmt.get(guideId) as any;

    if (!row) return undefined;

    return this.progressRowToRecord(row);
  }

  /**
   * List all learning progress
   */
  listProgress(filter?: { status?: LearningStatus }): LearningProgress[] {
    let sql = 'SELECT * FROM learning_progress WHERE 1=1';
    const params: any[] = [];

    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    sql += ' ORDER BY last_accessed_at DESC';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map(this.progressRowToRecord.bind(this));
  }

  /**
   * Delete learning progress
   */
  deleteProgress(guideId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM learning_progress WHERE guide_id = ?');
    const result = stmt.run(guideId);
    return result.changes > 0;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const totalGuides = this.db.prepare('SELECT COUNT(*) as count FROM guides').get() as { count: number };

    const byCategory = this.db.prepare(`
      SELECT category, COUNT(*) as count
      FROM guides
      GROUP BY category
    `).all() as Array<{ category: string; count: number }>;

    const byDifficulty = this.db.prepare(`
      SELECT difficulty, COUNT(*) as count
      FROM guides
      GROUP BY difficulty
    `).all() as Array<{ difficulty: string; count: number }>;

    const totalProgress = this.db.prepare('SELECT COUNT(*) as count FROM learning_progress').get() as { count: number };

    const byStatus = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM learning_progress
      GROUP BY status
    `).all() as Array<{ status: string; count: number }>;

    return {
      totalGuides: totalGuides.count,
      byCategory,
      byDifficulty,
      totalProgress: totalProgress.count,
      progressByStatus: byStatus,
    };
  }

  /**
   * Convert database row to GuideRecord
   */
  private guideRowToRecord(row: any): GuideRecord {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      contentPath: row.content_path,
      excerpt: row.excerpt,
      tags: JSON.parse(row.tags || '[]'),
      relatedTools: JSON.parse(row.related_tools || '[]'),
      relatedGuides: JSON.parse(row.related_guides || '[]'),
      difficulty: row.difficulty,
      estimatedTime: row.estimated_time,
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
    };
  }

  /**
   * Convert database row to TutorialStep
   */
  private stepRowToRecord(row: any): TutorialStep {
    return {
      id: row.id,
      guideId: row.guide_id,
      stepNumber: row.step_number,
      title: row.title,
      content: row.content,
      codeExample: row.code_example || undefined,
      expectedOutput: row.expected_output || undefined,
      checkCommand: row.check_command || undefined,
      hints: JSON.parse(row.hints || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Convert database row to LearningProgress
   */
  private progressRowToRecord(row: any): LearningProgress {
    return {
      id: row.id,
      guideId: row.guide_id,
      currentStep: row.current_step,
      totalSteps: row.total_steps,
      status: row.status,
      completedSteps: JSON.parse(row.completed_steps || '[]'),
      startedAt: row.started_at,
      lastAccessedAt: row.last_accessed_at,
      completedAt: row.completed_at || undefined,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
