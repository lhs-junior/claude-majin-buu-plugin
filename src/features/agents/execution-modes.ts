/**
 * Execution Modes for Agent Orchestration
 * Inspired by oh-my-claudecode patterns
 */

import { EventEmitter } from 'events';

// ============================================================================
// Base Types and Interfaces
// ============================================================================

export interface Task {
  id: string;
  description: string;
  priority?: number;
  timeout?: number; // milliseconds
  dependencies?: string[]; // IDs of tasks that must complete first
  metadata?: Record<string, unknown>;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output?: unknown;
  error?: Error;
  duration: number;
  timestamp: number;
}

export interface WorkerState {
  id: string;
  status: 'idle' | 'busy' | 'error' | 'stopped';
  currentTask?: Task;
  completedTasks: number;
  errors: number;
}

export interface ExecutionProgress {
  mode: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  activeWorkers?: number;
  currentStage?: string;
  stages?: string[];
  stageProgress?: Map<string, number>;
}

export interface ExecutionOptions {
  onProgress?: (progress: ExecutionProgress) => void;
  onTaskComplete?: (result: TaskResult) => void;
  onError?: (error: Error, task?: Task) => void;
  signal?: AbortSignal;
}

export type TaskExecutor = (task: Task) => Promise<unknown>;

// ============================================================================
// Base Execution Mode
// ============================================================================

export abstract class ExecutionMode extends EventEmitter {
  protected tasks: Task[] = [];
  protected results: TaskResult[] = [];
  protected options: ExecutionOptions;
  protected cancelled = false;

  constructor(options: ExecutionOptions = {}) {
    super();
    this.options = options;

    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        this.cancel();
      });
    }
  }

  abstract execute(tasks: Task[], executor: TaskExecutor): Promise<TaskResult[]>;

  cancel(): void {
    this.cancelled = true;
    this.emit('cancelled');
  }

  protected reportProgress(progress: Partial<ExecutionProgress>): void {
    const fullProgress: ExecutionProgress = {
      mode: this.constructor.name,
      totalTasks: this.tasks.length,
      completedTasks: this.results.filter(r => r.success).length,
      failedTasks: this.results.filter(r => !r.success).length,
      ...progress,
    };

    this.options.onProgress?.(fullProgress);
    this.emit('progress', fullProgress);
  }

  protected async executeTask(task: Task, executor: TaskExecutor): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      const timeoutMs = task.timeout || 300000; // 5 min default
      const output = await this.withTimeout(executor(task), timeoutMs);

      const result: TaskResult = {
        taskId: task.id,
        success: true,
        output,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };

      this.options.onTaskComplete?.(result);
      this.emit('taskComplete', result);

      return result;
    } catch (error) {
      const result: TaskResult = {
        taskId: task.id,
        success: false,
        error: error as Error,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };

      this.options.onError?.(error as Error, task);
      this.emit('taskError', error, task);

      return result;
    }
  }

  protected async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Task timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  protected getExecutableTask(tasks: Task[], completed: Set<string>): Task | null {
    return tasks.find(task => {
      if (completed.has(task.id)) return false;
      if (!task.dependencies?.length) return true;
      return task.dependencies.every(dep => completed.has(dep));
    }) || null;
  }
}

// ============================================================================
// 1. UltrapilotMode: Parallel Execution with Multiple Workers
// ============================================================================

export interface UltrapilotOptions extends ExecutionOptions {
  maxWorkers?: number;
  enableBackgroundExecution?: boolean;
}

export class UltrapilotMode extends ExecutionMode {
  private workers: WorkerState[] = [];
  private maxWorkers: number;
  private enableBackgroundExecution: boolean;

  constructor(options: UltrapilotOptions = {}) {
    super(options);
    this.maxWorkers = Math.min(options.maxWorkers || 5, 5);
    this.enableBackgroundExecution = options.enableBackgroundExecution ?? true;

    // Initialize workers
    for (let i = 0; i < this.maxWorkers; i++) {
      this.workers.push({
        id: `worker-${i}`,
        status: 'idle',
        completedTasks: 0,
        errors: 0,
      });
    }
  }

