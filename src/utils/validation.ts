/**
 * Validation Utilities - Zod schemas and type guards for runtime validation
 *
 * Replaces unsafe `as` type assertions with proper runtime validation.
 * Database rows and external data should be validated before use.
 */

import { z } from 'zod';
import logger from './logger.js';

// =============================================================================
// Common Schemas
// =============================================================================

/**
 * Schema for database count queries (SELECT COUNT(*) as count)
 */
export const CountRowSchema = z.object({
  count: z.number(),
});

/**
 * Safely parse a count row from database
 */
export function parseCountRow(row: unknown): { count: number } {
  const result = CountRowSchema.safeParse(row);
  if (!result.success) {
    logger.error('Invalid count row:', result.error.message);
    return { count: 0 };
  }
  return result.data;
}

/**
 * Schema for database average queries (SELECT AVG(...) as avg)
 */
export const AvgRowSchema = z.object({
  avg: z.number().nullable(),
});

/**
 * Safely parse an avg row from database
 */
export function parseAvgRow(row: unknown): { avg: number | null } {
  const result = AvgRowSchema.safeParse(row);
  if (!result.success) {
    logger.error('Invalid avg row:', result.error.message);
    return { avg: null };
  }
  return result.data;
}

// =============================================================================
// Plugin/Tool Database Row Schemas
// =============================================================================

/**
 * Raw database row for plugins table
 */
export const PluginDbRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  command: z.string(),
  args: z.string().nullable().optional(),
  env: z.string().nullable().optional(),
  addedAt: z.number(),
  lastUsed: z.number(),
  usageCount: z.number(),
  qualityScore: z.number(),
});

export type PluginDbRow = z.infer<typeof PluginDbRowSchema>;

/**
 * Safely parse a plugin row from database
 */
export function parsePluginRow(row: unknown): PluginDbRow | null {
  const result = PluginDbRowSchema.safeParse(row);
  if (!result.success) {
    logger.error('Invalid plugin row:', result.error.message);
    return null;
  }
  return result.data;
}

/**
 * Parse multiple plugin rows
 */
export function parsePluginRows(rows: unknown[]): PluginDbRow[] {
  return rows.map(parsePluginRow).filter((r): r is PluginDbRow => r !== null);
}

/**
 * Raw database row for tools table
 */
export const ToolDbRowSchema = z.object({
  name: z.string(),
  serverId: z.string(),
  description: z.string().nullable().optional(),
  inputSchema: z.string(),
  category: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
});

export type ToolDbRow = z.infer<typeof ToolDbRowSchema>;

/**
 * Safely parse a tool row from database
 */
export function parseToolRow(row: unknown): ToolDbRow | null {
  const result = ToolDbRowSchema.safeParse(row);
  if (!result.success) {
    logger.error('Invalid tool row:', result.error.message);
    return null;
  }
  return result.data;
}

/**
 * Parse multiple tool rows
 */
export function parseToolRows(rows: unknown[]): ToolDbRow[] {
  return rows.map(parseToolRow).filter((r): r is ToolDbRow => r !== null);
}

/**
 * Raw database row for usage_logs table
 */
export const UsageLogDbRowSchema = z.object({
  id: z.number(),
  timestamp: z.number(),
  tool_name: z.string(),
  query: z.string(),
  success: z.union([z.number(), z.boolean()]),
  response_time: z.number().nullable().optional(),
});

export type UsageLogDbRow = z.infer<typeof UsageLogDbRowSchema>;

/**
 * Safely parse a usage log row from database
 */
export function parseUsageLogRow(row: unknown): UsageLogDbRow | null {
  const result = UsageLogDbRowSchema.safeParse(row);
  if (!result.success) {
    logger.error('Invalid usage log row:', result.error.message);
    return null;
  }
  return result.data;
}

/**
 * Parse multiple usage log rows
 */
export function parseUsageLogRows(rows: unknown[]): UsageLogDbRow[] {
  return rows.map(parseUsageLogRow).filter((r): r is UsageLogDbRow => r !== null);
}

/**
 * Most used tool row schema
 */
export const MostUsedToolRowSchema = z.object({
  name: z.string(),
  usage_count: z.number(),
});

export type MostUsedToolRow = z.infer<typeof MostUsedToolRowSchema>;

