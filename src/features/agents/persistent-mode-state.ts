/**
 * Persistent Mode State Management
 * Inspired by oh-my-claudecode
 *
 * Manages state persistence across session restarts for:
 * - Ralph: Explicit loop mode
 * - Ralplan: Planning pipeline mode
 * - Ultrawork: High-performance work mode
 */

import { readFile, writeFile, unlink, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

// ============================================================================
// State Interfaces
// ============================================================================

/**
 * Ralph loop state
 * For explicit iteration-based workflows
 */
export interface RalphState {
  active: boolean;
  iteration: number;
  maxIterations: number;
  completionPromise?: string; // Serialized promise state
  startedAt: string; // ISO timestamp
  prompt: string; // Original user prompt
  lastCheckedAt?: string;
}

/**
 * Ralplan (Planning Pipeline) state
 * For multi-phase planning workflows
 */
export interface RalplanState {
  active: boolean;
  iteration: number;
  planPath: string; // Path to the plan file
  currentPhase: 'planning' | 'review' | 'execution' | 'complete';
  taskDescription: string;
  startedAt?: string;
  completedAt?: string;
  agentIds?: {
    planner?: string;
    critic?: string;
    architect?: string;
  };
}

/**
 * Ultrawork state
 * For high-performance continuous work mode
 */
export interface UltraworkState {
  active: boolean;
  startedAt: string;
  originalPrompt: string;
  reinforcementCount: number; // Counter for Stop hook reinforcement
  linkedToRalph?: boolean; // Whether this ultrawork is linked to a ralph loop
  lastCheckedAt?: string;
}

/**
 * Generic state type
 */
export type ModeState = RalphState | RalplanState | UltraworkState;

// ============================================================================
// Mode Priority
// ============================================================================

export enum ModePriority {
  RALPH = 1,      // Explicit loop - highest priority
  ULTRAWORK = 2,  // Performance mode
  TODO = 3,       // Todo continuation - baseline
}

export interface ActiveMode {
  mode: 'ralph' | 'ralplan' | 'ultrawork' | 'todo' | null;
  priority: ModePriority | null;
  state?: ModeState;
}

// ============================================================================
// State File Paths
// ============================================================================

export const STATE_DIR = '.omc';

export const STATE_FILES = {
  ralph: 'ralph-state.json',
  ralplan: 'ralplan-state.json',
  ultrawork: 'ultrawork-state.json',
} as const;

export type ModeType = keyof typeof STATE_FILES;

// ============================================================================
// PersistentModeState Class
// ============================================================================

export class PersistentModeState {
  private baseDir: string;

  constructor(baseDir: string = process.cwd()) {
    this.baseDir = baseDir;
  }

  /**
   * Get the full path to a state file
   */
  private getStatePath(mode: ModeType): string {
    return join(this.baseDir, STATE_DIR, STATE_FILES[mode]);
  }

  /**
   * Check if a state file exists
   */
  async exists(mode: ModeType): Promise<boolean> {
    try {
      await access(this.getStatePath(mode), constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save state to file
   */
  async saveState(mode: ModeType, state: ModeState): Promise<void> {
    const filePath = this.getStatePath(mode);
    const content = JSON.stringify(state, null, 2);

    try {
      await writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to save ${mode} state: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Load state from file
   */
  async loadState<T extends ModeState = ModeState>(mode: ModeType): Promise<T | null> {
    const filePath = this.getStatePath(mode);

    try {
      const content = await readFile(filePath, 'utf-8');
      const state = JSON.parse(content) as T;

      // Validate that the state has at least an 'active' field
      if (typeof state !== 'object' || state === null || !('active' in state)) {
        console.warn(`Invalid state format in ${mode} state file`);
        return null;
      }

      return state;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist - this is normal
        return null;
      }

      console.error(
        `Failed to load ${mode} state: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return null;
    }
  }

  /**
   * Clear state (delete state file)
   */
  async clearState(mode: ModeType): Promise<void> {
    const filePath = this.getStatePath(mode);

    try {
      await unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(
          `Failed to clear ${mode} state: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  /**
   * Check which mode is currently active with priority
   */
  async checkActiveMode(): Promise<ActiveMode> {
    // Priority 1: Ralph (explicit loop)
    const ralphState = await this.loadState<RalphState>('ralph');
    if (ralphState?.active) {
      return {
        mode: 'ralph',
        priority: ModePriority.RALPH,
        state: ralphState,
      };
    }

    // Priority 2: Ultrawork (performance mode)
    const ultraworkState = await this.loadState<UltraworkState>('ultrawork');
    if (ultraworkState?.active) {
      return {
        mode: 'ultrawork',
        priority: ModePriority.ULTRAWORK,
        state: ultraworkState,
      };
    }

    // Priority 3: Ralplan (planning pipeline)
    const ralplanState = await this.loadState<RalplanState>('ralplan');
    if (ralplanState?.active) {
      return {
        mode: 'ralplan',
        priority: ModePriority.TODO, // Same priority as todo continuation
        state: ralplanState,
      };
    }

    // No active mode
    return {
      mode: null,
      priority: null,
    };
  }

  /**
   * Increment reinforcement counter for Ultrawork
   * Used by Stop hook to track continuation requests
   */
  async incrementReinforcementCount(): Promise<number> {
    const state = await this.loadState<UltraworkState>('ultrawork');

    if (!state) {
      return 0;
    }

    const newCount = (state.reinforcementCount || 0) + 1;
    const updatedState: UltraworkState = {
      ...state,
      reinforcementCount: newCount,
      lastCheckedAt: new Date().toISOString(),
    };

    await this.saveState('ultrawork', updatedState);
    return newCount;
  }

  /**
   * Get reinforcement count for Ultrawork
   */
  async getReinforcementCount(): Promise<number> {
    const state = await this.loadState<UltraworkState>('ultrawork');
    return state?.reinforcementCount || 0;
  }

  /**
   * Update Ralph iteration
   */
  async updateRalphIteration(iteration: number): Promise<void> {
    const state = await this.loadState<RalphState>('ralph');

    if (!state) {
      throw new Error('No active Ralph state to update');
    }

    const updatedState: RalphState = {
      ...state,
      iteration,
      lastCheckedAt: new Date().toISOString(),
    };

    await this.saveState('ralph', updatedState);
  }

  /**
   * Update Ralplan phase
   */
  async updateRalplanPhase(phase: RalplanState['currentPhase']): Promise<void> {
    const state = await this.loadState<RalplanState>('ralplan');

    if (!state) {
      throw new Error('No active Ralplan state to update');
    }

    const updatedState: RalplanState = {
      ...state,
      currentPhase: phase,
    };

    if (phase === 'complete') {
      updatedState.completedAt = new Date().toISOString();
      updatedState.active = false;
    }

    await this.saveState('ralplan', updatedState);
  }

  /**
   * Graceful recovery: Check for orphaned states on session restart
   * Returns states that need recovery
   */
  async checkForOrphanedStates(): Promise<{
    ralph?: RalphState;
    ralplan?: RalplanState;
    ultrawork?: UltraworkState;
  }> {
    const orphaned: {
      ralph?: RalphState;
      ralplan?: RalplanState;
      ultrawork?: UltraworkState;
    } = {};

    // Check Ralph
    const ralphState = await this.loadState<RalphState>('ralph');
    if (ralphState?.active) {
      orphaned.ralph = ralphState;
    }

    // Check Ralplan
    const ralplanState = await this.loadState<RalplanState>('ralplan');
    if (ralplanState?.active && ralplanState.currentPhase !== 'complete') {
      orphaned.ralplan = ralplanState;
    }

    // Check Ultrawork
    const ultraworkState = await this.loadState<UltraworkState>('ultrawork');
    if (ultraworkState?.active) {
      orphaned.ultrawork = ultraworkState;
    }

    return orphaned;
  }

  /**
   * Deactivate all modes
   * Useful for cleanup or forced reset
   */
  async deactivateAll(): Promise<void> {
    const modes: ModeType[] = ['ralph', 'ralplan', 'ultrawork'];

    await Promise.all(
      modes.map(async (mode) => {
        const state = await this.loadState(mode);
        if (state && state.active) {
          await this.saveState(mode, { ...state, active: false });
        }
      })
    );
  }

  /**
   * Get all active states (for debugging/monitoring)
   */
  async getAllStates(): Promise<{
    ralph: RalphState | null;
    ralplan: RalplanState | null;
    ultrawork: UltraworkState | null;
  }> {
    return {
      ralph: await this.loadState<RalphState>('ralph'),
      ralplan: await this.loadState<RalplanState>('ralplan'),
      ultrawork: await this.loadState<UltraworkState>('ultrawork'),
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let instance: PersistentModeState | null = null;

/**
 * Get singleton instance of PersistentModeState
 */
export function getPersistentModeState(baseDir?: string): PersistentModeState {
  if (!instance || baseDir) {
    instance = new PersistentModeState(baseDir);
  }
  return instance;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a new Ralph state
 */
export function createRalphState(
  prompt: string,
  maxIterations: number = 5
): RalphState {
  return {
    active: true,
    iteration: 0,
    maxIterations,
    startedAt: new Date().toISOString(),
    prompt,
  };
}

/**
 * Create a new Ralplan state
 */
export function createRalplanState(
  planPath: string,
  taskDescription: string
): RalplanState {
  return {
    active: true,
    iteration: 0,
    planPath,
    currentPhase: 'planning',
    taskDescription,
    startedAt: new Date().toISOString(),
  };
}

/**
 * Create a new Ultrawork state
 */
export function createUltraworkState(
  originalPrompt: string,
  linkedToRalph: boolean = false
): UltraworkState {
  return {
    active: true,
    startedAt: new Date().toISOString(),
    originalPrompt,
    reinforcementCount: 0,
    linkedToRalph,
  };
}

/**
 * Check if a mode should continue based on its state
 */
export function shouldContinueMode(state: ModeState): boolean {
  if (!state.active) {
    return false;
  }

  if ('iteration' in state && 'maxIterations' in state) {
    // Ralph or Ralplan - check iteration limit
    return state.iteration < state.maxIterations;
  }

  if ('reinforcementCount' in state) {
    // Ultrawork - always continue unless explicitly deactivated
    return true;
  }

  return false;
}

/**
 * Format state for display
 */
export function formatStateForDisplay(mode: string, state: ModeState): string {
  const lines: string[] = [];
  lines.push(`Mode: ${mode}`);
  lines.push(`Status: ${state.active ? 'Active' : 'Inactive'}`);

  if ('iteration' in state && 'maxIterations' in state) {
    lines.push(`Iteration: ${state.iteration}/${state.maxIterations}`);
  }

  if ('currentPhase' in state) {
    lines.push(`Phase: ${state.currentPhase}`);
  }

  if ('reinforcementCount' in state) {
    lines.push(`Reinforcement Count: ${state.reinforcementCount}`);
  }

  if ('startedAt' in state && state.startedAt) {
    const startTime = new Date(state.startedAt);
    const elapsed = Date.now() - startTime.getTime();
    const minutes = Math.floor(elapsed / 60000);
    lines.push(`Running for: ${minutes} minutes`);
  }

  return lines.join('\n');
}
