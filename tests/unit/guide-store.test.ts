import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GuideStore } from '../../src/features/guide/guide-store.js';
import type { GuideRecord, TutorialStep, LearningProgress } from '../../src/features/guide/guide-types.js';

describe('GuideStore', () => {
  let store: GuideStore;

  beforeEach(() => {
    store = new GuideStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  describe('Guide CRUD Operations', () => {
    it('should create a guide', () => {
      const guide = store.createGuide(
        'getting-started',
        'Getting Started with Awesome Plugin',
        'getting-started',
        'guides/getting-started.md',
        'Learn the basics of awesome plugin',
        {
          tags: ['beginner', 'tutorial'],
          difficulty: 'beginner',
          estimatedTime: 15,
          version: '1.0.0',
        }
      );

      expect(guide).toBeDefined();
      expect(guide.slug).toBe('getting-started');
      expect(guide.difficulty).toBe('beginner');
      expect(guide.estimatedTime).toBe(15);
    });

    it('should retrieve guide by ID', () => {
      const created = store.createGuide(
        'test-guide',
        'Test Guide',
        'tutorial',
        'guides/test.md',
        'Test excerpt'
      );

      const retrieved = store.getGuide(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.slug).toBe('test-guide');
      expect(retrieved?.title).toBe('Test Guide');
    });

    it('should retrieve guide by slug', () => {
      store.createGuide('my-guide', 'My Guide', 'tutorial', 'guides/my.md', 'My excerpt');
      const retrieved = store.getGuideBySlug('my-guide');

      expect(retrieved).toBeDefined();
      expect(retrieved?.slug).toBe('my-guide');
    });

    it('should update a guide', () => {
      const created = store.createGuide(
        'update-test',
        'Original Title',
        'tutorial',
        'guides/test.md',
        'Original excerpt'
      );

      // Add delay to ensure updatedAt is different from createdAt
      const originalUpdatedAt = created.updatedAt;

      const updated = store.updateGuide(created.id, {
        title: 'Updated Title',
        excerpt: 'Updated excerpt',
        difficulty: 'intermediate',
      });

      expect(updated).toBeDefined();
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.excerpt).toBe('Updated excerpt');
      expect(updated?.difficulty).toBe('intermediate');
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it('should delete a guide', () => {
      const created = store.createGuide('delete-test', 'Guide to Delete', 'tutorial', 'guides/test.md', 'excerpt');
      expect(store.getGuide(created.id)).toBeDefined();

      const deleted = store.deleteGuide(created.id);
      expect(deleted).toBe(true);
      expect(store.getGuide(created.id)).toBeUndefined();
    });

    it('should list guides with filters', () => {
      store.createGuide('guide1', 'Beginner Guide', 'getting-started', 'path1', 'excerpt1', {
        difficulty: 'beginner',
        tags: ['basics'],
      });
      store.createGuide('guide2', 'Advanced Guide', 'reference', 'path2', 'excerpt2', {
        difficulty: 'advanced',
        tags: ['advanced'],
      });

      const beginnerGuides = store.listGuides({ difficulty: 'beginner' });
      expect(beginnerGuides.length).toBe(1);
      expect(beginnerGuides[0].difficulty).toBe('beginner');

      const categoryGuides = store.listGuides({ category: 'getting-started' });
      expect(categoryGuides.length).toBe(1);
    });

    it('should search guides by keyword', () => {
      store.createGuide('search1', 'TypeScript Guide', 'tutorial', 'path', 'Learn TypeScript basics', {
        tags: ['typescript', 'language'],
      });
      store.createGuide('search2', 'JavaScript Guide', 'tutorial', 'path', 'Learn JavaScript', {
        tags: ['javascript'],
      });

      const results = store.searchGuides('TypeScript', { limit: 10 });
      expect(results.length).toBe(1);
      expect(results[0].title).toContain('TypeScript');
    });
  });

  describe('Tutorial Step Operations', () => {
    let guideId: string;

    beforeEach(() => {
      const guide = store.createGuide('steps-guide', 'Steps Guide', 'tutorial', 'path', 'excerpt');
      guideId = guide.id;
    });

    it('should create a tutorial step', () => {
      const step = store.createStep(guideId, 1, 'First Step', 'Learn the first step', {
        codeExample: 'const x = 1;',
        expectedOutput: 'x is 1',
        hints: ['Try assigning a value', 'Use const keyword'],
      });

      expect(step).toBeDefined();
      expect(step.stepNumber).toBe(1);
      expect(step.hints.length).toBe(2);
    });

    it('should retrieve steps for a guide', () => {
      store.createStep(guideId, 1, 'Step 1', 'content1', { hints: ['hint1'] });
      store.createStep(guideId, 2, 'Step 2', 'content2', { hints: ['hint2'] });

      const steps = store.getSteps(guideId);
      expect(steps.length).toBe(2);
      expect(steps[0].stepNumber).toBe(1);
      expect(steps[1].stepNumber).toBe(2);
    });

    it('should get a specific step', () => {
      store.createStep(guideId, 1, 'Step 1', 'content1');
      const step = store.getStep(guideId, 1);

      expect(step).toBeDefined();
      expect(step?.title).toBe('Step 1');
    });

    it('should update a tutorial step', () => {
      const created = store.createStep(guideId, 1, 'Original', 'original content');
      const updated = store.updateStep(created.id, {
        title: 'Updated',
        content: 'updated content',
        hints: ['new hint'],
      });

      expect(updated).toBeDefined();
      expect(updated?.title).toBe('Updated');
      expect(updated?.hints.length).toBe(1);
    });

    it('should delete a tutorial step', () => {
      const created = store.createStep(guideId, 1, 'Step to Delete', 'content');
      expect(store.getStep(guideId, 1)).toBeDefined();

      store.deleteStep(created.id);
      expect(store.getStep(guideId, 1)).toBeUndefined();
    });
  });

  describe('Progress Tracking', () => {
    let guideId: string;

    beforeEach(() => {
      const guide = store.createGuide('progress-guide', 'Progress Guide', 'tutorial', 'path', 'excerpt');
      guideId = guide.id;
      // Create 3 steps
      store.createStep(guideId, 1, 'Step 1', 'content1');
      store.createStep(guideId, 2, 'Step 2', 'content2');
      store.createStep(guideId, 3, 'Step 3', 'content3');
    });

    it('should create learning progress', () => {
      const progress = store.updateProgress(guideId, {
        currentStep: 1,
        totalSteps: 3,
        status: 'in-progress',
      });

      expect(progress).toBeDefined();
      expect(progress.currentStep).toBe(1);
      expect(progress.totalSteps).toBe(3);
      expect(progress.status).toBe('in-progress');
    });

    it('should track completed steps', () => {
      const progress = store.updateProgress(guideId, {
        currentStep: 2,
        totalSteps: 3,
        status: 'in-progress',
        completedSteps: [1],
      });

      expect(progress.completedSteps).toContain(1);
      expect(progress.completedSteps.length).toBe(1);
    });

    it('should update progress status to completed', () => {
      store.updateProgress(guideId, {
        currentStep: 3,
        totalSteps: 3,
        status: 'in-progress',
      });

      const completed = store.updateProgress(guideId, {
        status: 'completed',
        completedSteps: [1, 2, 3],
      });

      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();
    });

    it('should retrieve progress for a guide', () => {
      store.updateProgress(guideId, {
        currentStep: 2,
        totalSteps: 3,
        status: 'in-progress',
      });

      const progress = store.getProgress(guideId);
      expect(progress).toBeDefined();
      expect(progress?.currentStep).toBe(2);
    });

    it('should list progress with filters', () => {
      const guide2 = store.createGuide('guide2', 'Guide 2', 'tutorial', 'path', 'excerpt');

      store.updateProgress(guideId, {
        currentStep: 1,
        totalSteps: 3,
        status: 'in-progress',
      });

      store.updateProgress(guide2.id, {
        currentStep: 3,
        totalSteps: 3,
        status: 'completed',
      });

      const inProgress = store.listProgress({ status: 'in-progress' });
      expect(inProgress.length).toBe(1);

      const completed = store.listProgress({ status: 'completed' });
      expect(completed.length).toBe(1);
    });

    it('should delete progress', () => {
      store.updateProgress(guideId, { currentStep: 1, totalSteps: 3, status: 'in-progress' });
      expect(store.getProgress(guideId)).toBeDefined();

      store.deleteProgress(guideId);
      expect(store.getProgress(guideId)).toBeUndefined();
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(() => {
      store.createGuide('react-guide', 'React Fundamentals', 'getting-started', 'path1', 'Learn React basics', {
        tags: ['react', 'javascript', 'frontend'],
        difficulty: 'beginner',
        relatedTools: ['npm', 'webpack'],
      });

      store.createGuide('react-advanced', 'Advanced React Patterns', 'reference', 'path2', 'Master React patterns', {
        tags: ['react', 'patterns', 'advanced'],
        difficulty: 'advanced',
        relatedTools: ['typescript'],
      });

      store.createGuide('vue-guide', 'Vue Fundamentals', 'getting-started', 'path3', 'Learn Vue basics', {
        tags: ['vue', 'javascript', 'frontend'],
        difficulty: 'beginner',
      });
    });

    it('should filter by difficulty', () => {
      const beginnerGuides = store.listGuides({ difficulty: 'beginner' });
      expect(beginnerGuides.length).toBe(2);
      beginnerGuides.forEach((guide) => {
        expect(guide.difficulty).toBe('beginner');
      });
    });

    it('should filter by category', () => {
      const gettingStarted = store.listGuides({ category: 'getting-started' });
      expect(gettingStarted.length).toBe(2);
    });

    it('should filter by tags', () => {
      const reactGuides = store.listGuides({ tags: ['react'] });
      expect(reactGuides.length).toBe(2);
    });

    it('should combine multiple filters', () => {
      const results = store.listGuides({
        category: 'getting-started',
        difficulty: 'beginner',
        tags: ['react'],
      });

      expect(results.length).toBe(1);
      expect(results[0].slug).toBe('react-guide');
    });

    it('should apply limit to results', () => {
      const results = store.listGuides({ limit: 1 });
      expect(results.length).toBe(1);
    });

    it('should search across title, excerpt, and tags', () => {
      const titleSearch = store.searchGuides('React', { limit: 10 });
      expect(titleSearch.length).toBeGreaterThan(0);

      const excerptSearch = store.searchGuides('Master React patterns', { limit: 10 });
      expect(excerptSearch.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      store.createGuide('guide1', 'Guide 1', 'getting-started', 'path1', 'excerpt1', {
        difficulty: 'beginner',
      });
      store.createGuide('guide2', 'Guide 2', 'tutorial', 'path2', 'excerpt2', {
        difficulty: 'intermediate',
      });
      store.createGuide('guide3', 'Guide 3', 'reference', 'path3', 'excerpt3', {
        difficulty: 'advanced',
      });
    });

    it('should return total guide count', () => {
      const stats = store.getStatistics();
      expect(stats.totalGuides).toBe(3);
    });

    it('should count guides by category', () => {
      const stats = store.getStatistics();
      expect(stats.byCategory).toBeDefined();
      expect(stats.byCategory.length).toBeGreaterThan(0);
    });

    it('should count guides by difficulty', () => {
      const stats = store.getStatistics();
      expect(stats.byDifficulty).toBeDefined();
      expect(stats.byDifficulty.length).toBe(3);
    });

    it('should track progress statistics', () => {
      const guide = store.getGuideBySlug('guide1');
      if (guide) {
        store.updateProgress(guide.id, {
          currentStep: 1,
          totalSteps: 3,
          status: 'in-progress',
        });

        const stats = store.getStatistics();
        expect(stats.totalProgress).toBe(1);
      }
    });
  });
});
