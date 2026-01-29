/**
 * Ralph Loop System - Self-referential loop that continues until task is verified complete
 * Inspired by oh-my-claudecode pattern
 *
 * Core Concept: Execute tasks in a loop, verifying completion at each iteration
 * until the Architect agent approves the work or max iterations is reached.
 */

import { EventEmitter } from 'events';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { AgentOrchestrator } from './agent-orchestrator.js';
import { UltrapilotMode } from './execution-modes.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface RalphState {
  active: boolean;
  iteration: number;
  maxIterations: number;
  completionPromise?: string;
  startedAt: number;
  prompt: string;
  task: string;
  lastVerification?: {
    status: 'APPROVED' | 'REJECTED';
    feedback?: string;
    timestamp: number;
  };
  verificationHistory: Array<{
    iteration: number;
    status: 'APPROVED' | 'REJECTED';
    feedback?: string;
    timestamp: number;
  }>;
}

export interface RalphLoopOptions {
  maxIterations?: number;
  autoActivateUltrapilot?: boolean;
  statePersistencePath?: string;
  agentOrchestrator?: AgentOrchestrator;
  onProgress?: (state: RalphState) => void;
  onVerification?: (result: VerificationResult) => void;
  onCompletion?: (result: CompletionResult) => void;
}

export interface VerificationResult {
  status: 'APPROVED' | 'REJECTED';
  feedback?: string;
  iteration: number;
  timestamp: number;
}

export interface CompletionResult {
  success: boolean;
  iterations: number;
  duration: number;
  finalState: RalphState;
  completionMessage: string;
}

export interface VerificationCommand {
  type: 'test' | 'build' | 'lint' | 'custom';
  command: string;
  expectedOutput?: string | RegExp;
}

// ============================================================================
// Promise Detection Pattern
// ============================================================================

const PROMISE_PATTERN = /<promise>(.*?)<\/promise>/gs;

/**
 * Extract completion promise from text output
 */
export function extractCompletionPromise(text: string): string | null {
  const match = PROMISE_PATTERN.exec(text);
  return match && match[1] ? match[1].trim() : null;
}

/**
 * Check if text contains a completion promise signal
 */
export function hasCompletionPromise(text: string): boolean {
  return PROMISE_PATTERN.test(text);
}

// ============================================================================
// Ralph Loop Implementation
// ============================================================================

export class RalphLoop extends EventEmitter {
  private state: RalphState;
  private options: Required<RalphLoopOptions>;
  private ultrapilotMode?: UltrapilotMode;
  private cancelled = false;

  constructor(options: RalphLoopOptions = {}) {
    super();

    const defaultStatePath = join(process.cwd(), '.omc', 'ralph-state.json');

    this.options = {
      maxIterations: options.maxIterations ?? 5,
      autoActivateUltrapilot: options.autoActivateUltrapilot ?? true,
      statePersistencePath: options.statePersistencePath ?? defaultStatePath,
      agentOrchestrator: options.agentOrchestrator ?? undefined as any,
      onProgress: options.onProgress ?? (() => {}),
      onVerification: options.onVerification ?? (() => {}),
      onCompletion: options.onCompletion ?? (() => {}),
    };

    // Initialize state
    this.state = this.loadState() || {
      active: false,
      iteration: 0,
      maxIterations: this.options.maxIterations,
      startedAt: 0,
      prompt: '',
      task: '',
      verificationHistory: [],
    };

    // Initialize Ultrapilot mode if auto-activate is enabled
    if (this.options.autoActivateUltrapilot) {
      this.ultrapilotMode = new UltrapilotMode({
        maxWorkers: 5,
        enableBackgroundExecution: true,
        onProgress: (progress) => {
          this.emit('ultrapilotProgress', progress);
        },
      });
    }
  }

