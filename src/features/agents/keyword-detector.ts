/**
 * Magic Keyword Detection for Agent Modes
 * Inspired by oh-my-claudecode
 *
 * Detects special keywords in user prompts to trigger different execution modes:
 * - "ralph" / "don't stop until done" → Ralph Loop mode
 * - "ulw" / "ultrawork" → Ultrapilot mode
 * - "ralplan" / "plan this" → Planning pipeline mode
 * - "autopilot" → Full autonomous mode
 * - "swarm" → Swarm mode
 */

import logger from '../../utils/logger.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type ModeType = 'ralph' | 'ultrapilot' | 'ralplan' | 'autopilot' | 'swarm';

export interface DetectedMode {
  mode: ModeType;
  keyword: string;
  instructions: string;
}

export interface KeywordPattern {
  mode: ModeType;
  keywords: string[];
  aliases: string[];
  instructions: string;
  description: string;
}

export interface CleanedPrompt {
  original: string;
  cleaned: string;
  detectedModes: DetectedMode[];
  hasKeywords: boolean;
}

// ============================================================================
// Mode Instructions and Patterns
// ============================================================================

const MODE_INSTRUCTIONS: Record<ModeType, string> = {
  ralph: `
RALPH LOOP MODE ACTIVATED:
- Execute iteratively until objective is fully complete
- Don't stop at first success - verify, test, and validate thoroughly
- If tests fail, fix and retry automatically
- If build fails, debug and rebuild
- Keep going until everything works perfectly
- Break down complex tasks into smaller steps
- Report progress at each iteration
- Only stop when all acceptance criteria are met
`.trim(),

  ultrapilot: `
ULTRAPILOT MODE ACTIVATED:
- Execute tasks in parallel with maximum efficiency
- Use up to 5 concurrent workers for independent tasks
- Optimize task ordering based on dependencies
- Enable background execution for long-running operations
- Maximize throughput while respecting dependencies
- Report parallel execution progress
- Aggregate results from all workers
`.trim(),

  ralplan: `
PLANNING PIPELINE MODE ACTIVATED:
- Create a comprehensive execution plan before starting
- Break down request into discrete, actionable steps
- Identify dependencies between steps
- Organize steps into logical stages (review → implement → debug → refactor)
- Present plan for approval before execution
- Execute stages sequentially with progress tracking
- Pass data between stages as needed
`.trim(),

  autopilot: `
AUTOPILOT MODE ACTIVATED:
- Full autonomous execution with minimal user intervention
- Make intelligent decisions about approach and implementation
- Automatically handle errors and edge cases
- Choose appropriate execution strategy (parallel, sequential, pipeline)
- Self-correct when issues are detected
- Provide comprehensive status updates
- Complete entire workflow from planning to verification
`.trim(),

  swarm: `
SWARM MODE ACTIVATED:
- Distribute tasks across multiple concurrent agents
- Use task pool with agent claiming mechanism
- Support task retries on failure
- Handle task timeouts and re-assignments
- Enable dynamic load balancing
- Coordinate between agents through shared task pool
- Report swarm activity and task completion rates
`.trim(),
};

const KEYWORD_PATTERNS: KeywordPattern[] = [
  {
    mode: 'ralph',
    keywords: ['ralph'],
    aliases: ["don't stop until done", "dont stop until done", "keep going until done", "loop until complete"],
    instructions: MODE_INSTRUCTIONS.ralph,
    description: 'Iterative execution loop until task is fully complete',
  },
  {
    mode: 'ultrapilot',
    keywords: ['ulw', 'ultrawork'],
    aliases: ['ultra', 'parallel', 'max speed', 'fast mode'],
    instructions: MODE_INSTRUCTIONS.ultrapilot,
    description: 'Parallel execution with multiple workers',
  },
  {
    mode: 'ralplan',
    keywords: ['ralplan'],
    aliases: ['plan this', 'create plan', 'planning mode', 'staged execution'],
    instructions: MODE_INSTRUCTIONS.ralplan,
    description: 'Planning pipeline with sequential stages',
  },
  {
    mode: 'autopilot',
    keywords: ['autopilot'],
    aliases: ['auto', 'autonomous', 'full auto', 'hands-free'],
    instructions: MODE_INSTRUCTIONS.autopilot,
    description: 'Full autonomous mode with intelligent decision making',
  },
  {
    mode: 'swarm',
    keywords: ['swarm'],
    aliases: ['swarm mode', 'distributed', 'multi-agent'],
    instructions: MODE_INSTRUCTIONS.swarm,
    description: 'Swarm-based distributed task execution',
  },
];

