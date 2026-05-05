# Hash Join

A **Hash Join** builds a hash table on one input (build) and probes the other input (probe) to find matches.

## Intuition with plan flow (ASCII)

```text
Build Input (usually smaller set)
           |
           v
     +-----------+
     |  BUILD    |----> Hash table in memory
     +-----------+
           ^
           |
Probe Input (larger set)
           |
           v
     +-----------+
     |   PROBE   |----> Output rows
     +-----------+
```

## Table sketch

```text
Customers
+----------+------------+
|CustomerID|City        |
+----------+------------+
|VINET     |Reims       |
|TOMSP     |München     |
|HANAR     |São Paulo   |
+----------+------------+

Orders
+---------+------------+
|OrderID  |CustomerID  |
+---------+------------+
|10248    |VINET       |
|10249    |TOMSP       |
|10250    |HANAR       |
+---------+------------+
```

## When it is efficient

- One input fits in memory.
- No useful indexes exist for the join.
- Large datasets without selective predicates.
- Equi-join condition is required.

## Typical execution pattern

1. **Build phase**: Read the smaller table and build a hash table on the join key.
2. **Probe phase**: Read the larger table, compute hash values, and find matches.
3. Emit matched row pairs as output.

## Advantages over Nested Loop

- Scales better on large datasets.
- Does not require indexes on join columns.
- Effective when selectivity is low.

> The optimizer chooses Hash Join for large joins without suitable indexes.