  async execute(tasks: Task[], executor: TaskExecutor): Promise<TaskResult[]> {
    this.tasks = [...tasks];
    this.results = [];
    this.cancelled = false;

    const completed = new Set<string>();
    const inProgress = new Map<string, Task>();
    const taskQueue = [...tasks].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    this.reportProgress({ activeWorkers: 0 });

    const workerPromises = this.workers.map(worker =>
      this.runWorker(worker, taskQueue, completed, inProgress, executor)
    );

    await Promise.all(workerPromises);

    return this.results;
  }

  private async runWorker(
    worker: WorkerState,
    taskQueue: Task[],
    completed: Set<string>,
    inProgress: Map<string, Task>,
    executor: TaskExecutor
  ): Promise<void> {
    while (!this.cancelled) {
      // Find next executable task
      const task = this.getNextTask(taskQueue, completed, inProgress);

      if (!task) {
        // No more tasks available for this worker
        worker.status = 'idle';

        // Check if all tasks are done
        if (completed.size + inProgress.size >= this.tasks.length) {
          break;
        }

        // Wait a bit for dependencies to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      worker.status = 'busy';
      worker.currentTask = task;
      inProgress.set(task.id, task);

      this.reportProgress({
        activeWorkers: this.workers.filter(w => w.status === 'busy').length,
      });

      const result = await this.executeTask(task, executor);
      this.results.push(result);

      inProgress.delete(task.id);
      completed.add(task.id);

      if (result.success) {
        worker.completedTasks++;
      } else {
        worker.errors++;
        worker.status = 'error';
      }

      worker.currentTask = undefined;

      this.reportProgress({
        activeWorkers: this.workers.filter(w => w.status === 'busy').length,
      });
    }

    worker.status = 'stopped';
  }

  private getNextTask(
    taskQueue: Task[],
    completed: Set<string>,
    inProgress: Map<string, Task>
  ): Task | null {
    for (const task of taskQueue) {
      if (completed.has(task.id) || inProgress.has(task.id)) {
        continue;
      }

      // Check dependencies
      if (task.dependencies?.length) {
        const dependenciesMet = task.dependencies.every(dep => completed.has(dep));
        if (!dependenciesMet) {
          continue;
        }
      }

      return task;
    }

    return null;
  }

  getWorkerStates(): WorkerState[] {
    return [...this.workers];
  }
}

// ============================================================================
// 2. SwarmMode: Task Pool-Based Execution
// ============================================================================

export interface SwarmOptions extends ExecutionOptions {
  maxConcurrency?: number;
  taskTimeout?: number; // Default timeout for all tasks
  retryFailedTasks?: boolean;
  maxRetries?: number;
}

export interface TaskClaim {
  taskId: string;
  agentId: string;
  claimedAt: number;
  timeout: number;
}

export class SwarmMode extends ExecutionMode {
  private taskPool: Task[] = [];
  private claims: Map<string, TaskClaim> = new Map();
  private maxConcurrency: number;
  private defaultTimeout: number;
  private retryFailedTasks: boolean;
  private maxRetries: number;
  private retryCount: Map<string, number> = new Map();

  constructor(options: SwarmOptions = {}) {
    super(options);
    this.maxConcurrency = options.maxConcurrency || 3;
    this.defaultTimeout = options.taskTimeout || 300000; // 5 min
    this.retryFailedTasks = options.retryFailedTasks ?? false;
    this.maxRetries = options.maxRetries || 2;
  }

  async execute(tasks: Task[], executor: TaskExecutor): Promise<TaskResult[]> {
    this.tasks = [...tasks];
    this.results = [];
    this.cancelled = false;
    this.taskPool = [...tasks];
    this.claims.clear();
    this.retryCount.clear();

    this.reportProgress({});

    // Create concurrent agents
    const agents = Array.from({ length: this.maxConcurrency }, (_, i) => ({
      id: `agent-${i}`,
    }));

    const agentPromises = agents.map(agent => this.runAgent(agent.id, executor));

    // Monitor for timed-out tasks
    const monitorPromise = this.monitorTimeouts();

    await Promise.all([...agentPromises, monitorPromise]);

    return this.results;
  }

