import type { ToolMetadata } from './gateway.js';

export interface ToolLoadingStrategy {
  layer: 1 | 2 | 3;
  priority: number;
  reason: string;
}

export interface LoadedToolsResult {
  essential: ToolMetadata[]; // Layer 1: Always loaded
  relevant: ToolMetadata[]; // Layer 2: Query-matched
  available: number; // Layer 3: Total available
  strategy: ToolLoadingStrategy;
}

export class ToolLoader {
  private allTools: Map<string, ToolMetadata>;
  private essentialTools: Set<string>;
  private loadingHistory: Map<string, number>; // toolName -> usage count

  constructor() {
    this.allTools = new Map();
    this.essentialTools = new Set([
      // Default essential tools (Layer 1)
      'read_file',
      'write_file',
      'search_files',
      'list_directory',
      'bash_command',
    ]);
    this.loadingHistory = new Map();
  }

  registerTool(tool: ToolMetadata): void {
    this.allTools.set(tool.name, tool);
  }

  registerTools(tools: ToolMetadata[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  unregisterTool(toolName: string): void {
    this.allTools.delete(toolName);
    this.loadingHistory.delete(toolName);
  }

  setEssentialTool(toolName: string): void {
    this.essentialTools.add(toolName);
  }

  removeEssentialTool(toolName: string): void {
    this.essentialTools.delete(toolName);
  }

  /**
   * Load tools using 3-layer strategy
   * Layer 1: Essential tools (always loaded)
   * Layer 2: Query-matched tools (based on search)
   * Layer 3: On-demand tools (loaded when explicitly requested)
   */
  async loadTools(query?: string, options?: { maxLayer2: number }): Promise<LoadedToolsResult> {
    const maxLayer2 = options?.maxLayer2 || 15;

    // Layer 1: Essential tools
    const essential = Array.from(this.essentialTools)
      .map((name) => this.allTools.get(name))
      .filter((tool): tool is ToolMetadata => tool !== undefined);

    // Layer 2: Query-matched tools (if query provided)
    let relevant: ToolMetadata[] = [];
    if (query) {
      relevant = this.searchTools(query, maxLayer2);
    }

    // Remove duplicates (tools that are both essential and relevant)
    const essentialNames = new Set(essential.map((t) => t.name));
    relevant = relevant.filter((t) => !essentialNames.has(t.name));

    return {
      essential,
      relevant,
      available: this.allTools.size,
      strategy: {
        layer: query ? 2 : 1,
        priority: this.calculatePriority(essential.length, relevant.length),
        reason: query
          ? `Loaded ${essential.length} essential + ${relevant.length} query-matched tools`
          : `Loaded ${essential.length} essential tools only`,
      },
    };
  }

  /**
   * Simple keyword-based search (will be replaced with BM25 in Phase 2)
   */
  private searchTools(query: string, limit: number): ToolMetadata[] {
    const queryLower = query.toLowerCase();
    const matches: Array<{ tool: ToolMetadata; score: number }> = [];

    for (const tool of this.allTools.values()) {
      let score = 0;

      // Score based on name match
      if (tool.name.toLowerCase().includes(queryLower)) {
        score += 10;
      }

      // Score based on description match
      if (tool.description?.toLowerCase().includes(queryLower)) {
        score += 5;
      }

      // Score based on keywords match
      if (tool.keywords) {
        for (const keyword of tool.keywords) {
          if (keyword.toLowerCase().includes(queryLower)) {
            score += 3;
          }
        }
      }

      // Consider usage history (tools used more frequently get higher scores)
      const usageCount = this.loadingHistory.get(tool.name) || 0;
      score += usageCount * 0.5;

      if (score > 0) {
        matches.push({ tool, score });
      }
    }

    // Sort by score (descending) and return top N
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, limit).map((m) => m.tool);
  }

  recordToolUsage(toolName: string): void {
    const currentCount = this.loadingHistory.get(toolName) || 0;
    this.loadingHistory.set(toolName, currentCount + 1);
  }

  getToolUsageCount(toolName: string): number {
    return this.loadingHistory.get(toolName) || 0;
  }

  getMostUsedTools(limit: number = 10): ToolMetadata[] {
    const usageArray = Array.from(this.loadingHistory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return usageArray
      .map(([name]) => this.allTools.get(name))
      .filter((tool): tool is ToolMetadata => tool !== undefined);
  }

  private calculatePriority(essentialCount: number, relevantCount: number): number {
    // Priority decreases as tool count increases (to indicate token usage)
    const totalTools = essentialCount + relevantCount;
    return Math.max(1, 10 - Math.floor(totalTools / 5));
  }

  getTool(toolName: string): ToolMetadata | undefined {
    return this.allTools.get(toolName);
  }

  getAllTools(): ToolMetadata[] {
    return Array.from(this.allTools.values());
  }

  getToolCount(): number {
    return this.allTools.size;
  }

  getStatistics() {
    return {
      totalTools: this.allTools.size,
      essentialTools: this.essentialTools.size,
      toolsWithUsageHistory: this.loadingHistory.size,
      averageUsageCount:
        Array.from(this.loadingHistory.values()).reduce((a, b) => a + b, 0) /
          Math.max(this.loadingHistory.size, 1) || 0,
    };
  }
}