/**
 * Parse most used tool rows
 */
export function parseMostUsedToolRows(rows: unknown[]): MostUsedToolRow[] {
  return rows
    .map((row) => {
      const result = MostUsedToolRowSchema.safeParse(row);
      return result.success ? result.data : null;
    })
    .filter((r): r is MostUsedToolRow => r !== null);
}

// =============================================================================
// Science Store Schemas
// =============================================================================

/**
 * Raw database row for science_sessions table
 */
export const ScienceSessionDbRowSchema = z.object({
  id: z.string(),
  namespace: z.string(),
  created_at: z.number(),
  last_used_at: z.number(),
  execution_count: z.number(),
  variables: z.string().nullable().optional(),
  packages: z.string().nullable().optional(),
  history: z.string().nullable().optional(),
  pickle_data: z.instanceof(Buffer).nullable().optional(),
});

export type ScienceSessionDbRow = z.infer<typeof ScienceSessionDbRowSchema>;

/**
 * Safely parse a science session row from database
 */
export function parseScienceSessionRow(row: unknown): ScienceSessionDbRow | null {
  const result = ScienceSessionDbRowSchema.safeParse(row);
  if (!result.success) {
    logger.error('Invalid science session row:', result.error.message);
    return null;
  }
  return result.data;
}

/**
 * Parse multiple science session rows
 */
export function parseScienceSessionRows(rows: unknown[]): ScienceSessionDbRow[] {
  return rows.map(parseScienceSessionRow).filter((r): r is ScienceSessionDbRow => r !== null);
}

/**
 * Raw database row for science_results table
 */
export const ScienceResultDbRowSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  tool_name: z.string(),
  result_type: z.string(),
  result_data: z.string().nullable().optional(),
  metadata: z.string().nullable().optional(),
  created_at: z.number(),
});

export type ScienceResultDbRow = z.infer<typeof ScienceResultDbRowSchema>;

/**
 * Safely parse a science result row from database
 */
export function parseScienceResultRow(row: unknown): ScienceResultDbRow | null {
  const result = ScienceResultDbRowSchema.safeParse(row);
  if (!result.success) {
    logger.error('Invalid science result row:', result.error.message);
    return null;
  }
  return result.data;
}

/**
 * Parse multiple science result rows
 */
export function parseScienceResultRows(rows: unknown[]): ScienceResultDbRow[] {
  return rows.map(parseScienceResultRow).filter((r): r is ScienceResultDbRow => r !== null);
}

/**
 * Science statistics helper schemas
 */
export const NamespaceCountRowSchema = z.object({
  namespace: z.string(),
  count: z.number(),
});

export const ToolNameCountRowSchema = z.object({
  tool_name: z.string(),
  count: z.number(),
});

export function parseNamespaceCountRows(rows: unknown[]): Array<{ namespace: string; count: number }> {
  return rows
    .map((row) => {
      const result = NamespaceCountRowSchema.safeParse(row);
      return result.success ? result.data : null;
    })
    .filter((r): r is { namespace: string; count: number } => r !== null);
}

export function parseToolNameCountRows(rows: unknown[]): Array<{ tool_name: string; count: number }> {
  return rows
    .map((row) => {
      const result = ToolNameCountRowSchema.safeParse(row);
      return result.success ? result.data : null;
    })
    .filter((r): r is { tool_name: string; count: number } => r !== null);
}

// =============================================================================
// Agent Store Schemas
// =============================================================================

/**
 * Raw database row for agents table
 */
export const AgentDbRowSchema = z.object({
  id: z.string(),
  type: z.string(),
  task: z.string(),
  status: z.string(),
  result: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  started_at: z.number(),
  completed_at: z.number().nullable().optional(),
  timeout: z.number().nullable().optional(),
  progress: z.string().nullable().optional(),
  specialist_config: z.string().nullable().optional(),
  parent_task_id: z.string().nullable().optional(),
  memory_keys: z.string().nullable().optional(),
});

export type AgentDbRow = z.infer<typeof AgentDbRowSchema>;

/**
 * Safely parse an agent row from database
 */
