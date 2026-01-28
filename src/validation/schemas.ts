/**
 * Zod Validation Schemas
 *
 * Centralized input validation for all tool parameters.
 * Reduces `any` types and ensures type safety at runtime.
 */

import { z } from 'zod';

// =============================================================================
// Common Schemas
// =============================================================================

export const NonEmptyStringSchema = z.string().min(1, 'String cannot be empty');

export const PositiveIntSchema = z.number().int().positive();

export const NonNegativeIntSchema = z.number().int().nonnegative();

export const PercentageSchema = z.number().min(0).max(100);

export const UUIDSchema = z.string().uuid();

export const FilePathSchema = z.string().min(1).regex(/^[a-zA-Z0-9/_.\-\\:]+$/, 'Invalid file path characters');

export const TagsSchema = z.array(z.string().min(1)).optional();

// =============================================================================
// Memory Tool Schemas
// =============================================================================

export const MemorySaveInputSchema = z.object({
  key: NonEmptyStringSchema.describe('A short, descriptive key for this memory'),
  value: NonEmptyStringSchema.describe('The actual information to remember'),
  metadata: z.object({
    tags: TagsSchema,
    category: z.string().optional(),
    expiresAt: z.number().int().positive().optional(),
  }).optional(),
});

export const MemoryRecallInputSchema = z.object({
  query: NonEmptyStringSchema.describe('What you want to remember'),
  limit: PositiveIntSchema.optional(),
  category: z.string().optional(),
});

export const MemoryListInputSchema = z.object({
  filter: z.object({
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    since: z.number().int().positive().optional(),
  }).optional(),
  limit: PositiveIntSchema.optional(),
});

export const MemoryForgetInputSchema = z.object({
  id: NonEmptyStringSchema.describe('The ID of the memory to forget'),
});

// =============================================================================
// Agent Tool Schemas
// =============================================================================

export const AgentTypeSchema = z.enum([
  'researcher', 'coder', 'tester', 'reviewer',
  'architect', 'frontend', 'backend', 'database',
  'devops', 'security', 'performance', 'documentation',
  'bugfix', 'refactor',
]);

export const AgentStatusSchema = z.enum([
  'pending', 'running', 'completed', 'failed', 'timeout',
]);

export const SpawnAgentInputSchema = z.object({
  type: AgentTypeSchema,
  task: NonEmptyStringSchema.describe('Clear description of what the agent should do'),
  timeout: PositiveIntSchema.optional(),
  specialistConfig: z.record(z.string(), z.unknown()).optional(),
  parentTaskId: z.string().nullable().optional(),
  memoryKeys: z.array(z.string()).optional(),
  saveToMemory: z.boolean().optional(),
  memoryTags: z.array(z.string()).optional(),
  createTodo: z.boolean().optional(),
  testPath: z.string().optional(),
});

export const AgentStatusInputSchema = z.object({
  agentId: NonEmptyStringSchema,
});

export const AgentResultInputSchema = z.object({
  agentId: NonEmptyStringSchema,
});

export const AgentTerminateInputSchema = z.object({
  agentId: NonEmptyStringSchema,
});

export const AgentListInputSchema = z.object({
  status: AgentStatusSchema.optional(),
  type: AgentTypeSchema.optional(),
  limit: PositiveIntSchema.optional(),
});

// =============================================================================
// Planning Tool Schemas
// =============================================================================

export const TodoStatusSchema = z.enum(['pending', 'in_progress', 'completed']);

export const TDDStatusSchema = z.enum(['red', 'green', 'refactored']);

export const PlanningCreateInputSchema = z.object({
  content: NonEmptyStringSchema.describe('The TODO content/description'),
  parentId: z.string().optional(),
  tags: TagsSchema,
  status: TodoStatusSchema.optional(),
  type: z.enum(['todo', 'tdd']).optional(),
  tddStatus: TDDStatusSchema.optional(),
  testPath: z.string().optional(),
});

export const PlanningUpdateInputSchema = z.object({
  id: NonEmptyStringSchema.describe('The TODO ID to update'),
  content: z.string().optional(),
  status: TodoStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  parentId: z.string().nullable().optional(),
  tddStatus: TDDStatusSchema.optional(),
  testPath: z.string().optional(),
});