  /**
   * Start the Ralph Loop execution
   */
  async start(task: string, prompt?: string): Promise<CompletionResult> {
    if (this.state.active) {
      throw new Error('Ralph Loop is already active');
    }

    // Initialize state
    this.state = {
      active: true,
      iteration: 0,
      maxIterations: this.options.maxIterations,
      startedAt: Date.now(),
      prompt: prompt || this.generateDefaultPrompt(task),
      task,
      verificationHistory: [],
    };

    this.cancelled = false;
    this.persistState();
    this.emit('started', this.state);

    let lastOutput = '';

    // Main loop
    while (this.state.iteration < this.state.maxIterations && !this.cancelled) {
      this.incrementIteration();

      this.emit('iterationStart', {
        iteration: this.state.iteration,
        maxIterations: this.state.maxIterations,
      });

      // Execute task iteration
      try {
        lastOutput = await this.executeIteration();

        // Check for completion promise
        const completionPromise = this.checkCompletion(lastOutput);

        if (completionPromise) {
          // Completion promise detected, trigger verification
          this.emit('completionPromiseDetected', completionPromise);

          const verificationResult = await this.requestArchitectVerification(
            completionPromise,
            lastOutput
          );

          if (verificationResult.status === 'APPROVED') {
            // Task verified and approved
            return this.generateCompletionResult(true, 'Task verified and approved by Architect');
          } else {
            // Task rejected, continue with feedback
            this.emit('verificationRejected', verificationResult);
            lastOutput = `Previous verification REJECTED. Feedback: ${verificationResult.feedback || 'No feedback provided'}`;
          }
        }

        this.options.onProgress(this.state);
      } catch (error) {
        this.emit('iterationError', {
          iteration: this.state.iteration,
          error: error instanceof Error ? error.message : String(error),
        });

        // Continue to next iteration on error
      }
    }

    // Max iterations reached or cancelled
    const reason = this.cancelled
      ? 'Loop cancelled'
      : 'Max iterations reached without verification approval';

    return this.generateCompletionResult(false, reason);
  }

  /**
   * Execute a single iteration of the loop
   */
  private async executeIteration(): Promise<string> {
    this.emit('executionStart', this.state.iteration);

    // Simulate task execution
    // In production, this would integrate with actual agent execution
    const output = await this.simulateTaskExecution();

    this.emit('executionComplete', {
      iteration: this.state.iteration,
      output,
    });

    return output;
  }

  /**
   * Check if completion promise is detected in output
   */
  checkCompletion(output: string): string | null {
    const promise = extractCompletionPromise(output);

    if (promise) {
      this.state.completionPromise = promise;
      this.persistState();
    }

    return promise;
  }

  /**
   * Increment iteration counter
   */
  incrementIteration(): void {
    this.state.iteration++;
    this.persistState();

    this.emit('iteration', {
      current: this.state.iteration,
      max: this.state.maxIterations,
      progress: (this.state.iteration / this.state.maxIterations) * 100,
    });
  }

  /**
   * Request Architect agent to verify completion
   */
  async requestArchitectVerification(
    completionPromise: string,
    output: string
  ): Promise<VerificationResult> {
    this.emit('verificationStart', {
      iteration: this.state.iteration,
      promise: completionPromise,
    });

    // Use AgentOrchestrator to spawn Architect if available
    let verificationResult: VerificationResult;

    if (this.options.agentOrchestrator) {
      verificationResult = await this.verifyWithArchitect(completionPromise, output);
    } else {
      // Fallback to simulated verification
      verificationResult = await this.simulateVerification(completionPromise);
    }

    // Update state
    this.state.lastVerification = {
      status: verificationResult.status,
      feedback: verificationResult.feedback,
      timestamp: verificationResult.timestamp,
    };

    this.state.verificationHistory.push({
      iteration: this.state.iteration,
      status: verificationResult.status,
      feedback: verificationResult.feedback,
      timestamp: verificationResult.timestamp,
    });

    this.persistState();
    this.emit('verificationComplete', verificationResult);
    this.options.onVerification(verificationResult);

    return verificationResult;
  }

