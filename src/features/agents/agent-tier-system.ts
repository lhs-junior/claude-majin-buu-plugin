/**
 * Agent Tier System
 *
 * A 3-tier agent system inspired by oh-my-claudecode that provides
 * intelligent task delegation based on complexity and requirements.
 *
 * - TIER 1 (HAIKU): Low cost, fast execution for simple tasks
 * - TIER 2 (SONNET): Balanced performance for general tasks
 * - TIER 3 (OPUS): High capability for complex, critical tasks
 */

export enum AgentTier {
  HAIKU = 'haiku',
  SONNET = 'sonnet',
  OPUS = 'opus',
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface AgentConstraints {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  retryAttempts?: number;
  parallelExecution?: boolean;
}

export interface AgentProfile {
  id: string;
  name: string;
  tier: AgentTier;
  description: string;
  capabilities: string[];
  tools: string[];
  constraints: AgentConstraints;
  model: string;
  costMultiplier: number;
}

/**
 * Tool definitions for MCP integration
 */
export const AGENT_TOOLS: Record<string, ToolDefinition> = {
  read_file: {
    name: 'read_file',
    description: 'Read file contents from the filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' },
      },
      required: ['path'],
    },
  },
  write_file: {
    name: 'write_file',
    description: 'Write content to a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to write' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['path', 'content'],
    },
  },
  search_code: {
    name: 'search_code',
    description: 'Search codebase using grep/ripgrep',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Search pattern' },
        path: { type: 'string', description: 'Path to search in' },
      },
      required: ['pattern'],
    },
  },
  execute_command: {
    name: 'execute_command',
    description: 'Execute shell commands',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to execute' },
        cwd: { type: 'string', description: 'Working directory' },
      },
      required: ['command'],
    },
  },
  analyze_code: {
    name: 'analyze_code',
    description: 'Analyze code structure and patterns',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to analyze' },
        depth: { type: 'number', description: 'Analysis depth' },
      },
      required: ['path'],
    },
  },
  run_tests: {
    name: 'run_tests',
    description: 'Execute test suites',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Test path or pattern' },
        framework: { type: 'string', description: 'Test framework' },
      },
    },
  },
  build_project: {
    name: 'build_project',
    description: 'Build and compile project',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Build target' },
        mode: { type: 'string', description: 'Build mode (dev/prod)' },
      },
    },
  },
  design_system: {
    name: 'design_system',
    description: 'Design system architecture',
    inputSchema: {
      type: 'object',
      properties: {
        requirements: { type: 'string', description: 'System requirements' },
        constraints: { type: 'object', description: 'Design constraints' },
      },
      required: ['requirements'],
    },
  },
  security_scan: {
    name: 'security_scan',
    description: 'Perform security analysis',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to scan' },
        severity: { type: 'string', description: 'Minimum severity level' },
      },
      required: ['path'],
    },
  },
  code_review: {
    name: 'code_review',
    description: 'Review code for quality and standards',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to review' },
        standards: { type: 'array', description: 'Coding standards to check' },
      },
      required: ['path'],
    },
  },
  vision_analysis: {
    name: 'vision_analysis',
    description: 'Analyze visual content and UI',
    inputSchema: {
      type: 'object',
      properties: {
        imagePath: { type: 'string', description: 'Path to image' },
        analysisType: { type: 'string', description: 'Type of analysis' },
      },
      required: ['imagePath'],
    },
  },
  plan_task: {
    name: 'plan_task',
    description: 'Create detailed task execution plans',
    inputSchema: {
      type: 'object',
      properties: {
        objective: { type: 'string', description: 'Task objective' },
        constraints: { type: 'object', description: 'Planning constraints' },
      },
      required: ['objective'],
    },
  },
};

/**
 * Agent Tier Registry
 * Contains all 30 agent profiles organized by tier
 */
export class AgentTierRegistry {
  private agents: Map<string, AgentProfile> = new Map();

  constructor() {
    this.registerAllAgents();
  }

