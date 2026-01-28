import { MemoryStore, MemoryRecord, MemoryFilter } from './memory-store.js';
import { BM25Indexer } from '../../search/bm25-indexer.js';
import type { ToolMetadata } from '../../core/types.js';
import {
  MemorySaveInputSchema,
  MemoryRecallInputSchema,
  MemoryListInputSchema,
  MemoryForgetInputSchema,
  validateInput,
  type MemorySaveInput,
  type MemoryRecallInput,
  type MemoryListInput,
  type MemoryForgetInput,
} from '../../validation/schemas.js';
import logger from '../../utils/logger.js';

// Re-export types for backwards compatibility
export type {
  MemorySaveInput,
  MemoryRecallInput,
  MemoryListInput,
  MemoryForgetInput,
};

type MemoryCategory = 'decision' | 'bugfix' | 'feature' | 'discovery' | 'learning' | 'config' | 'idea';

interface AutoCategorizationConfig {
  enabled: boolean;
}

export class MemoryManager {
  private store: MemoryStore;
  private indexer: BM25Indexer;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private autoCategorizationConfig: AutoCategorizationConfig;

  constructor(
    dbPath: string = ':memory:',
    config?: { autoCategorizationEnabled?: boolean }
  ) {
    this.store = new MemoryStore(dbPath);
    this.indexer = new BM25Indexer();
    this.autoCategorizationConfig = {
      enabled: config?.autoCategorizationEnabled ?? true,
    };

    // Index existing memories on initialization
    this.reindexAll();

    // Cleanup expired memories periodically (every hour)
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.store.cleanupExpired();
      if (cleaned > 0) {
        logger.debug(`Cleaned up ${cleaned} expired memories`);
        this.reindexAll();
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Save a memory
   */
  save(input: MemorySaveInput): { success: boolean; id: string; memory: MemoryRecord } {
    try {
      // Apply auto-categorization if enabled and not already categorized
      const metadata = { ...input.metadata };

      if (this.autoCategorizationConfig.enabled) {
        const content = `${input.key} ${input.value}`;

        // Auto-detect category if not provided
        if (!metadata.category) {
          metadata.category = this.analyzeMemoryContent(content);
        }

        // Auto-extract and merge tags if not provided or to supplement existing ones
        const autoTags = this.extractKeywords(content);
        if (metadata.tags) {
          // Merge with existing tags, avoiding duplicates
          const existingTags = new Set(metadata.tags);
          autoTags.forEach(tag => existingTags.add(tag));
          metadata.tags = Array.from(existingTags);
        } else {
          metadata.tags = autoTags;
        }
      }

      const memory = this.store.save(input.key, input.value, metadata);

      // Add to BM25 index for semantic search
      this.indexer.addDocument({
        name: `memory:${memory.id}`,
        description: `${memory.key}: ${memory.value}`,
        category: memory.category,
        keywords: memory.tags || [],
        serverId: 'internal:memory',
        inputSchema: { type: 'object' },
      });

      return {
        success: true,
        id: memory.id,
        memory,
      };
    } catch (error: unknown) {
      logger.error('Failed to save memory:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to save memory: ${message}`);
    }
  }

  /**
   * Recall memories using BM25 semantic search
   */
  recall(input: MemoryRecallInput): {
    results: Array<{
      id: string;
      key: string;
      value: string;
      relevance: number;
      metadata: {
        category?: string;
        tags?: string[];
        createdAt: number;
        accessCount: number;
      };
    }>;
  } {
    try {
      // Use BM25 for semantic search
      const searchResults = this.indexer.search(input.query, {
        limit: input.limit || 10,
      });

      // Filter by category if specified
      const filtered = input.category
        ? searchResults.filter((r) => r.metadata.category === input.category)
        : searchResults;

      // Get full memory records
      const results = filtered
        .map((result) => {
          // Extract memory ID from tool name (format: "memory:uuid")
          const memoryId = result.toolName.replace('memory:', '');
          const memory = this.store.get(memoryId);
          if (!memory) return null;

          return {
            id: memory.id,
            key: memory.key,
            value: memory.value,
            relevance: result.score,
            metadata: {
              category: memory.category,
              tags: memory.tags,
              createdAt: memory.createdAt,
              accessCount: memory.accessCount,
            },
          };
        })
        .filter((r) => r !== null);

      return { results };
    } catch (error: unknown) {
      logger.error('Failed to recall memories:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to recall memories: ${message}`);
    }
  }

  /**
   * List memories with filters
   */
  list(input: MemoryListInput): {
    memories: Array<{
      id: string;
      key: string;
      value: string;
      createdAt: number;
      metadata: {
        category?: string;
        tags?: string[];
        accessCount: number;
      };
    }>;
  } {
    try {
      const filter: MemoryFilter = {
        ...input.filter,
        limit: input.limit,
      };

      const memories = this.store.list(filter);

      return {
        memories: memories.map((m) => ({
          id: m.id,
          key: m.key,
          value: m.value,
          createdAt: m.createdAt,
          metadata: {
            category: m.category,
            tags: m.tags,
            accessCount: m.accessCount,
          },
        })),
      };
    } catch (error: unknown) {
      logger.error('Failed to list memories:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list memories: ${message}`);
    }
  }

  /**
   * Forget a memory
   */
  forget(input: MemoryForgetInput): { success: boolean } {
    try {
      const success = this.store.forget(input.id);

      if (success) {
        // Remove from BM25 index
        this.indexer.removeDocument(`memory:${input.id}`);
      }

      return { success };
    } catch (error: unknown) {
      logger.error('Failed to forget memory:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to forget memory: ${message}`);
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const storeStats = this.store.getStatistics();
    const indexStats = this.indexer.getStatistics();

    return {
      store: storeStats,
      index: {
        documentsIndexed: indexStats.documentCount,
        avgDocumentLength: indexStats.averageDocumentLength,
      },
    };
  }

  /**
   * Reindex all memories for BM25 search
   */
  private reindexAll(): void {
    const memories = this.store.list();

    // Clear existing memory indices
    const indexStats = this.indexer.getStatistics();
    for (const docName of Object.keys(indexStats)) {
      if (docName.startsWith('memory:')) {
        this.indexer.removeDocument(docName);
      }
    }

    // Reindex all active memories
    const tools: ToolMetadata[] = memories.map((m) => ({
      name: `memory:${m.id}`,
      description: `${m.key}: ${m.value}`,
      category: m.category,
      keywords: m.tags || [],
      serverId: 'internal:memory',
      inputSchema: { type: 'object' },
    }));

    this.indexer.addDocuments(tools);
  }

  /**
   * Get MCP tool definitions for memory management
   */
  getToolDefinitions(): ToolMetadata[] {
    return [
      {
        name: 'memory_save',
        description: 'Save information to memory for later recall. Use this to remember important facts, preferences, or context.',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'A short, descriptive key for this memory (e.g., "user_preference", "project_goal")',
            },
            value: {
              type: 'string',
              description: 'The actual information to remember',
            },
            metadata: {
              type: 'object',
              properties: {
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional tags for categorization',
                },
                category: {
                  type: 'string',
                  description: 'Optional category (e.g., "preference", "fact", "context")',
                },
                expiresAt: {
                  type: 'number',
                  description: 'Optional Unix timestamp when this memory should expire',
                },
              },
            },
          },
          required: ['key', 'value'],
        },
        category: 'memory',
        keywords: ['memory', 'remember', 'save', 'store', 'recall', 'context'],
        serverId: 'internal:memory',
      },
      {
        name: 'memory_recall',
        description: 'Search and recall memories using semantic search. Finds relevant memories based on your query.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'What you want to remember (natural language query)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            category: {
              type: 'string',
              description: 'Optional category filter',
            },
          },
          required: ['query'],
        },
        category: 'memory',
        keywords: ['memory', 'recall', 'remember', 'search', 'find', 'retrieve'],
        serverId: 'internal:memory',
      },
      {
        name: 'memory_list',
        description: 'List all memories with optional filters. Useful for browsing what has been remembered.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Filter by category',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by tags (matches any)',
                },
                since: {
                  type: 'number',
                  description: 'Only show memories created after this timestamp',
                },
              },
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 50)',
            },
          },
        },
        category: 'memory',
        keywords: ['memory', 'list', 'browse', 'all', 'show'],
        serverId: 'internal:memory',
      },
      {
        name: 'memory_forget',
        description: 'Delete a specific memory by its ID. Use this to remove outdated or incorrect information.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The ID of the memory to forget',
            },
          },
          required: ['id'],
        },
        category: 'memory',
        keywords: ['memory', 'forget', 'delete', 'remove', 'clear'],
        serverId: 'internal:memory',
      },
    ];
  }

  /**
   * Handle tool calls (for Gateway integration) with Zod validation
   */
  async handleToolCall(toolName: string, args: unknown): Promise<unknown> {
    switch (toolName) {
      case 'memory_save': {
        const validation = validateInput(MemorySaveInputSchema, args);
        if (!validation.success) {
          throw new Error(validation.error);
        }
        return this.save(validation.data!);
      }

      case 'memory_recall': {
        const validation = validateInput(MemoryRecallInputSchema, args);
        if (!validation.success) {
          throw new Error(validation.error);
        }
        return this.recall(validation.data!);
      }

      case 'memory_list': {
        const validation = validateInput(MemoryListInputSchema, args);
        if (!validation.success) {
          throw new Error(validation.error);
        }
        return this.list(validation.data!);
      }

      case 'memory_forget': {
        const validation = validateInput(MemoryForgetInputSchema, args);
        if (!validation.success) {
          throw new Error(validation.error);
        }
        return this.forget(validation.data!);
      }

      default:
        throw new Error(`Unknown memory tool: ${toolName}`);
    }
  }

  /**
   * Analyze memory content to detect category
   * Uses pattern matching based on keywords and context
   */
  private analyzeMemoryContent(content: string): MemoryCategory {
    const lowerContent = content.toLowerCase();

    // Category detection patterns (order matters - more specific first)
    const categoryPatterns: Array<{ category: MemoryCategory; patterns: RegExp[] }> = [
      {
        category: 'bugfix',
        patterns: [
          /\b(fix(ed)?|bug|error|issue|crash|broken|repair|patch|resolve|debug)\b/,
          /\b(doesn't work|not working|fails?|failing)\b/,
          /\b(exception|stack trace|null pointer|undefined)\b/,
        ],
      },
      {
        category: 'feature',
        patterns: [
          /\b(implement(ed)?|add(ed)?|creat(e|ed)|built?|develop(ed)?)\b/,
          /\b(feature|functionality|capability|enhancement)\b/,
          /\b(new|introduce|enable)\b.*\b(feature|function|component)\b/,
        ],
      },
      {
        category: 'decision',
        patterns: [
          /\b(decid(e|ed)|chose|choice|select(ed)?|opt(ed)? for|went with)\b/,
          /\b(instead of|rather than|prefer)\b/,
        ],
      },
      {
        category: 'config',
        patterns: [
          /\b(config(ure|uration)?|setting|environment|setup|install)\b/,
          /\b(env|\.env|environment variable|flag|option)\b/,
          /\b(enable|disable|toggle|switch)\b.*\b(feature|mode|option)\b/,
        ],
      },
      {
        category: 'learning',
        patterns: [
          /\b(learn(ed)? how)\b/,
          /\b(tutorial|guide|documentation|example)\b/,
        ],
      },
      {
        category: 'discovery',
        patterns: [
          /\b(found|discover(ed)?|realiz(e|ed)|notic(e|ed))\b/,
          /\b(turns? out|it seems|apparently|actually)\b/,
          /\b(interesting|surprising|unexpected)\b/,
        ],
      },
      {
        category: 'idea',
        patterns: [
          /\b(idea|thought|consider|maybe|could|might|perhaps)\b/,
          /\b(future|later|todo|potential|possible)\b/,
          /\b(what if|brainstorm|proposal)\b/,
        ],
      },
    ];

    // Find matching category
    for (const { category, patterns } of categoryPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(lowerContent)) {
          return category;
        }
      }
    }

    // Default to 'learning' if no specific pattern matched
    return 'learning';
  }

  /**
   * Extract relevant keywords from content
   * Uses simple NLP: common tech terms, file extensions, framework names
   */
  private extractKeywords(content: string): string[] {
    const keywords = new Set<string>();
    const lowerContent = content.toLowerCase();

    // Common tech terms and frameworks
    const techTerms = [
      // Languages
      'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
      'c++', 'csharp', 'c#', 'scala', 'elixir', 'clojure',

      // Frameworks & Libraries
      'react', 'vue', 'angular', 'svelte', 'next', 'nextjs', 'nuxt', 'gatsby',
      'express', 'fastify', 'koa', 'nest', 'nestjs',
      'django', 'flask', 'fastapi', 'rails', 'laravel',
      'spring', 'springboot',

      // Databases
      'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'elasticsearch', 'cassandra',
      'dynamodb', 'sqlite', 'mariadb', 'oracle', 'mssql',

      // Tools & Services
      'docker', 'kubernetes', 'k8s', 'aws', 'azure', 'gcp', 'github', 'gitlab', 'jenkins',
      'webpack', 'vite', 'rollup', 'babel', 'eslint', 'prettier',
      'jest', 'mocha', 'vitest', 'pytest', 'junit',

      // Concepts
      'api', 'rest', 'graphql', 'grpc', 'websocket', 'oauth', 'jwt', 'auth', 'authentication',
      'authorization', 'cache', 'caching', 'session', 'cookie',
      'frontend', 'backend', 'fullstack', 'devops', 'cicd', 'ci/cd',
      'microservice', 'serverless', 'lambda', 'container',
      'database', 'sql', 'nosql', 'query', 'migration',
      'testing', 'unit test', 'integration test', 'e2e',
      'performance', 'optimization', 'scaling', 'load balancing',
      'security', 'encryption', 'ssl', 'tls', 'https',
      'logging', 'monitoring', 'metrics', 'tracing',
      'ui', 'ux', 'design', 'css', 'html', 'dom',
      'async', 'promise', 'callback', 'event',
      'error', 'exception', 'debug', 'log',
      'config', 'configuration', 'environment',
      'build', 'deploy', 'release', 'version',
    ];

    // Check for tech terms
    for (const term of techTerms) {
      if (lowerContent.includes(term)) {
        // Normalize terms (e.g., ci/cd -> cicd)
        const normalizedTerm = term.replace(/[\/\-\s]/g, '');
        keywords.add(normalizedTerm);
      }
    }

    // Extract file extensions (e.g., .js, .ts, .py)
    const extensionRegex = /\.(js|ts|tsx|jsx|py|java|go|rs|rb|php|swift|kt|cpp|cs|scala|ex|clj|yml|yaml|json|xml|html|css|scss|sass|sql|md|sh|env)\b/gi;
    const extensions = content.match(extensionRegex);
    if (extensions) {
      extensions.forEach(ext => keywords.add(ext.substring(1))); // Remove the dot
    }

    // Extract common action words (including variations and as part of compound words)
    const actionWords = [
      'read', 'write', 'create', 'update', 'delete', 'fetch', 'send', 'receive',
      'upload', 'download', 'save', 'load', 'process', 'parse', 'validate',
      'authenticate', 'authorize', 'encrypt', 'decrypt', 'hash', 'token',
      'install', 'configure', 'setup', 'deploy', 'build', 'compile',
      'test', 'debug', 'fix', 'optimize', 'refactor', 'migrate',
    ];

    for (const word of actionWords) {
      // Match as standalone word or as part of compound words (e.g., fetchData)
      if (new RegExp(`\\b${word}(ed|ing|s|data)?\\b`, 'i').test(lowerContent)) {
        keywords.add(word);
      }
    }

    // Extract domain-specific terms (simple word tokenization)
    const words = content
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && word.length < 20);

    // Add meaningful words that appear relevant (not common stop words)
    const stopWords = new Set([
      'this', 'that', 'with', 'from', 'have', 'been', 'were', 'will', 'their',
      'what', 'when', 'where', 'which', 'while', 'about', 'would', 'there',
      'could', 'should', 'these', 'those', 'into', 'through', 'after', 'before',
    ]);

    for (const word of words) {
      if (!stopWords.has(word) && keywords.size < 10) {
        // Only add if not already covered and limit to prevent tag explosion
        const alreadyCovered = Array.from(keywords).some(kw => word.includes(kw) || kw.includes(word));
        if (!alreadyCovered) {
          keywords.add(word);
        }
      }
    }

    // Limit total tags to prevent explosion
    return Array.from(keywords).slice(0, 15);
  }

  /**
   * Close resources
   */
  close(): void {
    // Clear cleanup interval to prevent accessing closed DB
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Clear indexer to free memory and remove document references
    this.indexer.clear();

    // Close database
    this.store.close();
  }
}