// ============================================================================
// KeywordMatcher Class
// ============================================================================

export class KeywordMatcher {
  private patterns: KeywordPattern[];

  constructor(customPatterns?: KeywordPattern[]) {
    this.patterns = customPatterns || KEYWORD_PATTERNS;
  }

  /**
   * Detect keywords in a prompt and return detected modes
   */
  detectKeywords(prompt: string): DetectedMode[] {
    const detectedModes: DetectedMode[] = [];

    // Strip code blocks to prevent false positives
    const strippedPrompt = this.stripCodeBlocks(prompt);

    // Normalize for case-insensitive matching
    const normalizedPrompt = strippedPrompt.toLowerCase();

    for (const pattern of this.patterns) {
      // Check main keywords
      for (const keyword of pattern.keywords) {
        if (this.matchKeyword(normalizedPrompt, keyword)) {
          detectedModes.push({
            mode: pattern.mode,
            keyword,
            instructions: pattern.instructions,
          });

          logger.debug('Keyword detected', {
            mode: pattern.mode,
            keyword,
            prompt: prompt.substring(0, 50),
          });

          // Only match once per pattern
          break;
        }
      }

      // Check aliases if main keyword not found
      if (!detectedModes.some(m => m.mode === pattern.mode)) {
        for (const alias of pattern.aliases) {
          if (this.matchKeyword(normalizedPrompt, alias)) {
            detectedModes.push({
              mode: pattern.mode,
              keyword: alias,
              instructions: pattern.instructions,
            });

            logger.debug('Keyword alias detected', {
              mode: pattern.mode,
              alias,
              prompt: prompt.substring(0, 50),
            });

            break;
          }
        }
      }
    }

    return detectedModes;
  }

  /**
   * Remove detected keywords from prompt
   */
  cleanPrompt(prompt: string): string {
    let cleaned = prompt;
    const strippedPrompt = this.stripCodeBlocks(prompt);
    const normalizedPrompt = strippedPrompt.toLowerCase();

    for (const pattern of this.patterns) {
      // Remove main keywords
      for (const keyword of pattern.keywords) {
        if (this.matchKeyword(normalizedPrompt, keyword)) {
          // Create regex to match keyword with optional separators
          const regex = new RegExp(
            `\\b${this.escapeRegex(keyword)}\\b[:\\s]*`,
            'gi'
          );
          cleaned = cleaned.replace(regex, '');
        }
      }

      // Remove aliases
      for (const alias of pattern.aliases) {
        if (this.matchKeyword(normalizedPrompt, alias)) {
          const regex = new RegExp(
            `${this.escapeRegex(alias)}[:\\s]*`,
            'gi'
          );
          cleaned = cleaned.replace(regex, '');
        }
      }
    }

    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove leading/trailing colons or commas
    cleaned = cleaned.replace(/^[,:;\s]+|[,:;\s]+$/g, '');

    return cleaned;
  }

  /**
   * Get mode-specific instructions
   */
  getModeInstructions(mode: ModeType): string {
    return MODE_INSTRUCTIONS[mode] || '';
  }

  /**
   * Get all available modes and their descriptions
   */
  getAvailableModes(): Array<{ mode: ModeType; description: string; keywords: string[] }> {
    return this.patterns.map(p => ({
      mode: p.mode,
      description: p.description,
      keywords: [...p.keywords, ...p.aliases],
    }));
  }

  /**
   * Process prompt and return cleaned version with detected modes
   */
  processPrompt(prompt: string): CleanedPrompt {
    const detectedModes = this.detectKeywords(prompt);
    const cleaned = this.cleanPrompt(prompt);

    return {
      original: prompt,
      cleaned,
      detectedModes,
      hasKeywords: detectedModes.length > 0,
    };
  }

