import { AgentType } from './agent-store.js';

/**
 * Agent prompt template with context injection
 */
export interface AgentPromptTemplate {
  type: AgentType;
  systemPrompt: string;
  template: (task: string, context?: Record<string, any>) => string;
  capabilities: string[];
  requiredTools?: string[];
}

/**
 * Registry for specialist agent prompts using strategy pattern
 * Each agent type has its own specialized prompt template
 */
export class AgentPromptRegistry {
  private prompts: Map<AgentType, AgentPromptTemplate>;

  constructor() {
    this.prompts = new Map();
    this.initializeDefaultPrompts();
  }

  /**
   * Initialize default prompts for all agent types
   */
  private initializeDefaultPrompts(): void {
    // Base agents (existing 4)
    this.register({
      type: 'researcher',
      systemPrompt: 'You are a research specialist. Your job is to find, analyze, and synthesize information.',
      template: (task, context) => {
        const sources = context?.sources ? `\n\nPreferred sources: ${context.sources.join(', ')}` : '';
        return `Research Task: ${task}${sources}\n\nProvide comprehensive findings with citations.`;
      },
      capabilities: ['web_search', 'document_analysis', 'synthesis'],
      requiredTools: ['search', 'read'],
    });

    this.register({
      type: 'coder',
      systemPrompt: 'You are a coding specialist. Your job is to write clean, efficient, and maintainable code.',
      template: (task, context) => {
        const language = context?.language ? `\n\nLanguage: ${context.language}` : '';
        const style = context?.style ? `\n\nCoding style: ${context.style}` : '';
        return `Coding Task: ${task}${language}${style}\n\nWrite production-ready code with proper error handling.`;
      },
      capabilities: ['code_generation', 'refactoring', 'debugging'],
      requiredTools: ['write', 'edit', 'read'],
    });

    this.register({
      type: 'tester',
      systemPrompt: 'You are a testing specialist. Your job is to ensure code quality through comprehensive testing.',
      template: (task, context) => {
        const coverage = context?.minCoverage ? `\n\nMinimum coverage: ${context.minCoverage}%` : '';
        const framework = context?.framework ? `\n\nTest framework: ${context.framework}` : '';
        return `Testing Task: ${task}${coverage}${framework}\n\nCreate thorough test suites with edge cases.`;
      },
      capabilities: ['test_generation', 'test_execution', 'coverage_analysis'],
      requiredTools: ['bash', 'write', 'read'],
    });

    this.register({
      type: 'reviewer',
      systemPrompt: 'You are a code review specialist. Your job is to ensure code quality, security, and best practices.',
      template: (task, context) => {
        const standards = context?.standards ? `\n\nStandards: ${context.standards}` : '';
        return `Review Task: ${task}${standards}\n\nProvide constructive feedback on code quality, security, and maintainability.`;
      },
      capabilities: ['code_review', 'security_analysis', 'best_practices'],
      requiredTools: ['read', 'grep'],
    });

    // New specialist agents
    this.register({
      type: 'architect',
      systemPrompt: 'You are a software architect. Your job is to design scalable, maintainable system architectures.',
      template: (task, context) => {
        const constraints = context?.constraints ? `\n\nConstraints: ${JSON.stringify(context.constraints)}` : '';
        return `Architecture Task: ${task}${constraints}\n\nDesign a robust architecture considering scalability, maintainability, and performance.`;
      },
      capabilities: ['system_design', 'technology_selection', 'architecture_patterns'],
      requiredTools: ['read', 'write'],
    });

    this.register({
      type: 'frontend',
      systemPrompt: 'You are a frontend specialist. Your job is to build responsive, accessible user interfaces.',
      template: (task, context) => {
        const framework = context?.framework || 'React';
        const a11y = context?.accessibility ? '\n\nEnsure WCAG 2.1 AA compliance.' : '';
        return `Frontend Task: ${task}\n\nFramework: ${framework}${a11y}\n\nBuild performant, accessible UI components.`;
      },
      capabilities: ['ui_development', 'responsive_design', 'accessibility'],
      requiredTools: ['write', 'edit', 'read', 'bash'],
    });

    this.register({
      type: 'backend',
      systemPrompt: 'You are a backend specialist. Your job is to build robust, scalable server-side applications.',
      template: (task, context) => {
        const stack = context?.stack ? `\n\nTech stack: ${context.stack}` : '';
        const apis = context?.apiStyle ? `\n\nAPI style: ${context.apiStyle}` : '';
        return `Backend Task: ${task}${stack}${apis}\n\nImplement secure, scalable backend services with proper error handling.`;
      },
      capabilities: ['api_development', 'database_design', 'authentication'],
      requiredTools: ['write', 'edit', 'read', 'bash'],
    });

    this.register({
      type: 'database',
      systemPrompt: 'You are a database specialist. Your job is to design efficient, normalized database schemas.',
      template: (task, context) => {
        const dbType = context?.dbType || 'SQL';
        const scale = context?.scale ? `\n\nExpected scale: ${context.scale}` : '';
        return `Database Task: ${task}\n\nDatabase type: ${dbType}${scale}\n\nDesign optimized schemas with proper indexing and relationships.`;
      },
      capabilities: ['schema_design', 'query_optimization', 'migration'],
      requiredTools: ['write', 'read'],
    });

    this.register({
      type: 'devops',
      systemPrompt: 'You are a DevOps specialist. Your job is to automate deployment, monitoring, and infrastructure.',
      template: (task, context) => {
        const platform = context?.platform ? `\n\nPlatform: ${context.platform}` : '';
        const ci = context?.ci ? `\n\nCI/CD: ${context.ci}` : '';
        return `DevOps Task: ${task}${platform}${ci}\n\nImplement reliable automation with proper monitoring and rollback strategies.`;
      },
      capabilities: ['ci_cd', 'infrastructure_as_code', 'monitoring'],
      requiredTools: ['bash', 'write', 'read'],
    });

    this.register({
      type: 'security',
      systemPrompt: 'You are a security specialist. Your job is to identify vulnerabilities and implement secure practices.',
      template: (task, context) => {
        const scope = context?.scope ? `\n\nSecurity scope: ${context.scope}` : '';
        return `Security Task: ${task}${scope}\n\nPerform thorough security analysis and recommend mitigations.`;
      },
      capabilities: ['vulnerability_scanning', 'security_audit', 'threat_modeling'],
      requiredTools: ['read', 'grep', 'bash'],
    });

    this.register({
      type: 'performance',
      systemPrompt: 'You are a performance specialist. Your job is to optimize code and identify bottlenecks.',
      template: (task, context) => {
        const target = context?.target ? `\n\nPerformance target: ${context.target}` : '';
        return `Performance Task: ${task}${target}\n\nProfile, analyze, and optimize for maximum performance.`;
      },
      capabilities: ['profiling', 'optimization', 'benchmarking'],
      requiredTools: ['bash', 'read', 'edit'],
    });

    this.register({
      type: 'documentation',
      systemPrompt: 'You are a documentation specialist. Your job is to write clear, comprehensive documentation.',
      template: (task, context) => {
        const audience = context?.audience || 'developers';
        const format = context?.format || 'markdown';
        return `Documentation Task: ${task}\n\nAudience: ${audience}\nFormat: ${format}\n\nWrite clear, accurate documentation with examples.`;
      },
      capabilities: ['technical_writing', 'api_documentation', 'tutorials'],
      requiredTools: ['read', 'write'],
    });

    this.register({
      type: 'bugfix',
      systemPrompt: 'You are a bug fixing specialist. Your job is to diagnose and fix bugs efficiently.',
      template: (task, context) => {
        const priority = context?.priority ? `\n\nPriority: ${context.priority}` : '';
        const reproduction = context?.reproduction ? `\n\nReproduction steps: ${context.reproduction}` : '';
        return `Bug Fix Task: ${task}${priority}${reproduction}\n\nDiagnose root cause and implement a robust fix.`;
      },
      capabilities: ['debugging', 'root_cause_analysis', 'testing'],
      requiredTools: ['read', 'edit', 'bash', 'grep'],
    });

    this.register({
      type: 'refactor',
      systemPrompt: 'You are a refactoring specialist. Your job is to improve code quality without changing behavior.',
      template: (task, context) => {
        const goals = context?.goals ? `\n\nRefactoring goals: ${context.goals.join(', ')}` : '';
        return `Refactoring Task: ${task}${goals}\n\nImprove code quality while maintaining functionality. Ensure all tests pass.`;
      },
      capabilities: ['code_restructuring', 'design_patterns', 'technical_debt'],
      requiredTools: ['read', 'edit', 'bash'],
    });
  }

