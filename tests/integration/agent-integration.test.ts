import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AwesomePluginGateway } from '../../src/index.js';

/**
 * Integration Test: AgentOrchestrator with Planning/Memory/TDD
 *
 * This test verifies that the AgentOrchestrator correctly integrates with:
 * - PlanningManager (TODO tracking)
 * - MemoryManager (result persistence)
 * - TDDManager (test-first workflow)
 */
describe('Agent Integration with Planning/Memory/TDD', () => {
  let gateway: AwesomePluginGateway;

  beforeEach(() => {
    gateway = new AwesomePluginGateway({ dbPath: ':memory:' });
  });

  afterEach(async () => {
    await gateway.stop();
  });

  describe('Agent Spawning with Internal Tools', () => {
    it('should register all 14 agent types in tool definitions', () => {
      const stats = gateway.getStatistics();
      expect(stats.totalTools).toBeGreaterThan(0);

      // Verify agent tools are registered
      // agent_spawn, agent_status, agent_result, agent_terminate, agent_list
      expect(stats.totalTools).toBeGreaterThanOrEqual(5);
    });

    it('should spawn basic researcher agent without integrations', async () => {
      // Spawn a simple researcher agent
      const result = await (gateway as any).agentOrchestrator.spawn({
        type: 'researcher',
        task: 'Research TypeScript best practices',
      });

      expect(result.agentId).toBeDefined();
      expect(result.status).toBe('spawned');
      expect(result.prompt).toBeDefined();

      // Wait for agent to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get agent result
      const agentResult = await (gateway as any).agentOrchestrator.getResult({
        agentId: result.agentId,
      });

      expect(agentResult.status).toBe('completed');
      expect(agentResult.result).toBeDefined();
    }, 10000);

    it('should spawn all 14 specialist agent types', () => {
      const orchestrator = (gateway as any).agentOrchestrator;
      const registry = orchestrator.getPromptRegistry();
      const agentTypes = registry.getRegisteredTypes();

      // Verify all 14 agent types
      expect(agentTypes).toContain('researcher');
      expect(agentTypes).toContain('coder');
      expect(agentTypes).toContain('tester');
      expect(agentTypes).toContain('reviewer');
      expect(agentTypes).toContain('architect');
      expect(agentTypes).toContain('frontend');
      expect(agentTypes).toContain('backend');
      expect(agentTypes).toContain('database');
      expect(agentTypes).toContain('devops');
      expect(agentTypes).toContain('security');
      expect(agentTypes).toContain('performance');
      expect(agentTypes).toContain('documentation');
      expect(agentTypes).toContain('bugfix');
      expect(agentTypes).toContain('refactor');

      expect(agentTypes.length).toBe(14);
    });
  });

  describe('Planning Integration - TODO Creation', () => {
    it('should create TODO when spawning agent with createTodo flag', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;
      const planningManager = (gateway as any).planningManager;

      // Spawn agent with TODO creation
      const result = await orchestrator.spawn({
        type: 'coder',
        task: 'Implement user authentication',
        createTodo: true,
      });

      expect(result.agentId).toBeDefined();
      expect(result.todoId).toBeDefined();

      // Verify TODO was created (access store directly for testing)
      const todo = (planningManager as any).store.get(result.todoId);
      expect(todo).toBeDefined();
      expect(todo.content).toContain('coder');
      expect(todo.content).toContain('Implement user authentication');
      expect(todo.status).toBe('in_progress');
      expect(todo.tags).toContain('agent');
      expect(todo.tags).toContain('coder');
    });

    it('should update TODO to completed when agent completes', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;
      const planningManager = (gateway as any).planningManager;

      // Spawn agent with TODO
      const result = await orchestrator.spawn({
        type: 'tester',
        task: 'Run integration tests',
        createTodo: true,
      });

      // Wait for agent completion
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify TODO is completed
      const todo = (planningManager as any).store.get(result.todoId);
      expect(todo.status).toBe('completed');
    }, 10000);

    it('should support parent-child TODO hierarchy', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;
      const planningManager = (gateway as any).planningManager;

      // Create parent TODO
      const parent = planningManager.create({
        content: 'Build feature X',
      });

      // Spawn agent with parent task
      const result = await orchestrator.spawn({
        type: 'architect',
        task: 'Design architecture for feature X',
        createTodo: true,
        parentTaskId: parent.todo.id,
      });

      // Verify child TODO has correct parent
      const childTodo = (planningManager as any).store.get(result.todoId);
      expect(childTodo.parentId).toBe(parent.todo.id);
    });
  });

  describe('Memory Integration - Result Persistence', () => {
    it('should save agent results to memory when requested', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;
      const memoryManager = (gateway as any).memoryManager;

      // Spawn agent with memory saving
      const result = await orchestrator.spawn({
        type: 'researcher',
        task: 'Research GraphQL vs REST',
        saveToMemory: true,
        memoryTags: ['research', 'api-design'],
      });

      // Wait for agent completion
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify result was saved to memory
      // Memory is stored with a key, so we need to find it by key
      const allMemories = memoryManager.list({});
      const agentMemory = allMemories.memories.find((m: any) =>
        m.key.includes(`agent_researcher_${result.agentId}`)
      );

      expect(agentMemory).toBeDefined();
      expect(agentMemory.value).toBeDefined();

      const savedResult = JSON.parse(agentMemory.value);
      expect(savedResult.type).toBe('research');
      expect(savedResult.summary).toBeDefined();
    }, 10000);

    it('should tag memory entries correctly', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;
      const memoryManager = (gateway as any).memoryManager;

      const result = await orchestrator.spawn({
        type: 'coder',
        task: 'Generate API endpoint',
        saveToMemory: true,
        memoryTags: ['api', 'backend', 'nodejs'],
      });

      // Wait for agent completion
      await new Promise(resolve => setTimeout(resolve, 3500));

      // Verify agent completed
      const agentResult = await orchestrator.getResult({
        agentId: result.agentId,
      });
      expect(agentResult.status).toBe('completed');

      // List all memories and verify our agent memory exists
      const allMemories = memoryManager.list({});
      const agentMemory = allMemories.memories.find((m: any) =>
        m.key.includes(`agent_coder_${result.agentId}`)
      );

      expect(agentMemory).toBeDefined();
      if (agentMemory) {
        expect(agentMemory.tags).toContain('api');
        expect(agentMemory.tags).toContain('backend');
        expect(agentMemory.tags).toContain('nodejs');
      }
    }, 15000);

    it('should support memory references between agents', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;
      const memoryManager = (gateway as any).memoryManager;

      // First agent saves to memory
      const agent1 = await orchestrator.spawn({
        type: 'researcher',
        task: 'Research database options',
        saveToMemory: true,
        memoryTags: ['database'],
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const memoryKey1 = `agent_researcher_${agent1.agentId}`;

      // Second agent references first agent's memory
      const agent2 = await orchestrator.spawn({
        type: 'architect',
        task: 'Design database schema',
        saveToMemory: true,
        memoryKeys: [memoryKey1],
        memoryTags: ['database', 'architecture'],
      });

      expect(agent2.agentId).toBeDefined();
    }, 10000);
  });

  describe('TDD Integration - Test-First Workflow', () => {
    it('should spawn agent with TDD workflow', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;
      const planningManager = (gateway as any).planningManager;

      // Spawn agent for TDD
      const result = await orchestrator.spawn({
        type: 'tester',
        task: 'TDD: Implement user service',
        testPath: 'src/services/user.test.ts',
        createTodo: true,
        saveToMemory: true,
        memoryTags: ['tdd', 'user-service'],
      });

      expect(result.agentId).toBeDefined();
      expect(result.todoId).toBeDefined();

      // Verify TODO has TDD type
      const todo = (planningManager as any).store.get(result.todoId);
      expect(todo.type).toBe('tdd');
      expect(todo.testPath).toBe('src/services/user.test.ts');
    });

    it('should support spawnForTDD helper method', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;

      const result = await orchestrator.spawnForTDD(
        'tester',
        'src/utils/validator.test.ts',
        'Implement email validator'
      );

      expect(result.agentId).toBeDefined();
      expect(result.todoId).toBeDefined();

      // Wait and verify completion
      await new Promise(resolve => setTimeout(resolve, 3000));

      const agentResult = await orchestrator.getResult({
        agentId: result.agentId,
      });

      expect(agentResult.status).toBe('completed');
    }, 10000);
  });

  describe('Combined Integrations - Full Synergy', () => {
    it('should support agent with all integrations enabled', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;
      const planningManager = (gateway as any).planningManager;
      const memoryManager = (gateway as any).memoryManager;

      // Spawn agent with Planning + Memory + TDD
      const result = await orchestrator.spawn({
        type: 'coder',
        task: 'Implement authentication service with TDD',
        testPath: 'src/auth/auth.test.ts',
        createTodo: true,
        saveToMemory: true,
        memoryTags: ['authentication', 'tdd', 'security'],
        timeout: 10000,
      });

      expect(result.agentId).toBeDefined();
      expect(result.todoId).toBeDefined();

      // Verify TODO
      const todo = (planningManager as any).store.get(result.todoId);
      expect(todo.type).toBe('tdd');
      expect(todo.status).toBe('in_progress');

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 3500));

      // Verify agent completed
      const agentResult = await orchestrator.getResult({
        agentId: result.agentId,
      });
      expect(agentResult.status).toBe('completed');

      // Verify TODO completed
      const updatedTodo = (planningManager as any).store.get(result.todoId);
      expect(updatedTodo.status).toBe('completed');

      // Verify memory saved
      const allMemories = memoryManager.list({});
      const agentMemory = allMemories.memories.find((m: any) =>
        m.key.includes(`agent_coder_${result.agentId}`)
      );
      expect(agentMemory).toBeDefined();
    }, 15000);

    it('should handle agent failure gracefully with all integrations', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;
      const planningManager = (gateway as any).planningManager;

      // Spawn agent with very short timeout (will timeout)
      const result = await orchestrator.spawn({
        type: 'coder',
        task: 'Long running task',
        timeout: 100, // Very short timeout
        createTodo: true,
        saveToMemory: true,
      });

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify agent timed out - check status instead of getting result
      const agentStatus = await orchestrator.getStatus({
        agentId: result.agentId,
      });
      expect(agentStatus.status).toBe('timeout');

      // Verify TODO was reset to pending (for retry)
      const todo = (planningManager as any).store.get(result.todoId);
      expect(todo.status).toBe('pending');
    }, 10000);
  });

  describe('Specialist Agents with Integrations', () => {
    it('should spawn frontend specialist with planning', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;

      const result = await orchestrator.spawnWithPlanning(
        'frontend',
        'Build user profile component',
        undefined,
        {
          specialistConfig: {
            framework: 'React',
            styling: 'TailwindCSS',
          },
        }
      );

      expect(result.agentId).toBeDefined();
      expect(result.todoId).toBeDefined();
    });

    it('should spawn backend specialist with memory', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;

      const result = await orchestrator.spawnWithMemory(
        'backend',
        'Implement REST API endpoints',
        ['api', 'nodejs', 'express']
      );

      expect(result.agentId).toBeDefined();

      // Wait and verify memory saved
      await new Promise(resolve => setTimeout(resolve, 3500));

      const agentResult2 = await orchestrator.getResult({
        agentId: result.agentId,
      });
      expect(agentResult2.status).toBe('completed');

      const memoryManager = (gateway as any).memoryManager;
      const allMemories = memoryManager.list({});
      const agentMemory = allMemories.memories.find((m: any) =>
        m.key.includes(`agent_backend_${result.agentId}`)
      );

      expect(agentMemory).toBeDefined();
      if (agentMemory) {
        expect(agentMemory.tags).toContain('api');
        expect(agentMemory.tags).toContain('nodejs');
      }
    }, 15000);

    it('should spawn security specialist with all integrations', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;
      const planningManager = (gateway as any).planningManager;

      const result = await orchestrator.spawn({
        type: 'security',
        task: 'Security audit of authentication module',
        createTodo: true,
        saveToMemory: true,
        memoryTags: ['security', 'audit', 'authentication'],
        specialistConfig: {
          scanType: 'comprehensive',
          includeOWASP: true,
        },
      });

      expect(result.agentId).toBeDefined();
      expect(result.todoId).toBeDefined();

      // Verify TODO
      const todo = (planningManager as any).store.get(result.todoId);
      expect(todo.tags).toContain('security');
    });

    it('should spawn performance specialist for optimization', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;

      const result = await orchestrator.spawn({
        type: 'performance',
        task: 'Optimize database queries',
        createTodo: true,
        saveToMemory: true,
        memoryTags: ['performance', 'database', 'optimization'],
        specialistConfig: {
          target: 'database',
          metrics: ['query_time', 'throughput'],
        },
      });

      expect(result.agentId).toBeDefined();
      expect(result.todoId).toBeDefined();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track agent statistics correctly', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;

      // Spawn multiple agents
      await orchestrator.spawn({
        type: 'researcher',
        task: 'Task 1',
      });

      await orchestrator.spawn({
        type: 'coder',
        task: 'Task 2',
      });

      await orchestrator.spawn({
        type: 'tester',
        task: 'Task 3',
      });

      const stats = orchestrator.getStatistics();

      expect(stats.store.total).toBe(3);
      expect(stats.activeAgents).toBeGreaterThanOrEqual(0);
      expect(stats.promptRegistry.registeredTypes).toBe(14);
    });

    it('should list agents with filters', async () => {
      const orchestrator = (gateway as any).agentOrchestrator;

      // Spawn agents
      await orchestrator.spawn({ type: 'researcher', task: 'Research task' });
      await orchestrator.spawn({ type: 'coder', task: 'Coding task' });
      await orchestrator.spawn({ type: 'researcher', task: 'Another research' });

      // List all
      const allAgents = orchestrator.list({ limit: 10 });
      expect(allAgents.agents.length).toBe(3);

      // Filter by type
      const researchers = orchestrator.list({ type: 'researcher', limit: 10 });
      expect(researchers.agents.length).toBe(2);
      expect(researchers.agents.every((a: any) => a.type === 'researcher')).toBe(true);
    });
  });
});