  private async runAgent(agentId: string, executor: TaskExecutor): Promise<void> {
    while (!this.cancelled) {
      const task = this.claimTask(agentId);

      if (!task) {
        // No more tasks available
        if (this.isAllTasksComplete()) {
          break;
        }

        // Wait for tasks to become available
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      const result = await this.executeTask(task, executor);
      this.results.push(result);
      this.releaseTask(task.id, result.success);

      this.reportProgress({});

      // Handle retry logic
      if (!result.success && this.retryFailedTasks) {
        const retries = this.retryCount.get(task.id) || 0;
        if (retries < this.maxRetries) {
          this.retryCount.set(task.id, retries + 1);
          this.taskPool.push(task); // Re-add to pool
        }
      }
    }
  }

  private claimTask(agentId: string): Task | null {
    // Find first unclaimed task with met dependencies
    const completed = new Set(
      this.results.filter(r => r.success).map(r => r.taskId)
    );

    for (let i = 0; i < this.taskPool.length; i++) {
      const task = this.taskPool[i];

      if (this.claims.has(task.id)) {
        continue;
      }

      // Check dependencies
      if (task.dependencies?.length) {
        const dependenciesMet = task.dependencies.every(dep => completed.has(dep));
        if (!dependenciesMet) {
          continue;
        }
      }

      // Claim the task
      this.claims.set(task.id, {
        taskId: task.id,
        agentId,
        claimedAt: Date.now(),
        timeout: task.timeout || this.defaultTimeout,
      });

      this.taskPool.splice(i, 1);
      return task;
    }

    return null;
  }

  private releaseTask(taskId: string, success: boolean): void {
    this.claims.delete(taskId);
  }

  private async monitorTimeouts(): Promise<void> {
    while (!this.cancelled && !this.isAllTasksComplete()) {
      const now = Date.now();

      for (const [taskId, claim] of this.claims.entries()) {
        const elapsed = now - claim.claimedAt;

        if (elapsed > claim.timeout) {
          // Task timed out, release it
          this.claims.delete(taskId);

          // Find the task and re-add to pool
          const task = this.tasks.find(t => t.id === taskId);
          if (task) {
            this.taskPool.push(task);
          }

          this.emit('taskTimeout', taskId, claim.agentId);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private isAllTasksComplete(): boolean {
    return (
      this.taskPool.length === 0 &&
      this.claims.size === 0 &&
      this.results.length >= this.tasks.length
    );
  }

  getActiveClaims(): TaskClaim[] {
    return Array.from(this.claims.values());
  }
}

// ============================================================================
// 3. PipelineMode: Sequential Stage Execution
// ============================================================================

export interface PipelineStage {
  name: string;
  description?: string;
  tasks: Task[];
  continueOnError?: boolean;
}

export interface PipelinePreset {
  name: string;
  stages: Omit<PipelineStage, 'tasks'>[];
}

export const PIPELINE_PRESETS: Record<string, PipelinePreset> = {
  development: {
    name: 'Development Pipeline',
    stages: [
      { name: 'review', description: 'Code review and analysis' },
      { name: 'implement', description: 'Implementation' },
      { name: 'debug', description: 'Debugging and error fixing' },
      { name: 'refactor', description: 'Code refactoring' },
    ],
  },
  deployment: {
    name: 'Deployment Pipeline',
    stages: [
      { name: 'test', description: 'Run tests' },
      { name: 'build', description: 'Build artifacts' },
      { name: 'deploy', description: 'Deploy to environment' },
      { name: 'verify', description: 'Verify deployment' },
    ],
  },
  cicd: {
    name: 'CI/CD Pipeline',
    stages: [
      { name: 'lint', description: 'Linting and code quality' },
      { name: 'test', description: 'Run test suite' },
      { name: 'build', description: 'Build application' },
      { name: 'deploy', description: 'Deploy to staging' },
      { name: 'smoke-test', description: 'Run smoke tests' },
      { name: 'promote', description: 'Promote to production' },
    ],
  },
};

export interface PipelineOptions extends ExecutionOptions {
  preset?: keyof typeof PIPELINE_PRESETS;
  stages?: PipelineStage[];
  stopOnStageFailure?: boolean;
  passDataBetweenStages?: boolean;
}

export interface StageResult {
  stage: string;
  results: TaskResult[];
  success: boolean;
  output?: unknown;
  duration: number;
}

export class PipelineMode extends ExecutionMode {
  private stages: PipelineStage[];
  private stageResults: Map<string, StageResult> = new Map();
  private stopOnStageFailure: boolean;
  private passDataBetweenStages: boolean;
  private pipelineData: unknown = null;

  constructor(options: PipelineOptions = {}) {
    super(options);

    if (options.preset && PIPELINE_PRESETS[options.preset]) {
      const preset = PIPELINE_PRESETS[options.preset];
      this.stages = preset.stages.map(s => ({
        ...s,
        tasks: [],
      }));
    } else if (options.stages) {
      this.stages = options.stages;
    } else {
      throw new Error('Either preset or stages must be provided');
    }

    this.stopOnStageFailure = options.stopOnStageFailure ?? true;
    this.passDataBetweenStages = options.passDataBetweenStages ?? true;
  }

  async execute(tasks: Task[], executor: TaskExecutor): Promise<TaskResult[]> {
    this.tasks = [...tasks];
    this.results = [];
    this.cancelled = false;
    this.stageResults.clear();
    this.pipelineData = null;

    // Distribute tasks to stages if not already assigned
    if (this.stages.every(s => s.tasks.length === 0)) {
      this.distributeTasks(tasks);
    }

    const stageNames = this.stages.map(s => s.name);
    this.reportProgress({
      stages: stageNames,
      currentStage: undefined,
      stageProgress: new Map(),
    });

    for (let i = 0; i < this.stages.length && !this.cancelled; i++) {
      const stage = this.stages[i];

      this.reportProgress({
        stages: stageNames,
        currentStage: stage.name,
        stageProgress: this.getStageProgress(),
      });

      const stageResult = await this.executeStage(stage, executor);
      this.stageResults.set(stage.name, stageResult);

      // Update pipeline data for next stage
      if (this.passDataBetweenStages && stageResult.output !== undefined) {
        this.pipelineData = stageResult.output;
      }

      this.reportProgress({
        stages: stageNames,
        currentStage: stage.name,
        stageProgress: this.getStageProgress(),
      });

      // Check if we should stop
      if (!stageResult.success && this.stopOnStageFailure && !stage.continueOnError) {
        this.emit('stageFailed', stage.name, stageResult);
        break;
      }
    }

    return this.results;
  }

  private async executeStage(stage: PipelineStage, executor: TaskExecutor): Promise<StageResult> {
    const startTime = Date.now();
    const stageResults: TaskResult[] = [];

    this.emit('stageStart', stage.name);

    // Execute tasks in this stage sequentially
    for (const task of stage.tasks) {
      if (this.cancelled) break;

      // Inject pipeline data if available
      if (this.passDataBetweenStages && this.pipelineData) {
        task.metadata = {
          ...task.metadata,
          pipelineData: this.pipelineData,
        };
      }

      const result = await this.executeTask(task, executor);
      stageResults.push(result);
      this.results.push(result);

      // Stop stage on task failure if continueOnError is false
      if (!result.success && !stage.continueOnError) {
        break;
      }
    }

    const success = stageResults.every(r => r.success);
    const stageResult: StageResult = {
      stage: stage.name,
      results: stageResults,
      success,
      output: success ? this.extractStageOutput(stageResults) : undefined,
      duration: Date.now() - startTime,
    };

    this.emit('stageComplete', stage.name, stageResult);

    return stageResult;
  }

  private distributeTasks(tasks: Task[]): void {
    // Simple distribution: divide tasks evenly across stages
    const tasksPerStage = Math.ceil(tasks.length / this.stages.length);

    for (let i = 0; i < this.stages.length; i++) {
      const start = i * tasksPerStage;
      const end = Math.min(start + tasksPerStage, tasks.length);
      this.stages[i].tasks = tasks.slice(start, end);
    }
  }

  private extractStageOutput(results: TaskResult[]): unknown {
    // Combine all successful outputs
    const outputs = results
      .filter(r => r.success && r.output !== undefined)
      .map(r => r.output);

    return outputs.length === 1 ? outputs[0] : outputs;
  }

  private getStageProgress(): Map<string, number> {
    const progress = new Map<string, number>();

    for (const stage of this.stages) {
      const stageResult = this.stageResults.get(stage.name);
      if (stageResult) {
        const completionRate = stageResult.results.length / stage.tasks.length;
        progress.set(stage.name, completionRate * 100);
      } else {
        progress.set(stage.name, 0);
      }
    }

    return progress;
  }

  addStage(stage: PipelineStage, position?: number): void {
    if (position !== undefined) {
      this.stages.splice(position, 0, stage);
    } else {
      this.stages.push(stage);
    }
  }

  getStageResults(): Map<string, StageResult> {
    return new Map(this.stageResults);
  }

  getStages(): PipelineStage[] {
    return [...this.stages];
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export type ExecutionModeType = 'ultrapilot' | 'swarm' | 'pipeline';

export interface CreateModeOptions {
  type: ExecutionModeType;
  ultrapilot?: UltrapilotOptions;
  swarm?: SwarmOptions;
  pipeline?: PipelineOptions;
}

export function createExecutionMode(options: CreateModeOptions): ExecutionMode {
  switch (options.type) {
    case 'ultrapilot':
      return new UltrapilotMode(options.ultrapilot);

    case 'swarm':
      return new SwarmMode(options.swarm);

    case 'pipeline':
      return new PipelineMode(options.pipeline);

    default:
      throw new Error(`Unknown execution mode: ${options.type}`);
  }
}

// ============================================================================
// Integration with AgentOrchestrator
// ============================================================================

export interface OrchestratorIntegration {
  mode: ExecutionMode;
  convertToTasks: (input: unknown) => Task[];
  convertFromResults: (results: TaskResult[]) => unknown;
}

export function createOrchestratorIntegration(
  mode: ExecutionMode,
  converters?: {
    toTasks?: (input: unknown) => Task[];
    fromResults?: (results: TaskResult[]) => unknown;
  }
): OrchestratorIntegration {
  return {
    mode,
    convertToTasks: converters?.toTasks || defaultConvertToTasks,
    convertFromResults: converters?.fromResults || defaultConvertFromResults,
  };
}

function defaultConvertToTasks(input: unknown): Task[] {
  if (Array.isArray(input)) {
    return input.map((item, index) => ({
      id: `task-${index}`,
      description: typeof item === 'string' ? item : JSON.stringify(item),
      metadata: { original: item },
    }));
  }

  return [{
    id: 'task-0',
    description: typeof input === 'string' ? input : JSON.stringify(input),
    metadata: { original: input },
  }];
}

function defaultConvertFromResults(results: TaskResult[]): unknown {
  return results.map(r => ({
    taskId: r.taskId,
    success: r.success,
    output: r.output,
    error: r.error?.message,
    duration: r.duration,
  }));
}

// ============================================================================
// MCP Tool Definitions
// ============================================================================

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const EXECUTION_MODE_TOOLS: MCPToolDefinition[] = [
  {
    name: 'execute_ultrapilot',
    description: 'Execute tasks in parallel using UltrapilotMode with multiple workers (max 5)',
    inputSchema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          description: 'Array of tasks to execute',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'number' },
              timeout: { type: 'number' },
              dependencies: { type: 'array', items: { type: 'string' } },
            },
            required: ['id', 'description'],
          },
        },
        maxWorkers: {
          type: 'number',
          description: 'Maximum number of parallel workers (1-5)',
          default: 5,
        },
        enableBackgroundExecution: {
          type: 'boolean',
          description: 'Enable background task execution',
          default: true,
        },
      },
      required: ['tasks'],
    },
  },
  {
    name: 'execute_swarm',
    description: 'Execute tasks using SwarmMode with task pool and agent claiming',
    inputSchema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          description: 'Array of tasks to execute',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'number' },
              timeout: { type: 'number' },
              dependencies: { type: 'array', items: { type: 'string' } },
            },
            required: ['id', 'description'],
          },
        },
        maxConcurrency: {
          type: 'number',
          description: 'Maximum concurrent agents',
          default: 3,
        },
        taskTimeout: {
          type: 'number',
          description: 'Default timeout per task in milliseconds',
          default: 300000,
        },
        retryFailedTasks: {
          type: 'boolean',
          description: 'Retry failed tasks',
          default: false,
        },
        maxRetries: {
          type: 'number',
          description: 'Maximum retry attempts',
          default: 2,
        },
      },
      required: ['tasks'],
    },
  },
  {
    name: 'execute_pipeline',
    description: 'Execute tasks using PipelineMode with sequential stages',
    inputSchema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          description: 'Array of tasks to execute',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'number' },
              timeout: { type: 'number' },
              dependencies: { type: 'array', items: { type: 'string' } },
            },
            required: ['id', 'description'],
          },
        },
        preset: {
          type: 'string',
          description: 'Pipeline preset name',
          enum: ['development', 'deployment', 'cicd'],
        },
        stages: {
          type: 'array',
          description: 'Custom pipeline stages (alternative to preset)',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              tasks: { type: 'array' },
              continueOnError: { type: 'boolean' },
            },
            required: ['name'],
          },
        },
        stopOnStageFailure: {
          type: 'boolean',
          description: 'Stop pipeline if a stage fails',
          default: true,
        },
        passDataBetweenStages: {
          type: 'boolean',
          description: 'Pass output data between stages',
          default: true,
        },
      },
      required: ['tasks'],
    },
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

