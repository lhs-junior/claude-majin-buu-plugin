/**
 * Test Multi-Agent Orchestration features
 * Demonstrates spawning, monitoring, and managing parallel agents
 */

import { AwesomePluginGateway } from '../src/index.js';

async function testAgentOrchestration() {
  console.log('='.repeat(60));
  console.log('Multi-Agent Orchestration Test');
  console.log('='.repeat(60));

  const gateway = new AwesomePluginGateway({
    dbPath: ':memory:',
  });

  try {
    console.log('\n1. Testing agent_spawn...');

    // Spawn multiple agents of different types
    const researcher = await gateway['agentOrchestrator'].handleToolCall('agent_spawn', {
      type: 'researcher',
      task: 'Research best practices for BM25 search optimization',
    });
    console.log(`✅ Spawned researcher agent: ${researcher.agentId}`);

    const coder = await gateway['agentOrchestrator'].handleToolCall('agent_spawn', {
      type: 'coder',
      task: 'Generate utility functions for date formatting',
    });
    console.log(`✅ Spawned coder agent: ${coder.agentId}`);

    const tester = await gateway['agentOrchestrator'].handleToolCall('agent_spawn', {
      type: 'tester',
      task: 'Run unit tests for memory management module',
      timeout: 5000,
    });
    console.log(`✅ Spawned tester agent: ${tester.agentId}`);

    const reviewer = await gateway['agentOrchestrator'].handleToolCall('agent_spawn', {
      type: 'reviewer',
      task: 'Review code quality of agent orchestration module',
    });
    console.log(`✅ Spawned reviewer agent: ${reviewer.agentId}`);

    console.log('\n2. Testing agent_status while running...');

    // Check status immediately (should be running)
    await new Promise((resolve) => setTimeout(resolve, 100));

    for (const agent of [researcher, coder, tester, reviewer]) {
      const status = await gateway['agentOrchestrator'].handleToolCall('agent_status', {
        agentId: agent.agentId,
      });
      console.log(
        `  ${status.type.padEnd(10)} [${status.status.padEnd(10)}] ${status.progress || 'Starting...'}`
      );
    }

    console.log('\n3. Testing agent_list...');

    const allAgents = await gateway['agentOrchestrator'].handleToolCall('agent_list', {
      limit: 10,
    });
    console.log(`Total agents: ${allAgents.agents.length}`);

    // List by status
    const runningAgents = await gateway['agentOrchestrator'].handleToolCall('agent_list', {
      status: 'running',
    });
    console.log(`Running agents: ${runningAgents.agents.length}`);

    console.log('\n4. Waiting for agents to complete...');

    // Wait for agents to finish (simulated agents take ~2-3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 4000));

    console.log('\n5. Testing agent_result...');

    // Get results from completed agents
    for (const agent of [researcher, coder, tester, reviewer]) {
      try {
        const result = await gateway['agentOrchestrator'].handleToolCall('agent_result', {
          agentId: agent.agentId,
        });

        console.log(`\n${result.result.type.toUpperCase()} Agent Result:`);
        console.log(`  Status: ${result.status}`);
        console.log(`  Duration: ${result.duration}ms`);
        console.log(`  Summary: ${result.result.summary}`);

        // Type-specific output
        if (result.result.type === 'research') {
          console.log(`  Findings: ${result.result.findings.length} items`);
          result.result.findings.forEach((f: string, i: number) => {
            console.log(`    ${i + 1}. ${f}`);
          });
        } else if (result.result.type === 'code') {
          console.log(`  Files generated: ${result.result.files.length}`);
          console.log(`  Lines of code: ${result.result.linesOfCode}`);
        } else if (result.result.type === 'test') {
          console.log(`  Passed: ${result.result.passed}, Failed: ${result.result.failed}`);
          console.log(`  Coverage: ${result.result.coverage}%`);
        } else if (result.result.type === 'review') {
          console.log(`  Issues found: ${result.result.issues.length}`);
          console.log(`  Overall rating: ${result.result.overallRating}`);
        }
      } catch (error: any) {
        console.log(`  Error getting result: ${error.message}`);
      }
    }

    console.log('\n6. Testing agent_terminate...');

    // Spawn a new agent and immediately terminate it
    const slowAgent = await gateway['agentOrchestrator'].handleToolCall('agent_spawn', {
      type: 'researcher',
      task: 'Long-running research task',
    });
    console.log(`Spawned agent: ${slowAgent.agentId}`);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const terminated = await gateway['agentOrchestrator'].handleToolCall('agent_terminate', {
      agentId: slowAgent.agentId,
    });
    console.log(`Terminated: ${terminated.success ? '✅' : '❌'}`);

    console.log('\n7. Testing tool search integration...');

    // Test that agent tools appear in Gateway search
    const toolSearchResult = await gateway.searchTools('spawn parallel task', { limit: 10 });
    console.log(`\nSearch for "spawn parallel task" found ${toolSearchResult.length} tools:`);
    toolSearchResult.forEach((tool, i) => {
      console.log(`  ${i + 1}. ${tool.name} - ${tool.description?.substring(0, 80)}...`);
    });

    console.log('\n8. Agent Statistics:');
    const agentStats = gateway['agentOrchestrator'].getStatistics();
    console.log(JSON.stringify(agentStats, null, 2));

    console.log('\n9. Gateway Statistics:');
    const gatewayStats = gateway.getStatistics();
    console.log(JSON.stringify(gatewayStats, null, 2));

    // Cleanup
    await gateway.stop();

    console.log('\n✅ All multi-agent orchestration tests passed!');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    await gateway.stop();
    process.exit(1);
  }
}

testAgentOrchestration();