  private registerAllAgents(): void {
    // TIER 1 - HAIKU (10 agents)
    this.register({
      id: 'architect-low',
      name: 'Junior Architect',
      tier: AgentTier.HAIKU,
      description: 'Basic architectural design and simple system planning',
      capabilities: ['simple-design', 'component-structure', 'basic-patterns'],
      tools: ['read_file', 'search_code', 'analyze_code'],
      constraints: {
        maxTokens: 4096,
        temperature: 0.3,
        timeoutMs: 30000,
        retryAttempts: 2,
      },
      model: 'claude-3-5-haiku-20241022',
      costMultiplier: 1,
    });

    this.register({
      id: 'scientist-low',
      name: 'Research Assistant',
      tier: AgentTier.HAIKU,
      description: 'Basic research and information gathering',
      capabilities: ['documentation-search', 'simple-analysis', 'fact-finding'],
      tools: ['read_file', 'search_code'],
      constraints: {
        maxTokens: 4096,
        temperature: 0.5,
        timeoutMs: 30000,
        retryAttempts: 2,
      },
      model: 'claude-3-5-haiku-20241022',
      costMultiplier: 1,
    });

    this.register({
      id: 'executor-low',
      name: 'Basic Executor',
      tier: AgentTier.HAIKU,
      description: 'Simple task execution and file operations',
      capabilities: ['file-operations', 'simple-edits', 'basic-commands'],
      tools: ['read_file', 'write_file', 'execute_command'],
      constraints: {
        maxTokens: 4096,
        temperature: 0.2,
        timeoutMs: 30000,
        retryAttempts: 3,
      },
      model: 'claude-3-5-haiku-20241022',
      costMultiplier: 1,
    });

    this.register({
      id: 'explore',
      name: 'Code Explorer',
      tier: AgentTier.HAIKU,
      description: 'Fast codebase exploration and navigation',
      capabilities: ['file-discovery', 'quick-search', 'structure-mapping'],
      tools: ['read_file', 'search_code', 'analyze_code'],
      constraints: {
        maxTokens: 4096,
        temperature: 0.3,
        timeoutMs: 20000,
        retryAttempts: 2,
        parallelExecution: true,
      },
      model: 'claude-3-5-haiku-20241022',
      costMultiplier: 1,
    });

    this.register({
      id: 'researcher-low',
      name: 'Junior Researcher',
      tier: AgentTier.HAIKU,
      description: 'Quick research and documentation lookup',
      capabilities: ['doc-search', 'pattern-finding', 'simple-correlation'],
      tools: ['read_file', 'search_code'],
      constraints: {
        maxTokens: 4096,
        temperature: 0.5,
        timeoutMs: 25000,
        retryAttempts: 2,
      },
      model: 'claude-3-5-haiku-20241022',
      costMultiplier: 1,
    });

    this.register({
      id: 'designer-low',
      name: 'UI Assistant',
      tier: AgentTier.HAIKU,
      description: 'Basic UI/UX suggestions and simple layouts',
      capabilities: ['simple-layouts', 'basic-styling', 'component-design'],
      tools: ['read_file', 'write_file', 'search_code'],
      constraints: {
        maxTokens: 4096,
        temperature: 0.6,
        timeoutMs: 30000,
        retryAttempts: 2,
      },
      model: 'claude-3-5-haiku-20241022',
      costMultiplier: 1,
    });

    this.register({
      id: 'security-reviewer-low',
      name: 'Security Scanner',
      tier: AgentTier.HAIKU,
      description: 'Basic security checks and common vulnerability detection',
      capabilities: ['basic-security', 'common-vulnerabilities', 'input-validation'],
      tools: ['read_file', 'search_code', 'security_scan'],
      constraints: {
        maxTokens: 4096,
        temperature: 0.2,
        timeoutMs: 30000,
        retryAttempts: 2,
      },
      model: 'claude-3-5-haiku-20241022',
      costMultiplier: 1,
    });

    this.register({
      id: 'build-fixer-low',
      name: 'Build Helper',
      tier: AgentTier.HAIKU,
      description: 'Simple build error fixes and dependency issues',
      capabilities: ['simple-build-fixes', 'dependency-updates', 'config-tweaks'],
      tools: ['read_file', 'write_file', 'execute_command', 'build_project'],
      constraints: {
        maxTokens: 4096,
        temperature: 0.2,
        timeoutMs: 40000,
        retryAttempts: 3,
      },
      model: 'claude-3-5-haiku-20241022',
      costMultiplier: 1,
    });

    this.register({
      id: 'tdd-guide-low',
      name: 'Test Assistant',
      tier: AgentTier.HAIKU,
      description: 'Simple test writing and basic TDD guidance',
      capabilities: ['unit-tests', 'simple-assertions', 'test-structure'],
      tools: ['read_file', 'write_file', 'run_tests'],
      constraints: {
        maxTokens: 4096,
        temperature: 0.3,
        timeoutMs: 35000,
        retryAttempts: 2,
      },
      model: 'claude-3-5-haiku-20241022',
      costMultiplier: 1,
    });

    this.register({
      id: 'code-reviewer-low',
      name: 'Code Checker',
      tier: AgentTier.HAIKU,
      description: 'Basic code quality checks and formatting',
      capabilities: ['style-checks', 'simple-linting', 'formatting'],
      tools: ['read_file', 'search_code', 'code_review'],
      constraints: {
        maxTokens: 4096,
        temperature: 0.2,
        timeoutMs: 30000,
        retryAttempts: 2,
      },
      model: 'claude-3-5-haiku-20241022',
      costMultiplier: 1,
    });

    // TIER 2 - SONNET (11 agents)
    this.register({
      id: 'architect-medium',
      name: 'System Architect',
      tier: AgentTier.SONNET,
      description: 'Intermediate system design and architectural planning',
      capabilities: ['system-design', 'pattern-application', 'module-architecture', 'api-design'],
      tools: ['read_file', 'write_file', 'search_code', 'analyze_code', 'design_system'],
      constraints: {
        maxTokens: 8192,
        temperature: 0.4,
        timeoutMs: 60000,
        retryAttempts: 3,
      },
      model: 'claude-sonnet-4-20250514',
      costMultiplier: 3,
    });

    this.register({
      id: 'scientist',
      name: 'Research Scientist',
      tier: AgentTier.SONNET,
      description: 'Advanced research, analysis, and hypothesis generation',
      capabilities: ['deep-research', 'pattern-analysis', 'documentation', 'correlation-analysis'],
      tools: ['read_file', 'search_code', 'analyze_code'],
      constraints: {
        maxTokens: 8192,
        temperature: 0.6,
        timeoutMs: 60000,
        retryAttempts: 3,
      },
      model: 'claude-sonnet-4-20250514',
      costMultiplier: 3,
    });

    this.register({
      id: 'executor',
      name: 'Task Executor',
      tier: AgentTier.SONNET,
      description: 'Reliable task execution with error handling',
      capabilities: ['complex-edits', 'multi-file-operations', 'error-recovery', 'rollback'],
      tools: ['read_file', 'write_file', 'execute_command', 'search_code'],
      constraints: {
        maxTokens: 8192,
        temperature: 0.3,
        timeoutMs: 60000,
        retryAttempts: 4,
      },
      model: 'claude-sonnet-4-20250514',
      costMultiplier: 3,
    });

    this.register({
      id: 'explore-medium',
      name: 'Advanced Explorer',
      tier: AgentTier.SONNET,
      description: 'Deep codebase analysis and dependency mapping',
      capabilities: ['dependency-analysis', 'architecture-mapping', 'impact-analysis', 'pattern-detection'],
      tools: ['read_file', 'search_code', 'analyze_code'],
      constraints: {
        maxTokens: 8192,
        temperature: 0.4,
        timeoutMs: 60000,
        retryAttempts: 3,
        parallelExecution: true,
      },
      model: 'claude-sonnet-4-20250514',
      costMultiplier: 3,
    });

    this.register({
      id: 'researcher',
      name: 'Senior Researcher',
      tier: AgentTier.SONNET,
      description: 'Comprehensive research and documentation analysis',
      capabilities: ['advanced-research', 'cross-referencing', 'synthesis', 'reporting'],
      tools: ['read_file', 'search_code', 'analyze_code'],
      constraints: {
        maxTokens: 8192,
        temperature: 0.5,
        timeoutMs: 60000,
        retryAttempts: 3,
      },
      model: 'claude-sonnet-4-20250514',
      costMultiplier: 3,
    });

    this.register({
      id: 'designer',
      name: 'UX Designer',
      tier: AgentTier.SONNET,
      description: 'Comprehensive UI/UX design and user experience optimization',
      capabilities: ['ux-design', 'accessibility', 'responsive-design', 'design-systems'],
      tools: ['read_file', 'write_file', 'search_code', 'vision_analysis'],
      constraints: {
        maxTokens: 8192,
        temperature: 0.7,
        timeoutMs: 60000,
        retryAttempts: 3,
      },
      model: 'claude-sonnet-4-20250514',
      costMultiplier: 3,
    });

    this.register({
      id: 'qa-tester',
      name: 'QA Engineer',
      tier: AgentTier.SONNET,
      description: 'Comprehensive testing and quality assurance',
      capabilities: ['integration-tests', 'e2e-tests', 'test-planning', 'coverage-analysis'],
      tools: ['read_file', 'write_file', 'run_tests', 'execute_command'],
      constraints: {
        maxTokens: 8192,
        temperature: 0.3,
        timeoutMs: 90000,
        retryAttempts: 3,
      },
      model: 'claude-sonnet-4-20250514',
      costMultiplier: 3,
    });

    this.register({
      id: 'build-fixer',
      name: 'Build Engineer',
      tier: AgentTier.SONNET,
      description: 'Complex build issues and CI/CD pipeline fixes',
      capabilities: ['complex-build-fixes', 'pipeline-optimization', 'dependency-resolution', 'build-automation'],
      tools: ['read_file', 'write_file', 'execute_command', 'build_project', 'search_code'],
      constraints: {
        maxTokens: 8192,
        temperature: 0.3,
        timeoutMs: 120000,
        retryAttempts: 4,
      },
      model: 'claude-sonnet-4-20250514',
      costMultiplier: 3,
    });

    this.register({
      id: 'tdd-guide',
      name: 'TDD Coach',
      tier: AgentTier.SONNET,
      description: 'Test-driven development guidance and advanced testing',
      capabilities: ['tdd-workflow', 'test-design', 'mocking', 'coverage-optimization'],
      tools: ['read_file', 'write_file', 'run_tests', 'search_code'],
      constraints: {
        maxTokens: 8192,
        temperature: 0.4,
        timeoutMs: 60000,
        retryAttempts: 3,
      },
      model: 'claude-sonnet-4-20250514',
      costMultiplier: 3,
    });

    this.register({
      id: 'vision',
      name: 'Vision Analyst',
      tier: AgentTier.SONNET,
      description: 'Visual content analysis and UI/UX evaluation',
      capabilities: ['ui-analysis', 'screenshot-review', 'visual-testing', 'accessibility-audit'],
      tools: ['vision_analysis', 'read_file', 'write_file'],
      constraints: {
        maxTokens: 8192,
        temperature: 0.5,
        timeoutMs: 60000,
        retryAttempts: 3,
      },
      model: 'claude-sonnet-4-20250514',
      costMultiplier: 3,
    });

    this.register({
      id: 'writer',
      name: 'Technical Writer',
      tier: AgentTier.SONNET,
      description: 'Documentation creation and technical writing',
      capabilities: ['documentation', 'api-docs', 'tutorials', 'readme-generation'],
      tools: ['read_file', 'write_file', 'search_code', 'analyze_code'],
      constraints: {
        maxTokens: 8192,
        temperature: 0.6,
        timeoutMs: 60000,
        retryAttempts: 2,
      },
      model: 'claude-sonnet-4-20250514',
      costMultiplier: 3,
    });

    // TIER 3 - OPUS (9 agents)
    this.register({
      id: 'architect',
      name: 'Lead Architect',
      tier: AgentTier.OPUS,
      description: 'Expert-level system architecture and complex design decisions',
      capabilities: ['enterprise-architecture', 'distributed-systems', 'scalability-design', 'performance-optimization', 'strategic-planning'],
      tools: ['read_file', 'write_file', 'search_code', 'analyze_code', 'design_system', 'plan_task'],
      constraints: {
        maxTokens: 16384,
        temperature: 0.5,
        timeoutMs: 120000,
        retryAttempts: 4,
      },
      model: 'claude-opus-4-20250514',
      costMultiplier: 15,
    });

    this.register({
      id: 'scientist-high',
      name: 'Principal Scientist',
      tier: AgentTier.OPUS,
      description: 'Expert research, complex problem solving, and innovation',
      capabilities: ['advanced-algorithms', 'research-synthesis', 'innovation', 'complex-analysis', 'academic-rigor'],
      tools: ['read_file', 'search_code', 'analyze_code', 'plan_task'],
      constraints: {
        maxTokens: 16384,
        temperature: 0.7,
        timeoutMs: 120000,
        retryAttempts: 4,
      },
      model: 'claude-opus-4-20250514',
      costMultiplier: 15,
    });

    this.register({
      id: 'executor-high',
      name: 'Senior Executor',
      tier: AgentTier.OPUS,
      description: 'Complex multi-step task execution with advanced error handling',
      capabilities: ['complex-workflows', 'advanced-error-recovery', 'transaction-management', 'orchestration', 'optimization'],
      tools: ['read_file', 'write_file', 'execute_command', 'search_code', 'analyze_code', 'plan_task'],
      constraints: {
        maxTokens: 16384,
        temperature: 0.3,
        timeoutMs: 180000,
        retryAttempts: 5,
      },
      model: 'claude-opus-4-20250514',
      costMultiplier: 15,
    });

    this.register({
      id: 'designer-high',
      name: 'Design Director',
      tier: AgentTier.OPUS,
      description: 'Expert UI/UX design and design system architecture',
      capabilities: ['design-systems', 'brand-architecture', 'advanced-accessibility', 'design-strategy', 'user-research'],
      tools: ['read_file', 'write_file', 'search_code', 'vision_analysis', 'design_system', 'plan_task'],
      constraints: {
        maxTokens: 16384,
        temperature: 0.7,
        timeoutMs: 120000,
        retryAttempts: 4,
      },
      model: 'claude-opus-4-20250514',
      costMultiplier: 15,
    });

    this.register({
      id: 'security-reviewer',
      name: 'Security Architect',
      tier: AgentTier.OPUS,
      description: 'Comprehensive security audits and threat modeling',
      capabilities: ['security-architecture', 'threat-modeling', 'penetration-testing', 'compliance', 'cryptography'],
      tools: ['read_file', 'search_code', 'analyze_code', 'security_scan', 'plan_task'],
      constraints: {
        maxTokens: 16384,
        temperature: 0.2,
        timeoutMs: 120000,
        retryAttempts: 4,
      },
      model: 'claude-opus-4-20250514',
      costMultiplier: 15,
    });

    this.register({
      id: 'code-reviewer',
      name: 'Staff Engineer',
      tier: AgentTier.OPUS,
      description: 'Expert code review with architectural insights',
      capabilities: ['architectural-review', 'performance-analysis', 'best-practices', 'refactoring-strategy', 'mentorship'],
      tools: ['read_file', 'search_code', 'analyze_code', 'code_review', 'plan_task'],
      constraints: {
        maxTokens: 16384,
        temperature: 0.3,
        timeoutMs: 120000,
        retryAttempts: 4,
      },
      model: 'claude-opus-4-20250514',
      costMultiplier: 15,
    });

    this.register({
      id: 'planner',
      name: 'Strategic Planner',
      tier: AgentTier.OPUS,
      description: 'High-level strategic planning and project orchestration',
      capabilities: ['strategic-planning', 'project-decomposition', 'resource-allocation', 'risk-assessment', 'milestone-planning'],
      tools: ['read_file', 'search_code', 'analyze_code', 'plan_task'],
      constraints: {
        maxTokens: 16384,
        temperature: 0.5,
        timeoutMs: 120000,
        retryAttempts: 4,
      },
      model: 'claude-opus-4-20250514',
      costMultiplier: 15,
    });

    this.register({
      id: 'analyst',
      name: 'Principal Analyst',
      tier: AgentTier.OPUS,
      description: 'Deep analysis and insights generation',
      capabilities: ['systems-analysis', 'data-analysis', 'performance-profiling', 'root-cause-analysis', 'optimization-strategy'],
      tools: ['read_file', 'search_code', 'analyze_code', 'plan_task'],
      constraints: {
        maxTokens: 16384,
        temperature: 0.4,
        timeoutMs: 120000,
        retryAttempts: 4,
      },
      model: 'claude-opus-4-20250514',
      costMultiplier: 15,
    });

    this.register({
      id: 'critic',
      name: 'Technical Critic',
      tier: AgentTier.OPUS,
      description: 'Critical evaluation and improvement recommendations',
      capabilities: ['critical-analysis', 'design-critique', 'quality-assessment', 'improvement-strategy', 'trade-off-analysis'],
      tools: ['read_file', 'search_code', 'analyze_code', 'code_review', 'plan_task'],
      constraints: {
        maxTokens: 16384,
        temperature: 0.5,
        timeoutMs: 120000,
        retryAttempts: 4,
      },
      model: 'claude-opus-4-20250514',
      costMultiplier: 15,
    });
  }

