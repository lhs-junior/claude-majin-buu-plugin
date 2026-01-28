import { promises as fs } from 'fs';
import { resolve } from 'path';
import { GuideFrontmatter } from './guide-types.js';

export interface ParsedGuideContent {
  frontmatter: GuideFrontmatter;
  content: string;
}

export class GuideContentManager {
  private contentCache: Map<string, ParsedGuideContent>;
  private cacheTimestamps: Map<string, number>;
  private readonly cacheTTL: number;

  constructor(options?: { cacheTTL?: number }) {
    this.contentCache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheTTL = options?.cacheTTL || 5 * 60 * 1000; // Default 5 minutes
  }

  /**
   * Load and parse guide content from a markdown file
   */
  async loadGuideContent(contentPath: string): Promise<ParsedGuideContent> {
    const absolutePath = resolve(contentPath);

    // Check cache
    const cached = this.getCachedContent(absolutePath);
    if (cached) {
      return cached;
    }

    // Load file
    const rawContent = await fs.readFile(absolutePath, 'utf-8');

    // Parse frontmatter and content
    const parsed = this.parseMarkdownWithFrontmatter(rawContent);

    // Cache the result
    this.contentCache.set(absolutePath, parsed);
    this.cacheTimestamps.set(absolutePath, Date.now());

    return parsed;
  }

  /**
   * Parse markdown content with frontmatter
   */
  private parseMarkdownWithFrontmatter(rawContent: string): ParsedGuideContent {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = rawContent.match(frontmatterRegex);

    if (!match) {
      throw new Error('Invalid guide format: frontmatter not found');
    }

    const frontmatterRaw = match[1];
    const content = match[2];

    if (!frontmatterRaw || content === undefined) {
      throw new Error('Invalid guide format: missing frontmatter or content');
    }

    // Parse YAML-like frontmatter
    const frontmatter = this.parseFrontmatter(frontmatterRaw);

    return {
      frontmatter,
      content: content.trim(),
    };
  }

  /**
   * Parse YAML-like frontmatter into a structured object
   */
  private parseFrontmatter(frontmatterRaw: string): GuideFrontmatter {
    const lines = frontmatterRaw.split('\n');
    const frontmatter: any = {};
    let currentKey: string | null = null;
    let currentArray: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) continue;

      // Array item
      if (trimmed.startsWith('- ')) {
        const item = trimmed.substring(2).trim();
        currentArray.push(item);
        continue;
      }

      // Save previous array if exists
      if (currentKey && currentArray.length > 0) {
        frontmatter[currentKey] = currentArray;
        currentArray = [];
        currentKey = null;
      }

      // Key-value pair
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();

        if (value === '') {
          // Array starts
          currentKey = key;
          currentArray = [];
        } else {
          // Simple value
          frontmatter[key] = this.parseValue(value);
        }
      }
    }

    // Save last array if exists
    if (currentKey && currentArray.length > 0) {
      frontmatter[currentKey] = currentArray;
    }

    // Validate required fields
    if (!frontmatter.title || !frontmatter.category || !frontmatter.excerpt) {
      throw new Error('Missing required frontmatter fields: title, category, or excerpt');
    }

    return {
      title: frontmatter.title,
      category: frontmatter.category,
      excerpt: frontmatter.excerpt,
      tags: frontmatter.tags || [],
      relatedTools: frontmatter.relatedTools || [],
      relatedGuides: frontmatter.relatedGuides || [],
      difficulty: frontmatter.difficulty || 'beginner',
      estimatedTime: frontmatter.estimatedTime ? parseInt(frontmatter.estimatedTime, 10) : 10,
      prerequisites: frontmatter.prerequisites || [],
      version: frontmatter.version || '1.0.0',
    };
  }

  /**
   * Parse a single value from frontmatter
   */
  private parseValue(value: string): string | number {
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.substring(1, value.length - 1);
    }

    // Try to parse as number
    const num = parseFloat(value);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }

    return value;
  }

  /**
   * Get cached content if available and not expired
   */
  private getCachedContent(path: string): ParsedGuideContent | undefined {
    const cached = this.contentCache.get(path);
    const timestamp = this.cacheTimestamps.get(path);

    if (cached && timestamp) {
      const age = Date.now() - timestamp;
      if (age < this.cacheTTL) {
        return cached;
      }

      // Cache expired
      this.contentCache.delete(path);
      this.cacheTimestamps.delete(path);
    }

    return undefined;
  }

  /**
   * Clear all cached content
   */
  clearCache(): void {
    this.contentCache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Clear cached content for a specific path
   */
  clearCacheForPath(contentPath: string): void {
    const absolutePath = resolve(contentPath);
    this.contentCache.delete(absolutePath);
    this.cacheTimestamps.delete(absolutePath);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    this.cacheTimestamps.forEach((timestamp) => {
      const age = now - timestamp;
      if (age < this.cacheTTL) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      totalEntries: this.contentCache.size,
      validEntries,
      expiredEntries,
      cacheTTL: this.cacheTTL,
    };
  }

  /**
   * Preload multiple guide contents
   */
  async preloadGuides(contentPaths: string[]): Promise<Map<string, ParsedGuideContent | Error>> {
    const results = new Map<string, ParsedGuideContent | Error>();

    await Promise.allSettled(
      contentPaths.map(async (path) => {
        try {
          const content = await this.loadGuideContent(path);
          results.set(path, content);
        } catch (error) {
          results.set(path, error as Error);
        }
      })
    );

    return results;
  }

  /**
   * Validate guide content format without caching
   */
  async validateGuideContent(contentPath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const absolutePath = resolve(contentPath);
      const rawContent = await fs.readFile(absolutePath, 'utf-8');
      this.parseMarkdownWithFrontmatter(rawContent);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
