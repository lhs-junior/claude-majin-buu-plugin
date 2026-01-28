/**
 * Lifecycle Hooks Fusion System
 *
 * Provides a hook-based event system that allows all features to automatically
 * respond to lifecycle events, enabling Level 3+ fusion patterns.
 */

import logger from '../../utils/logger.js';
import type { MemoryManager } from '../../features/memory/memory-manager.js';
import type { PlanningManager } from '../../features/planning/planning-manager.js';
import type { TDDManager } from '../../features/tdd/tdd-manager.js';
import type { AgentOrchestrator } from '../../features/agents/agent-orchestrator.js';
import type { ProgressManager } from '../../features/planning/progress-manager.js';

/**
 * All supported hook types in the system
 */
export enum LifecycleHookType {
  // Session lifecycle
  SessionStart = 'SessionStart',
  SessionEnd = 'SessionEnd',

  // User interaction
  UserPromptSubmit = 'UserPromptSubmit',

  // Tool execution
  PreToolUse = 'PreToolUse',
  PostToolUse = 'PostToolUse',

  // Error handling
  ErrorOccurred = 'ErrorOccurred',

  // Context management
  ContextFull = 'ContextFull',

  // Test lifecycle
  TestCompleted = 'TestCompleted',

  // Agent lifecycle
  AgentStarted = 'AgentStarted',
  AgentCompleted = 'AgentCompleted',

  // Planning lifecycle
  PlanningStarted = 'PlanningStarted',
  PlanningCompleted = 'PlanningCompleted',

  // Memory lifecycle
  MemorySaved = 'MemorySaved',
  MemoryRecalled = 'MemoryRecalled',

  // TDD lifecycle
  TDDCycleStarted = 'TDDCycleStarted',
  TDDCycleCompleted = 'TDDCycleCompleted',

  // Science lifecycle
  ScienceJobStarted = 'ScienceJobStarted',
  ScienceJobCompleted = 'ScienceJobCompleted',

  // Guide lifecycle
  GuideQueried = 'GuideQueried',
}

/**
 * Context passed to hook handlers
 */
export interface HookContext {
  // Hook metadata
  hookType: LifecycleHookType;
  timestamp: number;

  // Event-specific data
  data?: Record<string, unknown>;

  // Tool-specific context (for tool hooks)
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;

  // Error context (for error hooks)
  error?: Error;

  // Session context
  sessionId?: string;

  // Allows handlers to pass data to subsequent handlers
  sharedState?: Record<string, unknown>;
}

/**
 * Hook handler function type
 */
export type HookHandler = (context: HookContext) => Promise<void> | void;

/**
 * Hook registration record
 */
interface HookRegistration {
  id: string;
  hookType: LifecycleHookType;
  handler: HookHandler;
  priority: number; // Higher priority runs first
  description?: string;
}

/**
 * HooksManager manages lifecycle hooks and their execution
 */
export class HooksManager {
  private hooks: Map<LifecycleHookType, HookRegistration[]> = new Map();
  private hookIdCounter = 0;

  // Feature manager references (injected)
  private memoryManager?: MemoryManager;
  private planningManager?: PlanningManager;
  private tddManager?: TDDManager;
  private agentOrchestrator?: AgentOrchestrator;
  private progressManager?: ProgressManager;

  constructor() {
    // Initialize hook arrays for each type
    Object.values(LifecycleHookType).forEach((hookType) => {
      this.hooks.set(hookType as LifecycleHookType, []);
    });
  }

  /**
   * Inject feature managers for built-in hooks
   */
  injectManagers(managers: {
    memoryManager?: MemoryManager;
    planningManager?: PlanningManager;
    tddManager?: TDDManager;
    agentOrchestrator?: AgentOrchestrator;
    progressManager?: ProgressManager;
  }): void {
    this.memoryManager = managers.memoryManager;
    this.planningManager = managers.planningManager;
    this.tddManager = managers.tddManager;
    this.agentOrchestrator = managers.agentOrchestrator;
    this.progressManager = managers.progressManager;

    // Register built-in hooks after managers are injected
    this.registerBuiltInHooks();
  }

  /**
   * Register a hook handler
   */
  registerHook(
    hookType: LifecycleHookType,
    handler: HookHandler,
    options?: {
      priority?: number;
      description?: string;
    }
  ): string {
    const id = `hook-${++this.hookIdCounter}`;
    const registration: HookRegistration = {
      id,
      hookType,
      handler,
      priority: options?.priority ?? 0,
      description: options?.description,
    };

    const hooks = this.hooks.get(hookType) || [];
    hooks.push(registration);

    // Sort by priority (descending)
    hooks.sort((a, b) => b.priority - a.priority);

    this.hooks.set(hookType, hooks);

    logger.debug(
      `Registered hook ${id} for ${hookType} with priority ${registration.priority}`
    );

    return id;
  }