  /**
   * Register a new agent prompt template
   */
  register(prompt: AgentPromptTemplate): void {
    this.prompts.set(prompt.type, prompt);
  }

  /**
   * Get prompt template for an agent type
   */
  getPrompt(type: AgentType): AgentPromptTemplate {
    const prompt = this.prompts.get(type);
    if (!prompt) {
      throw new Error(`No prompt template registered for agent type: ${type}`);
    }
    return prompt;
  }

  /**
   * Check if a prompt exists for an agent type
   */
  hasPrompt(type: AgentType): boolean {
    return this.prompts.has(type);
  }

  /**
   * Get all registered agent types
   */
  getRegisteredTypes(): AgentType[] {
    return Array.from(this.prompts.keys());
  }

  /**
   * Get all prompt templates
   */
  getAllPrompts(): AgentPromptTemplate[] {
    return Array.from(this.prompts.values());
  }

  /**
   * Override an existing prompt template
   */
  override(type: AgentType, prompt: Partial<AgentPromptTemplate>): void {
    const existing = this.prompts.get(type);
    if (!existing) {
      throw new Error(`Cannot override non-existent prompt for type: ${type}`);
    }

    this.prompts.set(type, {
      ...existing,
      ...prompt,
      type, // Ensure type doesn't change
    });
  }

  /**
   * Unregister a prompt template
   */
  unregister(type: AgentType): boolean {
    return this.prompts.delete(type);
  }
}
