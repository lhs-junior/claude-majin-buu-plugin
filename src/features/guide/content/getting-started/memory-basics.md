---
id: memory-basics
title: Memory System Basics
category: getting-started
difficulty: beginner
estimatedTime: 15
tags:
  - memory
  - search
  - storage
  - semantic-search
relatedTools:
  - memory_save
  - memory_recall
  - memory_list
  - memory_forget
  - memory_search
prerequisites:
  - getting-started-index
version: "0.4.0"
---

# Memory System Basics

The Memory System is your project's persistent knowledge store. It uses BM25 semantic search to help you retrieve relevant information, design decisions, and project context whenever you need it.

## Core Concepts

### What is Memory?
Memory stores structured information about your project with semantic indexing. Unlike simple file storage, memory entries are tagged, timestamped, and searchable by meaning rather than just keywords.

### When to Use Memory
- Document architectural decisions
- Store design patterns used in your project
- Keep track of API specifications
- Maintain project conventions and standards
- Record lessons learned and troubleshooting steps
- Store external dependencies and their versions

## Core Operations

### 1. memory_save - Store Information
Save information with semantic tags for later retrieval.

```
memory_save(
  key: "database-schema",
  content: "Users table has id, email, created_at. Posts table has id, user_id, content, created_at",
  tags: ["database", "schema", "users", "posts"],
  metadata: { importance: "high" }
)
```

**Parameters:**
- `key`: Unique identifier for the memory entry
- `content`: The information to store
- `tags`: Array of searchable tags
- `metadata`: Optional custom metadata

### 2. memory_recall - Retrieve Specific Entry
Get a specific memory entry by its key.

```
memory_recall(
  key: "database-schema"
)
```

Returns the exact content stored with that key, plus metadata and creation timestamp.

### 3. memory_list - View All Entries
See all stored memories organized by tag.

```
memory_list(
  tag: "database",
  limit: 20
)
```

### 4. memory_search - Semantic Search
Find memories by meaning, not just exact keywords. Uses BM25 algorithm.

```
memory_search(
  query: "How should I structure user authentication?",
  tags: ["security", "auth"],
  topK: 5
)
```

Returns the 5 most relevant memory entries based on semantic similarity.

### 5. memory_forget - Delete Entry
Remove outdated or incorrect memory entries.

```
memory_forget(
  key: "old-api-spec"
)
```

## BM25 Semantic Search Explained

BM25 is a probabilistic ranking function that scores document relevance. It considers:

- **Term Frequency** - How often a term appears in the document
- **Inverse Document Frequency** - How rare the term is across all documents
- **Document Length** - Normalization for document size

This means searches understand context better than simple keyword matching.

### Search Examples

**Query:** "What authentication mechanism are we using?"
- Best matches: Entries about auth, OAuth, JWT, session management

**Query:** "Database connection settings"
- Best matches: Entries about DB config, connection strings, database setup

## Practical Workflow

### Scenario: Building a Payment Feature

**Step 1: Save Design Decision**
```
memory_save(
  key: "payment-provider-choice",
  content: "Chose Stripe for payment processing. Supports subscription billing, webhooks, and multi-currency. Invoice generation automated.",
  tags: ["payment", "architecture", "external-service"]
)
```

**Step 2: Save API Integration Notes**
```
memory_save(
  key: "stripe-integration",
  content: "Stripe API key in .env. Use stripe-python library v9.0+. Webhook endpoint at /api/webhooks/stripe. Handle payment.success and payment.failed events.",
  tags: ["payment", "integration", "setup"]
)
```

**Step 3: Later, Search for Payment Context**
```
memory_search(
  query: "How do we handle payment webhooks?"
)
```

Returns both saved entries with relevance scores.

**Step 4: Update When Things Change**
```
memory_save(
  key: "payment-provider-choice",
  content: "Upgraded to Stripe v10.0. Now using Financial Connections for ACH transfers. Added revenue recognition module.",
  tags: ["payment", "architecture", "external-service", "upgraded"]
)
```

## Best Practices

1. **Use Consistent Keys** - Use kebab-case for keys: `payment-webhook-setup`
2. **Tag Systematically** - Tags should be broad categories: `database`, `auth`, `api`
3. **Keep Content Focused** - One concept per entry, 2-5 sentences ideal
4. **Update Regularly** - Keep memories fresh as requirements change
5. **Search Before Saving** - Avoid duplicate entries by searching first
6. **Use Metadata** - Mark importance levels: `{ importance: "critical" }`

## Example: Complete Memory Management

```
# Save project architecture decision
memory_save(
  key: "microservices-vs-monolith",
  content: "Chose microservices architecture. User service, Product service, Order service, Payment service. Communication via REST APIs. Shared postgres DB initially, planning DB per service.",
  tags: ["architecture", "microservices", "design-decision"]
)

# Later, recall the decision
memory_recall(key: "microservices-vs-monolith")

# Search for related entries
memory_search(query: "How are services communicating?")

# List all architecture decisions
memory_list(tag: "architecture")

# Forget outdated information
memory_forget(key: "monolith-design-proposal")
```

## Next Steps

- Explore [Memory + Agent Integration](/guides/tutorials/memory-agent-integration)
- See how to combine memory with other systems
- Read the [Tool Index](/guides/reference/tool-index) for all memory operations
