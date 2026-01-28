import { architectPrompt } from './architect';
import { frontendPrompt } from './frontend';
import { backendPrompt } from './backend';
import { databasePrompt } from './database';
import { devopsPrompt } from './devops';
import { securityPrompt } from './security';
import { performancePrompt } from './performance';
import { documentationPrompt } from './documentation';
import { bugfixPrompt } from './bugfix';
import { refactorPrompt } from './refactor';

export interface AgentPromptConfig {
  role: string;
  description: string;
  capabilities: string[];
  bestPractices: string[];
  outputFormat: string;
  template: (task: string, context?: Record<string, any>) => string;
}

export type AgentType =
  | 'architect'
  | 'frontend'
  | 'backend'
  | 'database'
  | 'devops'
  | 'security'
  | 'performance'
  | 'documentation'
  | 'bugfix'
  | 'refactor'
  | 'testing'
  | 'code-review'
  | 'integration'
  | 'api-design';

/**
 * Registry for managing agent prompt templates.
 * Provides centralized access to specialist agent prompts and configurations.
 */
export class AgentPromptRegistry {
  private static prompts: Map<AgentType, AgentPromptConfig> = new Map();

  /**
   * Initialize the registry with default prompts for all agent types.
   */
  static initialize(): void {
    this.registerPrompt('architect', architectPrompt);
    this.registerPrompt('frontend', frontendPrompt);
    this.registerPrompt('backend', backendPrompt);
    this.registerPrompt('database', databasePrompt);
    this.registerPrompt('devops', devopsPrompt);
    this.registerPrompt('security', securityPrompt);
    this.registerPrompt('performance', performancePrompt);
    this.registerPrompt('documentation', documentationPrompt);
    this.registerPrompt('bugfix', bugfixPrompt);
    this.registerPrompt('refactor', refactorPrompt);

    // Register placeholder prompts for remaining agent types
    this.registerPlaceholderPrompts();
  }

  /**
   * Register a prompt configuration for a specific agent type.
   * @param agentType The type of agent
   * @param config The prompt configuration
   */
  static registerPrompt(agentType: AgentType, config: AgentPromptConfig): void {
    this.prompts.set(agentType, config);
  }

  /**
   * Get the prompt configuration for a specific agent type.
   * @param agentType The type of agent
   * @returns The prompt configuration or undefined if not found
   */
  static getPrompt(agentType: AgentType): AgentPromptConfig | undefined {
    return this.prompts.get(agentType);
  }

  /**
   * Generate a prompt for a specific agent type with task context.
   * @param agentType The type of agent
   * @param task The task description
   * @param context Additional context for the prompt
   * @returns The generated prompt string
   */
  static generatePrompt(
    agentType: AgentType,
    task: string,
    context?: Record<string, any>
  ): string {
    const config = this.getPrompt(agentType);
    if (!config) {
      throw new Error(`No prompt configuration found for agent type: ${agentType}`);
    }
    return config.template(task, context);
  }

  /**
   * Get all registered agent types.
   * @returns Array of registered agent types
   */
  static getRegisteredTypes(): AgentType[] {
    return Array.from(this.prompts.keys());
  }

  /**
   * Check if a prompt is registered for an agent type.
   * @param agentType The type of agent
   * @returns True if registered, false otherwise
   */
  static hasPrompt(agentType: AgentType): boolean {
    return this.prompts.has(agentType);
  }

  /**
   * Register placeholder prompts for agent types that don't have dedicated files yet.
   */
  private static registerPlaceholderPrompts(): void {
    const placeholderTypes: AgentType[] = ['testing', 'code-review', 'integration', 'api-design'];

    placeholderTypes.forEach(type => {
      if (!this.prompts.has(type)) {
        this.registerPrompt(type, {
          role: `${type.charAt(0).toUpperCase() + type.slice(1)} Specialist`,
          description: `Specialist agent for ${type} tasks`,
          capabilities: ['Analyze requirements', 'Execute tasks', 'Provide recommendations'],
          bestPractices: ['Follow industry standards', 'Ensure quality', 'Document work'],
          outputFormat: 'Structured analysis and recommendations',
          template: (task: string, context?: Record<string, any>) => `
You are a ${type} specialist agent.

TASK:
${task}

${context ? `CONTEXT:\n${JSON.stringify(context, null, 2)}\n` : ''}

Please analyze and complete the task following best practices.
          `.trim()
        });
      }
    });
  }
}

// Initialize the registry when the module is loaded
AgentPromptRegistry.initialize();

// Export all prompt configurations
export {
  architectPrompt,
  frontendPrompt,
  backendPrompt,
  databasePrompt,
  devopsPrompt,
  securityPrompt,
  performancePrompt,
  documentationPrompt,
  bugfixPrompt,
  refactorPrompt
};