  private register(profile: AgentProfile): void {
    this.agents.set(profile.id, profile);
  }

  /**
   * Get an agent by ID
   */
  getAgent(id: string): AgentProfile | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all agents in a specific tier
   */
  getAgentsByTier(tier: AgentTier): AgentProfile[] {
    return Array.from(this.agents.values()).filter(agent => agent.tier === tier);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): AgentProfile[] {
    return Array.from(this.agents.values());
  }

  /**
   * Analyze task complexity and select appropriate agent tier
   */
  getAgentByComplexity(task: string): {
    recommendedAgents: AgentProfile[];
    tier: AgentTier;
    reasoning: string;
  } {
    const taskLower = task.toLowerCase();

    // Complexity indicators
    const complexityIndicators = {
      high: [
        'architecture', 'design system', 'security audit', 'threat model',
        'distributed', 'scalability', 'enterprise', 'strategic', 'critical',
        'complex refactor', 'performance optimization', 'critical review',
        'production issue', 'system-wide', 'multi-service', 'migration'
      ],
      medium: [
        'feature', 'integration', 'api', 'testing', 'documentation',
        'refactor', 'optimization', 'research', 'analysis', 'design',
        'build fix', 'ci/cd', 'deployment', 'database', 'middleware'
      ],
      low: [
        'simple', 'basic', 'small', 'quick', 'minor', 'formatting',
        'style', 'typo', 'comment', 'rename', 'update', 'fix typo',
        'add comment', 'simple change', 'file move'
      ]
    };

    // Task type patterns
    const taskPatterns = {
      architecture: /architect|design system|system design|scalability|distributed/i,
      research: /research|investigate|analyze|study|explore/i,
      execution: /implement|create|build|develop|code|write/i,
      security: /security|vulnerability|audit|threat|penetration/i,
      testing: /test|tdd|qa|quality assurance/i,
      review: /review|critique|evaluate|assess/i,
      planning: /plan|strategy|roadmap|organize/i,
      design: /design|ui|ux|interface|visual/i,
      build: /build|compile|bundle|deploy|ci\/cd/i,
    };

    // Determine complexity score
    let complexityScore = 0;

    complexityIndicators.high.forEach(indicator => {
      if (taskLower.includes(indicator)) complexityScore += 3;
    });

    complexityIndicators.medium.forEach(indicator => {
      if (taskLower.includes(indicator)) complexityScore += 2;
    });

    complexityIndicators.low.forEach(indicator => {
      if (taskLower.includes(indicator)) complexityScore += 1;
    });

    // Task length as complexity indicator
    if (task.length > 200) complexityScore += 2;
    if (task.length > 500) complexityScore += 3;

    // Determine tier based on score
    let tier: AgentTier;
    let reasoning: string;

    if (complexityScore >= 6) {
      tier = AgentTier.OPUS;
      reasoning = 'High complexity task requiring expert-level capabilities and strategic thinking';
    } else if (complexityScore >= 3) {
      tier = AgentTier.SONNET;
      reasoning = 'Medium complexity task requiring balanced performance and reliability';
    } else {
      tier = AgentTier.HAIKU;
      reasoning = 'Low complexity task suitable for fast, cost-effective execution';
    }

    // Find matching agents based on task type
    const recommendedAgents: AgentProfile[] = [];

    for (const [type, pattern] of Object.entries(taskPatterns)) {
      if (pattern.test(task)) {
        // Map task type to agent IDs
        const agentMapping: Record<string, string[]> = {
          architecture: ['architect', 'architect-medium', 'architect-low'],
          research: ['scientist-high', 'scientist', 'researcher', 'researcher-low', 'scientist-low'],
          execution: ['executor-high', 'executor', 'executor-low'],
          security: ['security-reviewer', 'security-reviewer-low'],
          testing: ['qa-tester', 'tdd-guide', 'tdd-guide-low'],
          review: ['code-reviewer', 'critic', 'code-reviewer-low'],
          planning: ['planner', 'architect'],
          design: ['designer-high', 'designer', 'designer-low'],
          build: ['build-fixer', 'build-fixer-low'],
        };

        const agentIds = agentMapping[type] || [];
        agentIds.forEach(id => {
          const agent = this.getAgent(id);
          if (agent && agent.tier === tier && !recommendedAgents.find(a => a.id === id)) {
            recommendedAgents.push(agent);
          }
        });
      }
    }

    // Fallback: if no specific agents found, suggest general agents for the tier
    if (recommendedAgents.length === 0) {
      const tierAgents = this.getAgentsByTier(tier);
      if (tier === AgentTier.OPUS) {
        recommendedAgents.push(...tierAgents.filter(a =>
          ['architect', 'executor-high', 'analyst'].includes(a.id)
        ));
      } else if (tier === AgentTier.SONNET) {
        recommendedAgents.push(...tierAgents.filter(a =>
          ['executor', 'architect-medium', 'researcher'].includes(a.id)
        ));
      } else {
        recommendedAgents.push(...tierAgents.filter(a =>
          ['executor-low', 'explore', 'architect-low'].includes(a.id)
        ));
      }
    }

    return {
      recommendedAgents: recommendedAgents.slice(0, 3), // Top 3 recommendations
      tier,
      reasoning,
    };
  }

