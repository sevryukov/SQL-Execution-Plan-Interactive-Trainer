# Nested Loop Join

A **Nested Loop Join** compares each row from an outer input with matching rows from an inner input.

## When it is efficient

- The outer input is small.
- The inner input has a supporting index.
- The optimizer expects few matching rows.

## Typical execution pattern

1. Read one row from the outer source.
2. Probe the inner source using a predicate (often index seek).
3. Emit matched rows and continue.

> In execution plans, Nested Loop is often chosen for OLTP-style selective queries.
