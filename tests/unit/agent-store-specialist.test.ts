import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentStore, AgentType } from '../../src/features/agents/agent-store.js';

describe('AgentStore - Specialist Agents', () => {
  let store: AgentStore;

  beforeEach(() => {
    store = new AgentStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  describe('Agent Type System', () => {
    const baseAgentTypes: AgentType[] = ['researcher', 'coder', 'tester', 'reviewer'];
    const specialistAgentTypes: AgentType[] = [
      'architect',
      'frontend',
      'backend',
      'database',
      'devops',
      'security',
      'performance',
      'documentation',
      'bugfix',
      'refactor',
    ];

    it('should support all base agent types', () => {
      baseAgentTypes.forEach((type) => {
        const agent = store.create(type, `Task for ${type}`);
        expect(agent.type).toBe(type);
        expect(agent.id).toBeDefined();
        expect(agent.status).toBe('pending');
      });
    });

    it('should support all specialist agent types', () => {
      specialistAgentTypes.forEach((type) => {
        const agent = store.create(type, `Task for ${type}`);
        expect(agent.type).toBe(type);
        expect(agent.id).toBeDefined();
        expect(agent.status).toBe('pending');
      });
    });

    it('should create specialist agent with config', () => {
      const config = {
        framework: 'React',
        version: '18',
        features: ['hooks', 'suspense'],
      };

      const agent = store.create('frontend', 'Build UI component', {
        specialistConfig: config,
      });

      expect(agent.type).toBe('frontend');
      expect(agent.specialistConfig).toBeDefined();
      expect(JSON.parse(agent.specialistConfig!)).toEqual(config);
    });

    it('should create specialist agent with parent task', () => {
      const parentAgent = store.create('architect', 'Design system');
      const childAgent = store.create('frontend', 'Implement UI', {
        parentTaskId: parentAgent.id,
      });

      expect(childAgent.parentTaskId).toBe(parentAgent.id);

      const retrieved = store.get(childAgent.id);
      expect(retrieved?.parentTaskId).toBe(parentAgent.id);
    });

    it('should create specialist agent with memory keys', () => {
      const memoryKeys = ['mem_123', 'mem_456', 'mem_789'];

      const agent = store.create('security', 'Security audit', {
        memoryKeys,
      });

      expect(agent.memoryKeys).toBeDefined();
      expect(JSON.parse(agent.memoryKeys!)).toEqual(memoryKeys);
    });

    it('should create specialist agent with all options', () => {
      const config = { database: 'PostgreSQL', version: '15' };
      const memoryKeys = ['mem_db_001'];

      const parentAgent = store.create('architect', 'Design database');
      const agent = store.create('database', 'Create schema', {
        timeout: 30000,
        specialistConfig: config,
        parentTaskId: parentAgent.id,
        memoryKeys,
      });

      expect(agent.type).toBe('database');
      expect(agent.timeout).toBe(30000);
      expect(JSON.parse(agent.specialistConfig!)).toEqual(config);
      expect(agent.parentTaskId).toBe(parentAgent.id);
      expect(JSON.parse(agent.memoryKeys!)).toEqual(memoryKeys);
    });

    it('should retrieve specialist agent with all fields', () => {
      const config = { language: 'Go', version: '1.21' };
      const memoryKeys = ['mem_backend_001'];

      const agent = store.create('backend', 'Build API', {
        specialistConfig: config,
        memoryKeys,
      });

      const retrieved = store.get(agent.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.type).toBe('backend');
      expect(retrieved!.specialistConfig).toBeDefined();
      expect(JSON.parse(retrieved!.specialistConfig!)).toEqual(config);
      expect(retrieved!.memoryKeys).toBeDefined();
      expect(JSON.parse(retrieved!.memoryKeys!)).toEqual(memoryKeys);
    });
  });

  describe('Schema Migration', () => {
    it('should support new columns in database', () => {
      const agent = store.create('performance', 'Optimize queries', {
        specialistConfig: { target: 'database queries' },
        parentTaskId: null,
        memoryKeys: ['mem_perf_001'],
      });

      const retrieved = store.get(agent.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.specialistConfig).toBeDefined();
      expect(retrieved!.parentTaskId).toBeNull();
      expect(retrieved!.memoryKeys).toBeDefined();
    });

    it('should maintain backward compatibility with base agents', () => {
      const agent = store.create('coder', 'Write code');

      expect(agent.type).toBe('coder');
      expect(agent.specialistConfig).toBeUndefined();
      expect(agent.parentTaskId).toBeNull();
      expect(agent.memoryKeys).toBeUndefined();
    });
  });

  describe('Agent Filtering', () => {
    beforeEach(() => {
      // Create various agents
      store.create('architect', 'Task 1');
      store.create('frontend', 'Task 2');
      store.create('backend', 'Task 3');
      store.create('database', 'Task 4');
      store.create('architect', 'Task 5');
    });

    it('should filter by specialist type', () => {
      const architects = store.list({ type: 'architect' });
      expect(architects.length).toBe(2);
      expect(architects.every((a) => a.type === 'architect')).toBe(true);
    });

    it('should list all agents including specialists', () => {
      const all = store.list();
      expect(all.length).toBe(5);
    });
  });

  describe('Statistics', () => {
    it('should include specialist agents in statistics', () => {
      store.create('architect', 'Task 1');
      store.create('frontend', 'Task 2');
      store.create('backend', 'Task 3');
      store.create('coder', 'Task 4');

      const stats = store.getStatistics();
      expect(stats.total).toBe(4);
      expect(stats.byType.length).toBeGreaterThan(0);

      const architectStat = stats.byType.find((t) => t.type === 'architect');
      const frontendStat = stats.byType.find((t) => t.type === 'frontend');
      const backendStat = stats.byType.find((t) => t.type === 'backend');
      const coderStat = stats.byType.find((t) => t.type === 'coder');

      expect(architectStat?.count).toBe(1);
      expect(frontendStat?.count).toBe(1);
      expect(backendStat?.count).toBe(1);
      expect(coderStat?.count).toBe(1);
    });
  });
});