export function parseAgentRow(row: unknown): AgentDbRow | null {
  const result = AgentDbRowSchema.safeParse(row);
  if (!result.success) {
    logger.error('Invalid agent row:', result.error.message);
    return null;
  }
  return result.data;
}

/**
 * Parse multiple agent rows
 */
export function parseAgentRows(rows: unknown[]): AgentDbRow[] {
  return rows.map(parseAgentRow).filter((r): r is AgentDbRow => r !== null);
}

/**
 * Agent statistics helper schemas
 */
export const StatusCountRowSchema = z.object({
  status: z.string(),
  count: z.number(),
});

export const TypeCountRowSchema = z.object({
  type: z.string(),
  count: z.number(),
});

export function parseStatusCountRows(rows: unknown[]): Array<{ status: string; count: number }> {
  return rows
    .map((row) => {
      const result = StatusCountRowSchema.safeParse(row);
      return result.success ? result.data : null;
    })
    .filter((r): r is { status: string; count: number } => r !== null);
}

export function parseTypeCountRows(rows: unknown[]): Array<{ type: string; count: number }> {
  return rows
    .map((row) => {
      const result = TypeCountRowSchema.safeParse(row);
      return result.success ? result.data : null;
    })
    .filter((r): r is { type: string; count: number } => r !== null);
}

// =============================================================================
// Agent Orchestrator Input Schemas
// =============================================================================

/**
 * Schema for SpawnAgentInput
 */
export const SpawnAgentInputSchema = z.object({
  type: z.string(),
  task: z.string(),
  timeout: z.number().optional(),
  specialistConfig: z.record(z.any()).optional(),
  parentTaskId: z.string().nullable().optional(),
  memoryKeys: z.array(z.string()).optional(),
  saveToMemory: z.boolean().optional(),
  memoryTags: z.array(z.string()).optional(),
  createTodo: z.boolean().optional(),
  testPath: z.string().optional(),
});

/**
 * Schema for AgentStatusInput
 */
export const AgentStatusInputSchema = z.object({
  agentId: z.string(),
});

/**
 * Schema for AgentResultInput
 */
export const AgentResultInputSchema = z.object({
  agentId: z.string(),
});

/**
 * Schema for AgentTerminateInput
 */
export const AgentTerminateInputSchema = z.object({
  agentId: z.string(),
});

/**
 * Schema for AgentListInput
 */
export const AgentListInputSchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  limit: z.number().optional(),
});

/**
 * Validate and parse agent tool inputs
 */
export function parseSpawnAgentInput(args: unknown) {
  return SpawnAgentInputSchema.parse(args);
}

export function parseAgentStatusInput(args: unknown) {
  return AgentStatusInputSchema.parse(args);
}

export function parseAgentResultInput(args: unknown) {
  return AgentResultInputSchema.parse(args);
}

export function parseAgentTerminateInput(args: unknown) {
  return AgentTerminateInputSchema.parse(args);
}

export function parseAgentListInput(args: unknown) {
  return AgentListInputSchema.parse(args);
}

// =============================================================================
// Type Guards for Discriminated Unions
// =============================================================================

/**
 * Type guard to check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Type guard to check if a value has a specific property
 */
export function hasProperty<K extends string>(
  value: unknown,
  key: K
): value is Record<K, unknown> {
  return isObject(value) && key in value;
}

/**
 * Type guard for checking MCP response content array
 */
export function isMCPContentArray(
  content: unknown
): content is Array<{ text?: string; type?: string }> {
  return Array.isArray(content) && content.every(isObject);
}

/**
 * Safely extract error text from MCP response content
 */
export function extractMCPErrorText(content: unknown): string {
  if (!isMCPContentArray(content)) {
    return 'Unknown error';
  }
  const firstItem = content[0];
  if (firstItem && typeof firstItem.text === 'string') {
    return firstItem.text;
  }
  return 'Unknown error';
}

// =============================================================================
// Safe JSON Parsing
// =============================================================================

/**
 * Safely parse JSON string, returning default value on failure
 */
export function safeJsonParse<T>(json: string | null | undefined, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json) as T;
  } catch {
    logger.error('Failed to parse JSON:', json.substring(0, 100));
    return defaultValue;
  }
}

/**
 * Safely stringify a value to JSON
 */
export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    logger.error('Failed to stringify value');
    return '{}';
  }
}
