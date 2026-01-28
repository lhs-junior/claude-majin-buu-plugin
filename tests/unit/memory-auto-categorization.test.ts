import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryManager } from '../../src/features/memory/memory-manager.js';

describe('Memory Auto-Categorization', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager(':memory:', { autoCategorizationEnabled: true });
  });

  afterEach(() => {
    memoryManager.close();
  });

  describe('Category Detection', () => {
    it('should detect "decision" category from decision-related content', () => {
      const result = memoryManager.save({
        key: 'architecture_choice',
        value: 'We decided to use Redis for caching instead of Memcached',
      });

      expect(result.success).toBe(true);
      expect(result.memory.category).toBe('decision');
      expect(result.memory.tags).toBeDefined();
      expect(result.memory.tags).toContain('redis');
      expect(result.memory.tags).toContain('caching');
    });

    it('should detect "decision" with "opted for" phrasing', () => {
      const result = memoryManager.save({
        key: 'database_selection',
        value: 'Opted for PostgreSQL due to better transaction support',
      });

      expect(result.memory.category).toBe('decision');
      expect(result.memory.tags).toContain('postgresql');
    });

    it('should detect "bugfix" category from bug-related content', () => {
      const result = memoryManager.save({
        key: 'auth_bug',
        value: 'Fixed the authentication bug by checking token expiry properly',
      });

      expect(result.success).toBe(true);
      expect(result.memory.category).toBe('bugfix');
      expect(result.memory.tags).toContain('authentication');
      expect(result.memory.tags).toContain('token');
    });

    it('should detect "bugfix" with error-related terms', () => {
      const result = memoryManager.save({
        key: 'null_pointer_fix',
        value: 'Resolved null pointer exception in user service',
      });

      expect(result.memory.category).toBe('bugfix');
    });

    it('should detect "feature" category from feature implementation', () => {
      const result = memoryManager.save({
        key: 'dark_mode',
        value: 'Implemented dark mode toggle feature in settings',
      });

      expect(result.success).toBe(true);
      expect(result.memory.category).toBe('feature');
      expect(result.memory.tags).toContain('settings');
    });

    it('should detect "feature" with "added" phrasing', () => {
      const result = memoryManager.save({
        key: 'notification_system',
        value: 'Added real-time notification system using WebSocket',
      });

      expect(result.memory.category).toBe('feature');
      expect(result.memory.tags).toContain('websocket');
    });

    it('should detect "discovery" category from discovered information', () => {
      const result = memoryManager.save({
        key: 'performance_finding',
        value: 'Found that async/await performs better than callbacks in our use case',
      });

      expect(result.success).toBe(true);
      expect(result.memory.category).toBe('discovery');
      expect(result.memory.tags).toContain('async');
      expect(result.memory.tags).toContain('performance');
    });

    it('should detect "discovery" with "turns out" phrasing', () => {
      const result = memoryManager.save({
        key: 'browser_quirk',
        value: 'Turns out Safari handles CSS differently than Chrome',
      });

      expect(result.memory.category).toBe('discovery');
      expect(result.memory.tags).toContain('css');
    });

    it('should detect "learning" category from educational content', () => {
      const result = memoryManager.save({
        key: 'react_hooks',
        value: 'Learned how to use React hooks for state management',
      });

      expect(result.success).toBe(true);
      expect(result.memory.category).toBe('learning');
      expect(result.memory.tags).toContain('react');
    });

    it('should detect "config" category from configuration content', () => {
      const result = memoryManager.save({
        key: 'env_setup',
        value: 'Configure environment variables for production deployment',
      });

      expect(result.success).toBe(true);
      expect(result.memory.category).toBe('config');
      expect(result.memory.tags).toContain('environment');
      expect(result.memory.tags).toContain('deploy');
    });

    it('should detect "config" with setup-related terms', () => {
      const result = memoryManager.save({
        key: 'docker_setup',
        value: 'Setup Docker configuration for local development',
      });

      expect(result.memory.category).toBe('config');
      expect(result.memory.tags).toContain('docker');
    });

    it('should detect "idea" category from future considerations', () => {
      const result = memoryManager.save({
        key: 'future_enhancement',
        value: 'Consider adding GraphQL API in the future for better data fetching',
      });

      expect(result.success).toBe(true);
      expect(result.memory.category).toBe('idea');
      expect(result.memory.tags).toContain('graphql');
      expect(result.memory.tags).toContain('api');
    });

    it('should detect "idea" with "maybe" phrasing', () => {
      const result = memoryManager.save({
        key: 'potential_refactor',
        value: 'Maybe we could refactor this to use TypeScript',
      });

      expect(result.memory.category).toBe('idea');
      expect(result.memory.tags).toContain('typescript');
      expect(result.memory.tags).toContain('refactor');
    });

    it('should default to "learning" for ambiguous content', () => {
      const result = memoryManager.save({
        key: 'general_note',
        value: 'The application uses Express.js framework',
      });

      expect(result.success).toBe(true);
      expect(result.memory.category).toBe('learning');
      expect(result.memory.tags).toContain('express');
    });
  });

  describe('Tag Extraction', () => {
    it('should extract programming language tags', () => {
      const result = memoryManager.save({
        key: 'code_review',
        value: 'Review JavaScript and TypeScript code for consistency',
      });

      expect(result.memory.tags).toContain('javascript');
      expect(result.memory.tags).toContain('typescript');
    });

    it('should extract framework tags', () => {
      const result = memoryManager.save({
        key: 'tech_stack',
        value: 'Using React with Next.js for the frontend',
      });

      expect(result.memory.tags).toContain('react');
      expect(result.memory.tags).toContain('next');
      expect(result.memory.tags).toContain('frontend');
    });

    it('should extract database tags', () => {
      const result = memoryManager.save({
        key: 'database_stack',
        value: 'PostgreSQL for relational data, Redis for caching, MongoDB for logs',
      });

      expect(result.memory.tags).toContain('postgresql');
      expect(result.memory.tags).toContain('redis');
      expect(result.memory.tags).toContain('mongodb');
      expect(result.memory.tags).toContain('caching');
    });

    it('should extract file extension tags', () => {
      const result = memoryManager.save({
        key: 'file_types',
        value: 'Process .ts and .tsx files with TypeScript compiler',
      });

      expect(result.memory.tags).toContain('ts');
      expect(result.memory.tags).toContain('tsx');
      expect(result.memory.tags).toContain('typescript');
    });

    it('should extract action word tags', () => {
      const result = memoryManager.save({
        key: 'api_actions',
        value: 'API supports create, read, update, and delete operations',
      });

      expect(result.memory.tags).toContain('create');
      expect(result.memory.tags).toContain('read');
      expect(result.memory.tags).toContain('update');
      expect(result.memory.tags).toContain('delete');
      expect(result.memory.tags).toContain('api');
    });

    it('should extract security-related tags', () => {
      const result = memoryManager.save({
        key: 'security_impl',
        value: 'Implemented JWT authentication with OAuth2 authorization',
      });

      expect(result.memory.tags).toContain('jwt');
      expect(result.memory.tags).toContain('oauth');
      expect(result.memory.tags).toContain('authentication');
      expect(result.memory.tags).toContain('authorization');
    });

    it('should extract cloud service tags', () => {
      const result = memoryManager.save({
        key: 'cloud_deployment',
        value: 'Deployed to AWS using Docker and Kubernetes',
      });

      expect(result.memory.tags).toContain('aws');
      expect(result.memory.tags).toContain('docker');
      expect(result.memory.tags).toContain('kubernetes');
      expect(result.memory.tags).toContain('deploy');
    });

    it('should limit tags to prevent explosion', () => {
      const result = memoryManager.save({
        key: 'comprehensive_note',
        value: 'Using JavaScript TypeScript Python Java Go Rust Ruby PHP Swift Kotlin React Vue Angular Django Flask Rails Spring Express MongoDB PostgreSQL MySQL Redis Docker Kubernetes AWS Azure GCP',
      });

      // Should limit to 15 tags max
      expect(result.memory.tags!.length).toBeLessThanOrEqual(15);
    });

    it('should avoid duplicate tags', () => {
      const result = memoryManager.save({
        key: 'duplicate_test',
        value: 'React React React components and React hooks',
      });

      const reactCount = result.memory.tags!.filter(tag => tag === 'react').length;
      expect(reactCount).toBe(1);
    });

    it('should filter out common stop words', () => {
      const result = memoryManager.save({
        key: 'stop_words_test',
        value: 'This is what we have been doing with their system',
      });

      // Common stop words should not appear as tags
      const tags = result.memory.tags || [];
      expect(tags).not.toContain('this');
      expect(tags).not.toContain('that');
      expect(tags).not.toContain('what');
      expect(tags).not.toContain('with');
      expect(tags).not.toContain('their');
    });

    it('should extract meaningful domain-specific terms', () => {
      const result = memoryManager.save({
        key: 'domain_terms',
        value: 'Implemented microservice architecture with load balancing',
      });

      expect(result.memory.tags).toContain('microservice');
    });
  });

  describe('Integration with Existing Metadata', () => {
    it('should not override manually specified category', () => {
      const result = memoryManager.save({
        key: 'manual_category',
        value: 'Fixed a bug',
        metadata: {
          category: 'feature', // Manually specified (wrong but intentional)
        },
      });

      expect(result.memory.category).toBe('feature');
    });

    it('should merge auto-tags with manually specified tags', () => {
      const result = memoryManager.save({
        key: 'tag_merge',
        value: 'Using React and TypeScript',
        metadata: {
          tags: ['frontend', 'custom-tag'],
        },
      });

      expect(result.memory.tags).toContain('frontend');
      expect(result.memory.tags).toContain('custom-tag');
      expect(result.memory.tags).toContain('react');
      expect(result.memory.tags).toContain('typescript');
    });

    it('should respect expiration metadata', () => {
      const expiresAt = Date.now() + 86400000; // 24 hours
      const result = memoryManager.save({
        key: 'temp_note',
        value: 'Temporary configuration change',
        metadata: {
          expiresAt,
        },
      });

      expect(result.memory.expiresAt).toBe(expiresAt);
      expect(result.memory.category).toBe('config');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multi-topic content with appropriate categorization', () => {
      const result = memoryManager.save({
        key: 'complex_scenario',
        value: 'Fixed authentication bug and decided to migrate from MongoDB to PostgreSQL for better transaction support',
      });

      // Bugfix should take precedence as it appears first in pattern matching
      expect(result.memory.category).toBe('bugfix');
      expect(result.memory.tags).toContain('authentication');
      expect(result.memory.tags).toContain('mongodb');
      expect(result.memory.tags).toContain('postgresql');
    });

    it('should handle technical jargon appropriately', () => {
      const result = memoryManager.save({
        key: 'technical_note',
        value: 'Implemented REST API with GraphQL endpoint using Express.js and deployed via CI/CD pipeline',
      });

      expect(result.memory.category).toBe('feature');
      expect(result.memory.tags).toContain('rest');
      expect(result.memory.tags).toContain('graphql');
      expect(result.memory.tags).toContain('api');
      expect(result.memory.tags).toContain('express');
      expect(result.memory.tags).toContain('cicd');
      expect(result.memory.tags).toContain('deploy');
    });

    it('should handle code-heavy content', () => {
      const result = memoryManager.save({
        key: 'code_snippet',
        value: 'async function fetchData() using async/await pattern in .ts files',
      });

      expect(result.memory.tags).toContain('async');
      expect(result.memory.tags).toContain('ts');
      expect(result.memory.tags).toContain('fetch');
    });

    it('should categorize configuration-heavy content correctly', () => {
      const result = memoryManager.save({
        key: 'env_config',
        value: 'Setup .env file with DATABASE_URL and JWT_SECRET environment variables',
      });

      expect(result.memory.category).toBe('config');
      expect(result.memory.tags).toContain('env');
      expect(result.memory.tags).toContain('environment');
    });
  });

  describe('Auto-Categorization Toggle', () => {
    it('should not auto-categorize when disabled', () => {
      const disabledManager = new MemoryManager(':memory:', { autoCategorizationEnabled: false });

      const result = disabledManager.save({
        key: 'no_auto_cat',
        value: 'Fixed a bug in the authentication system',
      });

      expect(result.memory.category).toBeUndefined();
      expect(result.memory.tags).toBeUndefined();

      disabledManager.close();
    });

    it('should auto-categorize when enabled (default)', () => {
      const defaultManager = new MemoryManager(':memory:'); // No config = enabled by default

      const result = defaultManager.save({
        key: 'auto_cat_default',
        value: 'Fixed a bug in the authentication system',
      });

      expect(result.memory.category).toBe('bugfix');
      expect(result.memory.tags).toBeDefined();
      expect(result.memory.tags!.length).toBeGreaterThan(0);

      defaultManager.close();
    });

    it('should still allow manual metadata when auto-categorization is disabled', () => {
      const disabledManager = new MemoryManager(':memory:', { autoCategorizationEnabled: false });

      const result = disabledManager.save({
        key: 'manual_only',
        value: 'Some content',
        metadata: {
          category: 'feature',
          tags: ['manual', 'tag'],
        },
      });

      expect(result.memory.category).toBe('feature');
      expect(result.memory.tags).toEqual(['manual', 'tag']);

      disabledManager.close();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content gracefully', () => {
      const result = memoryManager.save({
        key: 'empty',
        value: '',
      });

      expect(result.success).toBe(true);
      expect(result.memory.category).toBeDefined();
    });

    it('should handle very short content', () => {
      const result = memoryManager.save({
        key: 'short',
        value: 'Fix bug',
      });

      expect(result.success).toBe(true);
      expect(result.memory.category).toBe('bugfix');
    });

    it('should handle very long content', () => {
      const longContent = 'Implemented a comprehensive authentication system using JWT tokens with refresh token rotation, OAuth2 integration for social logins including Google, GitHub, and Facebook, role-based access control with fine-grained permissions, session management with Redis, secure password hashing using bcrypt, and comprehensive audit logging for all authentication events. '.repeat(10);

      const result = memoryManager.save({
        key: 'long_content',
        value: longContent,
      });

      expect(result.success).toBe(true);
      expect(result.memory.category).toBe('feature');
      expect(result.memory.tags!.length).toBeLessThanOrEqual(15);
    });

    it('should handle special characters in content', () => {
      const result = memoryManager.save({
        key: 'special_chars',
        value: 'Fixed bug with @mentions, #hashtags, and $variables in parser',
      });

      expect(result.success).toBe(true);
      expect(result.memory.category).toBe('bugfix');
    });

    it('should handle Unicode characters', () => {
      const result = memoryManager.save({
        key: 'unicode',
        value: 'Implemented 日本語 support using React and TypeScript',
      });

      expect(result.success).toBe(true);
      expect(result.memory.tags).toContain('react');
      expect(result.memory.tags).toContain('typescript');
    });

    it('should handle mixed case appropriately', () => {
      const result = memoryManager.save({
        key: 'mixed_case',
        value: 'FIXED BUG in Authentication System using JWT',
      });

      expect(result.memory.category).toBe('bugfix');
      expect(result.memory.tags).toContain('jwt');
      expect(result.memory.tags).toContain('authentication');
    });
  });

  describe('Recall with Auto-Categorized Memories', () => {
    beforeEach(() => {
      // Populate with various categorized memories
      memoryManager.save({
        key: 'redis_decision',
        value: 'Decided to use Redis for session storage',
      });

      memoryManager.save({
        key: 'auth_bug',
        value: 'Fixed authentication timeout bug',
      });

      memoryManager.save({
        key: 'dark_mode_feature',
        value: 'Implemented dark mode feature',
      });
    });

    it('should recall memories by category filter', () => {
      const result = memoryManager.recall({
        query: 'redis',
        category: 'decision',
      });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].metadata.category).toBe('decision');
    });

    it('should find memories by auto-generated tags', () => {
      const result = memoryManager.recall({
        query: 'redis caching',
      });

      expect(result.results.length).toBeGreaterThan(0);
      const hasRedisTag = result.results.some(r =>
        r.metadata.tags?.includes('redis')
      );
      expect(hasRedisTag).toBe(true);
    });
  });
});