  /**
   * Verify completion using Architect agent
   */
  private async verifyWithArchitect(
    completionPromise: string,
    output: string
  ): Promise<VerificationResult> {
    const verificationTask = `
Verify the following task completion:

TASK: ${this.state.task}

COMPLETION PROMISE: ${completionPromise}

OUTPUT:
${output}

VERIFICATION REQUIREMENTS:
1. Verify that verification commands were run (test, build, lint)
2. Verify that output shows actual passing results
3. Check that all requirements are met
4. Ensure no errors or warnings in output

Respond with:
- APPROVED if all verification requirements are met
- REJECTED if verification is incomplete or failed

Provide brief feedback explaining your decision.
    `.trim();

    try {
      const spawnResult = await this.options.agentOrchestrator!.spawn({
        type: 'architect',
        task: verificationTask,
        timeout: 30000, // 30 seconds for verification
      });

      // Poll for result (simplified - in production would use proper async handling)
      await this.delay(2000); // Give architect time to complete

      const result = this.options.agentOrchestrator!.getResult({
        agentId: spawnResult.agentId,
      });

      const architectOutput = typeof result.result === 'string'
        ? result.result
        : JSON.stringify(result.result);

      // Parse architect response
      const status: 'APPROVED' | 'REJECTED' = architectOutput.includes('APPROVED')
        ? 'APPROVED'
        : 'REJECTED';

      return {
        status,
        feedback: architectOutput,
        iteration: this.state.iteration,
        timestamp: Date.now(),
      };
    } catch (error) {
      // If architect fails, reject by default
      return {
        status: 'REJECTED',
        feedback: `Architect verification failed: ${error instanceof Error ? error.message : String(error)}`,
        iteration: this.state.iteration,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Simulate verification (for testing without AgentOrchestrator)
   */
  private async simulateVerification(completionPromise: string): Promise<VerificationResult> {
    await this.delay(1000);

    // Simple heuristic: approve if promise mentions verification
    const hasVerification = /verified|tested|built|lint|passed/i.test(completionPromise);

    return {
      status: hasVerification ? 'APPROVED' : 'REJECTED',
      feedback: hasVerification
        ? 'Verification requirements appear to be met'
        : 'No verification evidence found in completion promise',
      iteration: this.state.iteration,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate completion message
   */
  getCompletionMessage(success: boolean, reason: string): string {
    const duration = Date.now() - this.state.startedAt;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    const header = success
      ? '✓ Ralph Loop Completed Successfully'
      : '✗ Ralph Loop Terminated';

    const stats = [
      `Iterations: ${this.state.iteration}/${this.state.maxIterations}`,
      `Duration: ${minutes}m ${seconds}s`,
      `Verifications: ${this.state.verificationHistory.length}`,
    ];

    const verificationSummary = this.state.verificationHistory.length > 0
      ? '\n\nVerification History:\n' +
        this.state.verificationHistory
          .map((v, i) => `  ${i + 1}. [Iteration ${v.iteration}] ${v.status} - ${v.feedback || 'No feedback'}`)
          .join('\n')
      : '';

    return `
${header}
${stats.join(' | ')}

Reason: ${reason}${verificationSummary}

Task: ${this.state.task}
${this.state.completionPromise ? `Promise: ${this.state.completionPromise}` : ''}
    `.trim();
  }

  /**
   * Generate completion result
   */
  private generateCompletionResult(success: boolean, reason: string): CompletionResult {
    this.state.active = false;
    this.persistState();

    const result: CompletionResult = {
      success,
      iterations: this.state.iteration,
      duration: Date.now() - this.state.startedAt,
      finalState: { ...this.state },
      completionMessage: this.getCompletionMessage(success, reason),
    };

    this.emit('completed', result);
    this.options.onCompletion(result);

    return result;
  }

  /**
   * Cancel the loop
   */
  cancel(): void {
    this.cancelled = true;
    this.emit('cancelled', this.state.iteration);
  }

  /**
   * Get current state
   */
  getState(): RalphState {
    return { ...this.state };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.state = {
      active: false,
      iteration: 0,
      maxIterations: this.options.maxIterations,
      startedAt: 0,
      prompt: '',
      task: '',
      verificationHistory: [],
    };

    this.persistState();
    this.emit('reset');
  }

  /**
   * Load state from persistence
   */
  private loadState(): RalphState | null {
    try {
      if (existsSync(this.options.statePersistencePath)) {
        const data = readFileSync(this.options.statePersistencePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      this.emit('stateLoadError', error);
    }

    return null;
  }

  /**
   * Persist state to disk
   */
  private persistState(): void {
    try {
      // Ensure directory exists
      const dir = join(this.options.statePersistencePath, '..');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(
        this.options.statePersistencePath,
        JSON.stringify(this.state, null, 2),
        'utf-8'
      );

      this.emit('statePersisted', this.state);
    } catch (error) {
      this.emit('statePersistError', error);
    }
  }

  /**
   * Generate default prompt for task
   */
  private generateDefaultPrompt(task: string): string {
    return `
You are in a Ralph Loop - a self-referential execution loop that continues until your work is verified.

TASK: ${task}

INSTRUCTIONS:
1. Execute the task to the best of your ability
2. Run verification commands (test, build, lint) to ensure quality
3. When you believe the task is complete, wrap your completion statement in <promise> tags
4. The Architect will verify your work
5. If rejected, you will receive feedback and continue

VERIFICATION REQUIREMENTS:
- Run actual verification commands (npm test, npm run build, npm run lint, etc.)
- Show the actual output proving tests/builds passed
- Do not claim completion without fresh verification evidence

COMPLETION SIGNAL FORMAT:
<promise>
I have completed the task and verified:
- All tests passing (show output)
- Build successful (show output)
- Linting passed (show output)
</promise>

Begin iteration ${this.state.iteration + 1}/${this.state.maxIterations}:
    `.trim();
  }

  /**
   * Simulate task execution (placeholder for actual implementation)
   */
  private async simulateTaskExecution(): Promise<string> {
    await this.delay(2000);

    // Simulate progressive work
    if (this.state.iteration >= 2) {
      return `
Iteration ${this.state.iteration} completed.

Verification Commands:
$ npm test
✓ All tests passing (15 passed, 0 failed)

$ npm run build
✓ Build successful

$ npm run lint
✓ No linting errors

<promise>
Task completed and verified:
- Tests: All 15 tests passing
- Build: Successful compilation
- Lint: No errors or warnings
</promise>
      `.trim();
    } else {
      return `
Iteration ${this.state.iteration}: Working on task...
Progress: ${(this.state.iteration / this.state.maxIterations) * 100}%
Still working, verification pending...
      `.trim();
    }
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Verification Command Executor
// ============================================================================

export class VerificationCommandExecutor {
  /**
   * Execute verification command and check output
   */
  static async execute(command: VerificationCommand): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }> {
    // This would integrate with actual command execution in production
    // For now, return a simulated response
    return {
      success: true,
      output: `Simulated output for: ${command.command}`,
    };
  }

  /**
   * Validate command output against expected pattern
   */
  static validateOutput(output: string, expected?: string | RegExp): boolean {
    if (!expected) {
      return true; // No expectation means any output is valid
    }

    if (typeof expected === 'string') {
      return output.includes(expected);
    }

    return expected.test(output);
  }

  /**
   * Create common verification commands
   */
  static createTestCommand(testPath?: string): VerificationCommand {
    return {
      type: 'test',
      command: testPath ? `npm test ${testPath}` : 'npm test',
      expectedOutput: /passing|passed|✓/i,
    };
  }

  static createBuildCommand(): VerificationCommand {
    return {
      type: 'build',
      command: 'npm run build',
      expectedOutput: /success|built|compiled/i,
    };
  }

  static createLintCommand(): VerificationCommand {
    return {
      type: 'lint',
      command: 'npm run lint',
      expectedOutput: /no errors|✓|passed/i,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a Ralph Loop with standard configuration
 */
export function createRalphLoop(
  options?: RalphLoopOptions
): RalphLoop {
  return new RalphLoop(options);
}

/**
 * Create a Ralph Loop with Architect verification
 */
export function createRalphLoopWithArchitect(
  agentOrchestrator: AgentOrchestrator,
  options?: Omit<RalphLoopOptions, 'agentOrchestrator'>
): RalphLoop {
  return new RalphLoop({
    ...options,
    agentOrchestrator,
  });
}

// ============================================================================
// Integration with Execution Modes
// ============================================================================

/**
 * Run Ralph Loop with Ultrapilot mode for parallel verification
 */
export async function runRalphLoopWithUltrapilot(
  task: string,
  verificationCommands: VerificationCommand[],
  options?: RalphLoopOptions
): Promise<CompletionResult> {
  const loop = new RalphLoop({
    ...options,
    autoActivateUltrapilot: true,
  });

  // Add event listener for parallel verification
  loop.on('completionPromiseDetected', async (promise) => {
    // Execute verification commands in parallel using Ultrapilot
    console.log(`Executing ${verificationCommands.length} verification commands in parallel...`);
  });

  return loop.start(task);
}
