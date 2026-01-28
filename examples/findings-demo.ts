/**
 * Findings Manager Demo
 *
 * Demonstrates the findings.md concept from planning-with-files:
 * - Track decisions, discoveries, blockers, research, and questions
 * - Link findings to TODOs for context
 * - Export as structured markdown
 */

import { PlanningManager } from '../src/features/planning/planning-manager.js';
import * as fs from 'fs';

async function demo() {
  console.log('=== Findings Manager Demo ===\n');

  // Create manager with file-based database
  const dbPath = '/tmp/findings-demo.db';
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  const manager = new PlanningManager(dbPath);

  // Create a TODO
  console.log('1. Creating TODO...');
  const todoResult = manager.create({
    content: 'Implement user authentication',
    tags: ['backend', 'security'],
    status: 'in_progress',
  });
  console.log(`   Created TODO: ${todoResult.todo.id}`);

  // Record a decision
  console.log('\n2. Recording findings...');
  const decision = manager.addFinding({
    type: 'decision',
    content: 'Use JWT tokens with 15-minute expiry for authentication',
    context: 'After evaluating session cookies vs JWT, chose JWT for stateless architecture and better scalability',
    relatedTodoId: todoResult.todo.id,
    tags: ['architecture', 'security'],
  });
  console.log(`   ✓ Decision recorded: ${decision.finding.id}`);

  // Record a discovery
  const discovery = manager.addFinding({
    type: 'discovery',
    content: 'Found bcrypt is 10x slower than argon2 for password hashing',
    context: 'Benchmark showed argon2 processes 1000 passwords/sec vs bcrypt at 100/sec',
    tags: ['performance', 'security'],
  });
  console.log(`   ✓ Discovery recorded: ${discovery.finding.id}`);

  // Record a blocker
  const blocker = manager.addFinding({
    type: 'blocker',
    content: 'Waiting for OAuth provider credentials from client',
    context: 'Need Google OAuth client ID and secret to complete social login integration',
    relatedTodoId: todoResult.todo.id,
    tags: ['external-dependency'],
  });
  console.log(`   ✓ Blocker recorded: ${blocker.finding.id}`);

  // Record research
  const research = manager.addFinding({
    type: 'research',
    content: 'Evaluated Passport.js vs custom JWT implementation',
    context: `Pros: Passport has many strategies, well-tested
Cons: Heavy dependency, adds 50KB to bundle
Decision: Use lightweight jose library instead`,
    tags: ['architecture'],
  });
  console.log(`   ✓ Research recorded: ${research.finding.id}`);

  // Record a question
  const question = manager.addFinding({
    type: 'question',
    content: 'Should we implement refresh token rotation?',
    context: 'Security best practice but adds complexity. Need to decide based on threat model.',
    tags: ['security', 'needs-decision'],
  });
  console.log(`   ✓ Question recorded: ${question.finding.id}`);

  // List findings by type
  console.log('\n3. Filtering findings...');
  const decisions = manager.listFindings({ type: 'decision' });
  console.log(`   Found ${decisions.length} decision(s)`);

  const securityFindings = manager.listFindings({ tags: ['security'] });
  console.log(`   Found ${securityFindings.length} security-related finding(s)`);

  const todoFindings = manager.listFindings({ relatedTodoId: todoResult.todo.id });
  console.log(`   Found ${todoFindings.length} finding(s) linked to TODO`);

  // Get grouped findings
  console.log('\n4. Grouping findings by type...');
  const grouped = manager.getFindingsGrouped();
  console.log(`   Decisions: ${grouped.decisions.length}`);
  console.log(`   Discoveries: ${grouped.discoveries.length}`);
  console.log(`   Blockers: ${grouped.blockers.length}`);
  console.log(`   Research: ${grouped.research.length}`);
  console.log(`   Questions: ${grouped.questions.length}`);

  // Export to markdown
  console.log('\n5. Exporting to markdown...');
  const markdownResult = manager.exportFindings({ includeContext: true });
  console.log('\n--- findings.md preview ---');
  console.log(markdownResult.markdown);
  console.log('--- end preview ---\n');

  // Save to file
  const outputPath = '/tmp/findings-demo.md';
  fs.writeFileSync(outputPath, markdownResult.markdown);
  console.log(`✓ Markdown exported to: ${outputPath}`);

  // Complete TODO with finding
  console.log('\n6. Completing TODO with finding...');
  const completed = manager.completeTodoWithFinding(
    todoResult.todo.id,
    'discovery',
    'JWT implementation complete - using jose library for compact, secure tokens'
  );
  console.log(`   ✓ TODO completed: ${completed.todo?.status}`);
  if (completed.finding) {
    console.log(`   ✓ Completion finding recorded: ${completed.finding.id}`);
  }

  // Statistics
  console.log('\n7. Statistics...');
  const stats = manager.getStatistics();
  console.log(`   Total TODOs: ${stats.store.totalTodos}`);
  console.log(`   Total Findings: ${stats.findings.totalFindings}`);
  console.log(`   Linked to TODOs: ${stats.findings.linkedToTodos}`);

  // Cleanup
  manager.close();
  console.log('\n=== Demo Complete ===');
}

demo().catch(console.error);