  /**
   * Unregister a hook by ID
   */
  unregisterHook(hookId: string): boolean {
    for (const [hookType, registrations] of this.hooks.entries()) {
      const index = registrations.findIndex((r) => r.id === hookId);
      if (index !== -1) {
        registrations.splice(index, 1);
        this.hooks.set(hookType, registrations);
        logger.debug(`Unregistered hook ${hookId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Execute all registered hooks for a given type
   */
  async executeHooks(
    hookType: LifecycleHookType,
    context: Partial<HookContext> = {}
  ): Promise<void> {
    const registrations = this.hooks.get(hookType) || [];

    if (registrations.length === 0) {
      return;
    }

    const fullContext: HookContext = {
      hookType,
      timestamp: Date.now(),
      sharedState: {},
      ...context,
    };

    logger.debug(`Executing ${registrations.length} hooks for ${hookType}`);

    for (const registration of registrations) {
      try {
        await registration.handler(fullContext);
      } catch (error) {
        logger.error(
          `Error executing hook ${registration.id} for ${hookType}:`,
          error
        );
        // Continue executing other hooks even if one fails
      }
    }
  }

  /**
   * Get all registered hooks for a type
   */
  getHooks(hookType: LifecycleHookType): HookRegistration[] {
    return [...(this.hooks.get(hookType) || [])];
  }

  /**
   * Get statistics about registered hooks
   */
  getStatistics(): {
    totalHooks: number;
    hooksByType: Record<string, number>;
  } {
    const hooksByType: Record<string, number> = {};
    let totalHooks = 0;

    for (const [hookType, registrations] of this.hooks.entries()) {
      hooksByType[hookType] = registrations.length;
      totalHooks += registrations.length;
    }

    return { totalHooks, hooksByType };
  }

  /**
   * Clear all hooks (primarily for testing)
   */
  clearAllHooks(): void {
    for (const hookType of this.hooks.keys()) {
      this.hooks.set(hookType, []);
    }
    logger.debug('Cleared all hooks');
  }

  /**
   * Register built-in hooks that enable feature fusion
   */
  private registerBuiltInHooks(): void {
    // PostToolUse → Memory: Auto-save important tool results
    this.registerHook(
      LifecycleHookType.PostToolUse,
      async (context) => {
        if (!this.memoryManager) return;

        // Auto-save important tool results to memory
        if (context.toolResult && context.toolName) {
          const importantTools = [
            'memory_save',
            'planning_create',
            'tdd_red',
            'tdd_green',
            'agent_start',
          ];

          if (importantTools.includes(context.toolName)) {
            try {
              const resultStr =
                typeof context.toolResult === 'string'
                  ? context.toolResult
                  : JSON.stringify(context.toolResult);

              await this.memoryManager.save({
                key: `tool_result:${context.toolName}:${Date.now()}`,
                value: resultStr,
                metadata: {
                  category: 'tool_execution',
                  tags: [context.toolName, 'auto_saved'],
                  expiresAt: Date.now() + 24 * 60 * 60 * 1000, // Expire in 24 hours
                },
              });

              logger.debug(
                `Auto-saved result of ${context.toolName} to memory`
              );
            } catch (error) {
              logger.error('Failed to auto-save tool result:', error);
            }
          }
        }
      },
      { priority: 10, description: 'Auto-save important tool results' }
    );

    // AgentCompleted → Planning: Update TODO items
    this.registerHook(
      LifecycleHookType.AgentCompleted,
      async (context) => {
        if (!this.planningManager) return;

        try {
          const agentResult = context.data?.result as
            | { success: boolean; todoIds?: string[] }
            | undefined;

          if (agentResult?.success && agentResult.todoIds) {
            // Mark associated TODOs as completed
            for (const todoId of agentResult.todoIds) {
              await this.planningManager.update({
                id: todoId,
                status: 'completed',
              });
              logger.debug(`Marked TODO ${todoId} as completed after agent`);
            }
          }
        } catch (error) {
          logger.error('Failed to update TODOs after agent completion:', error);
        }
      },
      { priority: 10, description: 'Update TODOs after agent completion' }
    );

    // TestCompleted → TDD: Update test history
    this.registerHook(
      LifecycleHookType.TestCompleted,
      async (context) => {
        if (!this.tddManager) return;

        try {
          const testData = context.data as
            | {
                testPath?: string;
                passed?: boolean;
                phase?: string;
              }
            | undefined;

          if (testData?.testPath) {
            logger.debug(
              `Test completed: ${testData.testPath} (${testData.phase || 'unknown'} phase) - ${testData.passed ? 'PASSED' : 'FAILED'}`
            );
          }
        } catch (error) {
          logger.error('Failed to update test history:', error);
        }
      },
      { priority: 10, description: 'Update TDD test history' }
    );

    // ContextFull → Memory: Compress and save context
    this.registerHook(
      LifecycleHookType.ContextFull,
      async (context) => {
        if (!this.memoryManager) return;

        try {
          // Extract important information from context and save
          const contextSnapshot = {
            timestamp: context.timestamp,
            data: context.data,
            sessionId: context.sessionId,
          };

          await this.memoryManager.save({
            key: `context_snapshot:${context.sessionId}:${Date.now()}`,
            value: JSON.stringify(contextSnapshot),
            metadata: {
              category: 'context',
              tags: ['context_full', 'auto_compressed'],
              expiresAt: Date.now() + 168 * 60 * 60 * 1000, // Expire in 1 week
            },
          });

          logger.debug('Saved context snapshot due to context full');
        } catch (error) {
          logger.error('Failed to save context snapshot:', error);
        }
      },
      { priority: 10, description: 'Save context when full' }
    );

    // SessionStart → All features: Restore state
    this.registerHook(
      LifecycleHookType.SessionStart,
      async (context) => {
        logger.info(`Session started: ${context.sessionId}`);

        // Start progress session tracking
        if (this.progressManager) {
          try {
            this.progressManager.startSession();
            logger.debug('Started progress session tracking');
          } catch (error) {
            logger.error('Failed to start progress session:', error);
          }
        }

        // Restore state from previous session
        if (this.memoryManager && context.sessionId) {
          try {
            const previousContext = await this.memoryManager.recall({
              query: `context_snapshot:${context.sessionId}`,
              category: 'context',
              limit: 1,
            });

            if (previousContext.results.length > 0) {
              logger.debug('Restored previous session context');
              context.sharedState = context.sharedState || {};
              context.sharedState.previousContext =
                previousContext.results[0];
            }
          } catch (error) {
            logger.error('Failed to restore session context:', error);
          }
        }
      },
      { priority: 100, description: 'Restore session state' }
    );

    // SessionEnd → Progress: End session tracking
    this.registerHook(
      LifecycleHookType.SessionEnd,
      async (context) => {
        if (!this.progressManager) return;

        try {
          const summary = context.data?.summary as string | undefined;
          this.progressManager.endSession(summary);
          logger.debug('Ended progress session tracking');
        } catch (error) {
          logger.error('Failed to end progress session:', error);
        }
      },
      { priority: 10, description: 'End progress session' }
    );

    // AgentCompleted → Progress: Log agent result
    this.registerHook(
      LifecycleHookType.AgentCompleted,
      async (context) => {
        if (!this.progressManager) return;

        try {
          const agentResult = context.data?.result as
            | { success: boolean; message?: string; duration?: number }
            | undefined;

          const activity = context.data?.agentName
            ? `Agent ${context.data.agentName} completed`
            : 'Agent completed';

          const result = agentResult?.success
            ? agentResult.message || 'Agent completed successfully'
            : 'Agent failed';

          this.progressManager.logProgress({
            activity,
            result,
            duration: agentResult?.duration,
          });

          logger.debug('Logged agent completion to progress');
        } catch (error) {
          logger.error('Failed to log agent completion:', error);
        }
      },
      { priority: 5, description: 'Log agent completion to progress' }
    );

    // TDDCycleCompleted → Progress: Log test result
    this.registerHook(
      LifecycleHookType.TDDCycleCompleted,
      async (context) => {
        if (!this.progressManager) return;

        try {
          const tddData = context.data as
            | {
                phase?: string;
                testPath?: string;
                passed?: boolean;
                duration?: number;
              }
            | undefined;

          const phase = tddData?.phase || 'unknown';
          const testPath = tddData?.testPath || 'test';
          const passed = tddData?.passed ?? false;

          const activity = `TDD ${phase} phase: ${testPath}`;
          const result = passed ? 'Tests passed' : 'Tests failed';

          this.progressManager.logProgress({
            activity,
            result,
            duration: tddData?.duration,
          });

          logger.debug('Logged TDD cycle to progress');
        } catch (error) {
          logger.error('Failed to log TDD cycle:', error);
        }
      },
      { priority: 5, description: 'Log TDD cycle to progress' }
    );

    // PlanningCompleted → Progress: Log planning result
    this.registerHook(
      LifecycleHookType.PlanningCompleted,
      async (context) => {
        if (!this.progressManager) return;

        try {
          const planningData = context.data as
            | {
                action?: string;
                todoId?: string;
                success?: boolean;
              }
            | undefined;

          const action = planningData?.action || 'Planning action';
          const todoId = planningData?.todoId;

          const activity = `Planning: ${action}`;
          const result = planningData?.success ? 'Planning completed' : 'Planning action performed';

          this.progressManager.logProgress({
            activity,
            result,
            relatedTodoId: todoId,
          });

          logger.debug('Logged planning action to progress');
        } catch (error) {
          logger.error('Failed to log planning action:', error);
        }
      },
      { priority: 5, description: 'Log planning action to progress' }
    );

    logger.info('Registered built-in lifecycle hooks');
  }
}

/**
 * Global singleton instance
 */
let globalHooksManager: HooksManager | null = null;

/**
 * Get or create the global HooksManager instance
 */
export function getGlobalHooksManager(): HooksManager {
  if (!globalHooksManager) {
    globalHooksManager = new HooksManager();
  }
  return globalHooksManager;
}

/**
 * Reset the global instance (primarily for testing)
 */
export function resetGlobalHooksManager(): void {
  globalHooksManager = null;
}