  /**
   * Get estimated cost multiplier for a task
   */
  getTaskCostEstimate(task: string): {
    tier: AgentTier;
    costMultiplier: number;
    estimatedTokens: number;
  } {
    const { tier, recommendedAgents } = this.getAgentByComplexity(task);
    const agent = recommendedAgents[0] || this.getAgentsByTier(tier)[0];

    return {
      tier,
      costMultiplier: agent.costMultiplier,
      estimatedTokens: agent.constraints.maxTokens || 4096,
    };
  }

  /**
   * Filter agents by capability
   */
  getAgentsByCapability(capability: string): AgentProfile[] {
    return Array.from(this.agents.values()).filter(agent =>
      agent.capabilities.some(cap =>
        cap.toLowerCase().includes(capability.toLowerCase())
      )
    );
  }

  /**
   * Get agent statistics
   */
  getStats(): {
    total: number;
    byTier: Record<AgentTier, number>;
    averageCostMultiplier: number;
  } {
    const all = this.getAllAgents();
    const byTier = {
      [AgentTier.HAIKU]: this.getAgentsByTier(AgentTier.HAIKU).length,
      [AgentTier.SONNET]: this.getAgentsByTier(AgentTier.SONNET).length,
      [AgentTier.OPUS]: this.getAgentsByTier(AgentTier.OPUS).length,
    };

    const totalCost = all.reduce((sum, agent) => sum + agent.costMultiplier, 0);

    return {
      total: all.length,
      byTier,
      averageCostMultiplier: totalCost / all.length,
    };
  }
}

// Export singleton instance
export const agentRegistry = new AgentTierRegistry();

// Convenience functions
export function getAgentByComplexity(task: string) {
  return agentRegistry.getAgentByComplexity(task);
}

export function getAgent(id: string) {
  return agentRegistry.getAgent(id);
}

export function getAllAgents() {
  return agentRegistry.getAllAgents();
}

export function getAgentsByTier(tier: AgentTier) {
  return agentRegistry.getAgentsByTier(tier);
}

export function getTaskCostEstimate(task: string) {
  return agentRegistry.getTaskCostEstimate(task);
}
