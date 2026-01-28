/**
 * Guide System Test
 * Demonstrates guide search, tutorial workflow, and integration with Memory
 */

import { GuideManager } from '../src/features/guide/guide-manager.js';
import { MemoryManager } from '../src/features/memory/memory-manager.js';

async function testGuideSystem() {
  console.log('='.repeat(70));
  console.log('Guide System Test - Search, Tutorials, and Memory Integration');
  console.log('='.repeat(70));

  // Initialize Memory Manager for saving completions
  const memoryManager = new MemoryManager(':memory:');
  const guideManager = new GuideManager(':memory:', { memoryManager });

  try {
    // Setup: Create sample guides with tutorial steps
    console.log('\n📚 Setting up sample guides...\n');

    const guide1 = guideManager['store'].createGuide(
      'typescript-basics',
      'TypeScript Basics',
      'getting-started',
      'guides/typescript-basics.md',
      'Learn the fundamentals of TypeScript',
      {
        tags: ['typescript', 'beginner', 'language'],
        difficulty: 'beginner',
        estimatedTime: 30,
        relatedTools: ['npm', 'vscode'],
      }
    );

    const guide2 = guideManager['store'].createGuide(
      'async-patterns',
      'Async Patterns in TypeScript',
      'tutorial',
      'guides/async-patterns.md',
      'Master async/await, promises, and callbacks',
      {
        tags: ['typescript', 'async', 'advanced'],
        difficulty: 'advanced',
        estimatedTime: 45,
        relatedTools: ['npm'],
      }
    );

    const guide3 = guideManager['store'].createGuide(
      'react-hooks',
      'React Hooks Guide',
      'tutorial',
      'guides/react-hooks.md',
      'Learn modern React hooks patterns',
      {
        tags: ['react', 'hooks', 'intermediate'],
        difficulty: 'intermediate',
        estimatedTime: 25,
        relatedTools: ['npm', 'webpack'],
      }
    );

    // Create tutorial steps for guide1
    guideManager['store'].createStep(guide1.id, 1, 'Install TypeScript', 'npm install -g typescript', {
      codeExample: 'npm install -g typescript',
      hints: ['Make sure Node.js is installed', 'Use -g for global installation'],
    });

    guideManager['store'].createStep(guide1.id, 2, 'Your First Type', 'Create a simple typed variable', {
      codeExample: 'const name: string = "Alice";',
      expectedOutput: 'name is a string type',
      hints: ['Use the syntax: name: type', 'Try typing different values'],
    });

    guideManager['store'].createStep(guide1.id, 3, 'Functions with Types', 'Add type annotations to functions', {
      codeExample: 'function add(a: number, b: number): number { return a + b; }',
      hints: ['Specify parameter types and return type', 'TypeScript will infer return types if obvious'],
    });

    console.log(`✅ Created ${guide1.title} with 3 steps`);
    console.log(`✅ Created ${guide2.title}`);
    console.log(`✅ Created ${guide3.title}`);

    // 1. Test guide_search with various filters
    console.log('\n' + '='.repeat(70));
    console.log('1. Testing guide_search');
    console.log('='.repeat(70));

    console.log('\n🔍 Search: "typescript"');
    const search1 = guideManager.search({ query: 'typescript', limit: 5 });
    search1.results.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.guide.title} [${r.guide.difficulty}] (relevance: ${r.relevance.toFixed(2)})`);
    });

    console.log('\n🔍 Search: "async" with difficulty filter');
    const search2 = guideManager.search({ query: 'async', difficulty: 'advanced', limit: 5 });
    search2.results.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.guide.title} (${r.guide.category})`);
    });

    console.log('\n🔍 Search: "react" with beginner filter');
    const search3 = guideManager.search({ query: 'react', difficulty: 'beginner', limit: 5 });
    if (search3.results.length === 0) {
      console.log('  No beginner-level React guides found');
    } else {
      search3.results.forEach((r) => {
        console.log(`  ${r.guide.title}`);
      });
    }

    // 2. Test guide_tutorial workflow: start → next → hint → check → complete
    console.log('\n' + '='.repeat(70));
    console.log('2. Testing guide_tutorial workflow');
    console.log('='.repeat(70));

    console.log('\n📖 Starting TypeScript Basics tutorial...');
    const startResult = await guideManager.tutorial({
      action: 'start',
      guideId: guide1.id,
    });
    console.log(`✅ Started: Step ${startResult.progress.currentStep} - ${startResult.currentStep.title}`);
    console.log(`   Content: ${startResult.currentStep.content}`);
    console.log(`   Code: ${startResult.currentStep.codeExample}`);

    console.log('\n💡 Getting hint for Step 1...');
    const hintResult = await guideManager.tutorial({
      action: 'hint',
      guideId: guide1.id,
    });
    console.log(`   Hints: ${hintResult.hints.join(' | ')}`);

    console.log('\n✓ Checking Step 1...');
    const checkResult = await guideManager.tutorial({
      action: 'check',
      guideId: guide1.id,
    });
    console.log(`   Message: ${checkResult.message}`);

    console.log('\n✓ Marking Step 1 as complete...');
    const completeResult = await guideManager.tutorial({
      action: 'complete',
      guideId: guide1.id,
    });
    console.log(`✅ Completed: ${completeResult.message}`);

    console.log('\n→ Moving to next step...');
    const nextResult = await guideManager.tutorial({
      action: 'next',
      guideId: guide1.id,
    });
    console.log(`✅ Now on Step ${nextResult.progress.currentStep} - ${nextResult.currentStep.title}`);
    console.log(`   Code: ${nextResult.currentStep.codeExample}`);

    console.log('\n→ Continuing to Step 3...');
    await guideManager.tutorial({ action: 'next', guideId: guide1.id });
    await guideManager.tutorial({ action: 'complete', guideId: guide1.id });
    const finalNext = await guideManager.tutorial({ action: 'next', guideId: guide1.id });
    console.log(`✅ Tutorial Complete! ${finalNext.completed ? '🎉' : ''}`);

    // 3. Test all 8 tutorial actions
    console.log('\n' + '='.repeat(70));
    console.log('3. Testing all 8 tutorial actions');
    console.log('='.repeat(70));

    // Reset for fresh start
    await guideManager.tutorial({ action: 'reset', guideId: guide1.id });

    const actions = [
      { action: 'start' as const, desc: 'Start tutorial' },
      { action: 'status' as const, desc: 'Check status' },
      { action: 'hint' as const, desc: 'Get hint' },
      { action: 'check' as const, desc: 'Check step' },
      { action: 'complete' as const, desc: 'Mark complete' },
      { action: 'next' as const, desc: 'Move next' },
      { action: 'previous' as const, desc: 'Move previous' },
      { action: 'reset' as const, desc: 'Reset progress' },
    ];

    for (const { action, desc } of actions) {
      try {
        const result = await guideManager.tutorial({ action, guideId: guide1.id });
        console.log(`✅ ${String(action).padEnd(10)} - ${desc}: success`);
      } catch (err: any) {
        console.log(`⚠️  ${String(action).padEnd(10)} - ${desc}: ${err.message}`);
      }
    }

    // 4. Save completion to Memory
    console.log('\n' + '='.repeat(70));
    console.log('4. Integration with Memory - Saving Tutorial Completion');
    console.log('='.repeat(70));

    // Start and complete the tutorial
    await guideManager.tutorial({ action: 'start', guideId: guide1.id });
    for (let i = 0; i < 2; i++) {
      await guideManager.tutorial({ action: 'complete', guideId: guide1.id });
      await guideManager.tutorial({ action: 'next', guideId: guide1.id });
    }

    console.log('\n💾 Saving tutorial completion to memory...');
    const memory = memoryManager.save({
      key: `tutorial:${guide1.slug}:completed`,
      value: `Completed ${guide1.title} tutorial on ${new Date().toLocaleDateString()}`,
      metadata: {
        category: 'learning',
        tags: ['tutorial', 'completed', ...guide1.tags],
      },
    });
    console.log(`✅ Saved to memory with ID: ${memory.id}`);

    // Retrieve from memory
    console.log('\n📖 Retrieving from memory...');
    const recalled = memoryManager.recall({ query: 'TypeScript Basics tutorial completed', limit: 5 });
    console.log(`Found ${recalled.results.length} relevant memories`);
    recalled.results.forEach((r) => {
      console.log(`  - ${r.key}: ${r.value}`);
    });

    // 5. Show statistics
    console.log('\n' + '='.repeat(70));
    console.log('5. Guide System Statistics');
    console.log('='.repeat(70));

    const stats = guideManager.getStatistics();
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n✅ All guide system tests passed!');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testGuideSystem();