export const PlanningTreeInputSchema = z.object({
  filter: z.object({
    status: TodoStatusSchema.optional(),
    rootOnly: z.boolean().optional(),
  }).optional(),
});

// =============================================================================
// TDD Tool Schemas
// =============================================================================

export const TDDRedInputSchema = z.object({
  testPath: FilePathSchema.describe('Path to the test file'),
  description: NonEmptyStringSchema.describe('Description of what this test validates'),
});

export const TDDGreenInputSchema = z.object({
  testPath: FilePathSchema.describe('Path to the test file to verify'),
  implementationPath: z.string().optional(),
});

export const TDDRefactorInputSchema = z.object({
  filePath: FilePathSchema.describe('Path to the file to refactor'),
});

export const TDDVerifyInputSchema = z.object({
  minCoverage: PercentageSchema.optional(),
});

// =============================================================================
// Science Tool Schemas
// =============================================================================

// Stats schemas
export const StatsTestTypeSchema = z.enum([
  'ttest', 'anova', 'chi_square', 'correlation', 'regression', 'mann_whitney',
]);

export const StatsAlternativeSchema = z.enum(['two-sided', 'less', 'greater']);

export const CorrelationMethodSchema = z.enum(['pearson', 'spearman']);

export const StatsDataSchema = z.object({
  group1: z.array(z.number()).optional(),
  group2: z.array(z.number()).optional(),
  groups: z.array(z.array(z.number())).optional(),
  observed: z.array(z.array(z.number())).optional(),
  x: z.array(z.number()).optional(),
  y: z.array(z.number()).optional(),
  mu: z.number().optional(),
  alternative: StatsAlternativeSchema.optional(),
  method: CorrelationMethodSchema.optional(),
});

export const StatsTestInputSchema = z.object({
  test: StatsTestTypeSchema.describe('Type of statistical test to perform'),
  data: StatsDataSchema.describe('Test data'),
  save_to_memory: z.boolean().optional(),
  memory_key: z.string().optional(),
});

// ML schemas
export const MLAlgorithmSchema = z.enum([
  'linear_regression', 'logistic_regression', 'random_forest', 'xgboost', 'svm', 'kmeans',
]);

export const MLTaskTypeSchema = z.enum(['regression', 'classification', 'clustering']);

export const MLActionSchema = z.enum(['train', 'predict', 'evaluate', 'tune', 'explain', 'save', 'load']);

export const MLDataSchema = z.object({
  X: z.array(z.array(z.number())).optional(),
  y: z.array(z.number()).optional(),
  algorithm: MLAlgorithmSchema.optional(),
  task_type: MLTaskTypeSchema.optional(),
  model_id: z.string().optional(),
  test_size: z.number().min(0).max(1).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  scale: z.boolean().optional(),
  param_grid: z.record(z.string(), z.array(z.unknown())).optional(),
  cv: PositiveIntSchema.optional(),
  filepath: z.string().optional(),
});

export const MLInputSchema = z.object({
  action: MLActionSchema.describe('ML operation to perform'),
  data: MLDataSchema.describe('Action-specific data'),
  save_to_memory: z.boolean().optional(),
  memory_key: z.string().optional(),
  save_to_planning: z.boolean().optional(),
  planning_context: z.string().optional(),
});

// Export schemas
export const ExportTypeSchema = z.enum(['data', 'report', 'notebook', 'model', 'all']);

export const ExportFormatSchema = z.enum(['csv', 'excel', 'json', 'parquet', 'html', 'pdf']);

export const ReportSectionTypeSchema = z.enum(['text', 'table', 'metrics', 'plot', 'code', 'alert']);

export const AlertTypeSchema = z.enum(['info', 'success', 'warning']);

export const ReportSectionSchema = z.object({
  type: ReportSectionTypeSchema,
  title: z.string().optional(),
  content: z.unknown(),
  alert_type: AlertTypeSchema.optional(),
});

export const NotebookCellSchema = z.object({
  type: z.enum(['markdown', 'code']),
  content: z.string(),
});