export function createTasksFromDescriptions(descriptions: string[]): Task[] {
  return descriptions.map((desc, index) => ({
    id: `task-${index + 1}`,
    description: desc,
    priority: descriptions.length - index, // Earlier tasks have higher priority
  }));
}

export function createDependentTasks(
  tasks: Array<{ description: string; dependsOn?: number[] }>
): Task[] {
  return tasks.map((task, index) => ({
    id: `task-${index + 1}`,
    description: task.description,
    dependencies: task.dependsOn?.map(depIndex => `task-${depIndex + 1}`),
  }));
}

export function visualizeProgress(progress: ExecutionProgress): string {
  const lines: string[] = [];

  lines.push(`Mode: ${progress.mode}`);
  lines.push(`Progress: ${progress.completedTasks}/${progress.totalTasks} tasks`);
  lines.push(`Failed: ${progress.failedTasks}`);

  if (progress.activeWorkers !== undefined) {
    lines.push(`Active Workers: ${progress.activeWorkers}`);
  }

  if (progress.currentStage) {
    lines.push(`Current Stage: ${progress.currentStage}`);
  }

  if (progress.stages && progress.stageProgress) {
    lines.push('\nStage Progress:');
    for (const stage of progress.stages) {
      const stageProgress = progress.stageProgress.get(stage) || 0;
      const bar = '█'.repeat(Math.floor(stageProgress / 5)) +
                  '░'.repeat(20 - Math.floor(stageProgress / 5));
      lines.push(`  ${stage}: [${bar}] ${stageProgress.toFixed(1)}%`);
    }
  }

  return lines.join('\n');
}