  /**
   * Check if a specific mode is detected in the prompt
   */
  hasMode(prompt: string, mode: ModeType): boolean {
    const detected = this.detectKeywords(prompt);
    return detected.some(m => m.mode === mode);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Match a keyword in the prompt using word boundary detection
   */
  private matchKeyword(normalizedPrompt: string, keyword: string): boolean {
    const lowerKeyword = keyword.toLowerCase();

    // For single words, use word boundary
    if (!lowerKeyword.includes(' ')) {
      const regex = new RegExp(`\\b${this.escapeRegex(lowerKeyword)}\\b`, 'i');
      return regex.test(normalizedPrompt);
    }

    // For phrases, match the entire phrase
    return normalizedPrompt.includes(lowerKeyword);
  }

  /**
   * Strip code blocks from prompt to avoid false positives
   */
  private stripCodeBlocks(text: string): string {
    // Remove code blocks with ``` or `
    let stripped = text.replace(/```[\s\S]*?```/g, '');
    stripped = stripped.replace(/`[^`]+`/g, '');
    return stripped;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// ============================================================================
// Factory Functions and Utilities
// ============================================================================

/**
 * Create a default keyword matcher instance
 */
export function createKeywordMatcher(): KeywordMatcher {
  return new KeywordMatcher();
}

/**
 * Quick detection helper - detects modes in a prompt
 */
export function detectModes(prompt: string): DetectedMode[] {
  const matcher = createKeywordMatcher();
  return matcher.detectKeywords(prompt);
}

/**
 * Quick clean helper - removes keywords from prompt
 */
export function cleanPromptKeywords(prompt: string): string {
  const matcher = createKeywordMatcher();
  return matcher.cleanPrompt(prompt);
}

/**
 * Combined helper - process prompt and return modes with cleaned text
 */
export function processUserPrompt(prompt: string): CleanedPrompt {
  const matcher = createKeywordMatcher();
  return matcher.processPrompt(prompt);
}

/**
 * Check if prompt contains any magic keywords
 */
export function hasMagicKeywords(prompt: string): boolean {
  const matcher = createKeywordMatcher();
  const detected = matcher.detectKeywords(prompt);
  return detected.length > 0;
}

/**
 * Get instructions for detected modes
 */
export function getDetectedInstructions(prompt: string): string[] {
  const matcher = createKeywordMatcher();
  const detected = matcher.detectKeywords(prompt);
  return detected.map(m => m.instructions);
}

/**
 * Combine multiple mode instructions into a single instruction block
 */
export function combineInstructions(modes: DetectedMode[]): string {
  if (modes.length === 0) {
    return '';
  }

  if (modes.length === 1) {
    return modes[0]?.instructions || '';
  }

  // Multiple modes detected - combine them
  const header = `COMBINED MODE ACTIVATED (${modes.map(m => m.mode.toUpperCase()).join(' + ')}):`;
  const instructions = modes.map(m => m.instructions).join('\n\n');

  return `${header}\n\n${instructions}`;
}

// ============================================================================
// Integration Hook for UserPromptSubmit
// ============================================================================

export interface PromptProcessingResult {
  originalPrompt: string;
  cleanedPrompt: string;
  detectedModes: DetectedMode[];
  combinedInstructions: string;
  shouldModifyPrompt: boolean;
}

/**
 * Process prompt for UserPromptSubmit integration
 * Returns modified prompt with mode instructions if keywords detected
 */
export function processPromptForSubmission(prompt: string): PromptProcessingResult {
  const matcher = createKeywordMatcher();
  const processed = matcher.processPrompt(prompt);

  const combinedInstructions = processed.detectedModes.length > 0
    ? combineInstructions(processed.detectedModes)
    : '';

  return {
    originalPrompt: prompt,
    cleanedPrompt: processed.cleaned,
    detectedModes: processed.detectedModes,
    combinedInstructions,
    shouldModifyPrompt: processed.hasKeywords,
  };
}

/**
 * Create enhanced prompt with mode instructions prepended
 */
export function createEnhancedPrompt(prompt: string): string {
  const result = processPromptForSubmission(prompt);

  if (!result.shouldModifyPrompt) {
    return prompt;
  }

  // Prepend instructions to cleaned prompt
  return `${result.combinedInstructions}\n\n---\n\nUSER REQUEST:\n${result.cleanedPrompt}`;
}

// ============================================================================
// Export Everything
// ============================================================================

export {
  KEYWORD_PATTERNS,
  MODE_INSTRUCTIONS,
};

export default KeywordMatcher;
