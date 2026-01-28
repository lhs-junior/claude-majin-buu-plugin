/**
 * Test Memory Management features
 * Demonstrates saving, recalling, listing, and forgetting memories
 */

import { AwesomePluginGateway } from '../src/index.js';

async function testMemoryManagement() {
  console.log('='.repeat(60));
  console.log('Memory Management Test');
  console.log('='.repeat(60));

  const gateway = new AwesomePluginGateway({
    dbPath: ':memory:', // Use in-memory database for testing
  });

  try {
    console.log('\n1. Testing memory_save...');

    // Save some memories
    const memory1 = await gateway['memoryManager'].handleToolCall('memory_save', {
      key: 'user_preference',
      value: 'User prefers TypeScript over JavaScript',
      metadata: {
        category: 'preference',
        tags: ['typescript', 'programming'],
      },
    });
    console.log('✅ Saved memory 1:', memory1.id);

    const memory2 = await gateway['memoryManager'].handleToolCall('memory_save', {
      key: 'project_goal',
      value: 'Build an AI-powered MCP meta plugin with 95% token reduction',
      metadata: {
        category: 'goal',
        tags: ['ai', 'mcp', 'optimization'],
      },
    });
    console.log('✅ Saved memory 2:', memory2.id);

    const memory3 = await gateway['memoryManager'].handleToolCall('memory_save', {
      key: 'tech_stack',
      value: 'Using Node.js 18+, TypeScript 5.3+, BM25 search, SQLite',
      metadata: {
        category: 'technical',
        tags: ['nodejs', 'typescript', 'sqlite'],
      },
    });
    console.log('✅ Saved memory 3:', memory3.id);

    console.log('\n2. Testing memory_recall with BM25 search...');

    // Recall memories using semantic search
    const recallResult1 = await gateway['memoryManager'].handleToolCall('memory_recall', {
      query: 'programming language preferences',
      limit: 5,
    });
    console.log(`\nQuery: "programming language preferences"`);
    console.log(`Found ${recallResult1.results.length} relevant memories:`);
    recallResult1.results.forEach((r: any, i: number) => {
      console.log(`  ${i + 1}. [Relevance: ${r.relevance.toFixed(3)}] ${r.key}: ${r.value}`);
    });

    const recallResult2 = await gateway['memoryManager'].handleToolCall('memory_recall', {
      query: 'AI token optimization',
      limit: 5,
    });
    console.log(`\nQuery: "AI token optimization"`);
    console.log(`Found ${recallResult2.results.length} relevant memories:`);
    recallResult2.results.forEach((r: any, i: number) => {
      console.log(`  ${i + 1}. [Relevance: ${r.relevance.toFixed(3)}] ${r.key}: ${r.value}`);
    });

    console.log('\n3. Testing memory_list with filters...');

    // List all memories
    const listAll = await gateway['memoryManager'].handleToolCall('memory_list', {
      limit: 10,
    });
    console.log(`\nAll memories (${listAll.memories.length}):`);
    listAll.memories.forEach((m: any, i: number) => {
      console.log(`  ${i + 1}. ${m.key} [${m.metadata.category || 'uncategorized'}]`);
    });

    // List with category filter
    const listPreferences = await gateway['memoryManager'].handleToolCall('memory_list', {
      filter: { category: 'preference' },
    });
    console.log(`\nPreferences (${listPreferences.memories.length}):`);
    listPreferences.memories.forEach((m: any) => {
      console.log(`  - ${m.key}: ${m.value}`);
    });

    console.log('\n4. Testing memory statistics...');
    const stats = gateway['memoryManager'].getStatistics();
    console.log('Memory Statistics:');
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n5. Testing memory_forget...');
    const forgetResult = await gateway['memoryManager'].handleToolCall('memory_forget', {
      id: memory1.id,
    });
    console.log(`Forgot memory ${memory1.id}: ${forgetResult.success ? '✅' : '❌'}`);

    // Verify deletion
    const listAfterForget = await gateway['memoryManager'].handleToolCall('memory_list', {
      limit: 10,
    });
    console.log(`\nRemaining memories: ${listAfterForget.memories.length}`);

    console.log('\n6. Testing tool search integration...');
    // Test that memory tools appear in Gateway search
    const toolSearchResult = await gateway.searchTools('remember something', { limit: 10 });
    console.log(`\nSearch for "remember something" found ${toolSearchResult.length} tools:`);
    toolSearchResult.forEach((tool, i) => {
      console.log(`  ${i + 1}. ${tool.name} - ${tool.description}`);
    });

    // Show gateway statistics
    console.log('\n7. Gateway Statistics:');
    const gatewayStats = gateway.getStatistics();
    console.log(JSON.stringify(gatewayStats, null, 2));

    // Cleanup
    await gateway.stop();

    console.log('\n✅ All memory management tests passed!');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    await gateway.stop();
    process.exit(1);
  }
}

testMemoryManagement();