export const ExportDataSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())).optional(),
  filepath: NonEmptyStringSchema.describe('Output file path'),
  format: ExportFormatSchema.optional(),
  title: z.string().optional(),
  sections: z.array(ReportSectionSchema).optional(),
  cells: z.array(NotebookCellSchema).optional(),
});

export const ExportInputSchema = z.object({
  type: ExportTypeSchema.describe('Type of export to perform'),
  data: ExportDataSchema.describe('Export-specific data'),
  save_to_memory: z.boolean().optional(),
  memory_key: z.string().optional(),
});

// =============================================================================
// Guide Tool Schemas
// =============================================================================

export const GuideCategorySchema = z.enum([
  'getting-started', 'tutorial', 'reference', 'concept', 'troubleshooting',
]);

export const DifficultyLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);

export const GuideSearchInputSchema = z.object({
  query: NonEmptyStringSchema.describe('Search query'),
  category: GuideCategorySchema.optional(),
  difficulty: DifficultyLevelSchema.optional(),
  relatedTool: z.string().optional(),
  limit: PositiveIntSchema.optional(),
});

export const TutorialActionSchema = z.enum([
  'start', 'next', 'previous', 'hint', 'check', 'status', 'complete', 'reset',
]);

export const GuideTutorialInputSchema = z.object({
  action: TutorialActionSchema.describe('Tutorial action'),
  guideId: z.string().optional(),
  guideSlug: z.string().optional(),
}).refine(
  (data) => data.action === 'status' || data.guideId || data.guideSlug,
  { message: 'Either guideId or guideSlug is required for most actions' }
);

// =============================================================================
// Validation Helper
// =============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate input against a Zod schema
 * Returns a structured result with either valid data or error message
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): ValidationResult<T> {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format error message
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });

  return {
    success: false,
    error: `Validation failed: ${errors.join('; ')}`,
  };
}

/**
 * Wrap a handler function with validation
 * Automatically validates input and returns error response on failure
 */
export function withValidation<T, R>(
  schema: z.ZodSchema<T>,
  handler: (input: T) => R | Promise<R>
): (input: unknown) => R | Promise<R> {
  return (input: unknown) => {
    const validation = validateInput(schema, input);

    if (!validation.success) {
      throw new Error(validation.error);
    }

    return handler(validation.data!);
  };
}

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type MemorySaveInput = z.infer<typeof MemorySaveInputSchema>;
// Use z.output for schemas with defaults to get the output type (after defaults are applied)
export type MemoryRecallInput = z.output<typeof MemoryRecallInputSchema>;
export type MemoryListInput = z.output<typeof MemoryListInputSchema>;
export type MemoryForgetInput = z.infer<typeof MemoryForgetInputSchema>;

export type SpawnAgentInput = z.infer<typeof SpawnAgentInputSchema>;
export type AgentStatusInput = z.infer<typeof AgentStatusInputSchema>;
export type AgentResultInput = z.infer<typeof AgentResultInputSchema>;
export type AgentTerminateInput = z.infer<typeof AgentTerminateInputSchema>;
export type AgentListInput = z.infer<typeof AgentListInputSchema>;
export type AgentType = z.infer<typeof AgentTypeSchema>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export type PlanningCreateInput = z.infer<typeof PlanningCreateInputSchema>;
export type PlanningUpdateInput = z.infer<typeof PlanningUpdateInputSchema>;
export type PlanningTreeInput = z.infer<typeof PlanningTreeInputSchema>;

export type TDDRedInput = z.infer<typeof TDDRedInputSchema>;
export type TDDGreenInput = z.infer<typeof TDDGreenInputSchema>;
export type TDDRefactorInput = z.infer<typeof TDDRefactorInputSchema>;
export type TDDVerifyInput = z.infer<typeof TDDVerifyInputSchema>;

export type StatsTestInput = z.infer<typeof StatsTestInputSchema>;
export type MLInput = z.infer<typeof MLInputSchema>;
export type ExportInput = z.infer<typeof ExportInputSchema>;

export type GuideSearchInput = z.infer<typeof GuideSearchInputSchema>;
export type GuideTutorialInput = z.infer<typeof GuideTutorialInputSchema>;
