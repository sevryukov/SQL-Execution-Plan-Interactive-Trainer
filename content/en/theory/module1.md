# Nested Loop Join

A **Nested Loop Join** compares each row from an outer input with matching rows from an inner input.

## Intuition with plan flow (ASCII)

```text
Outer Input (filtered Orders)
            |
            v
      +----------------+
      |  NESTED LOOP   |----> Output rows
      +----------------+
            ^
            |
Inner Input probe by key (Index Seek on OrderItems.OrderID)
```

## Table sketch

```text
Orders
+---------+------------+
|OrderID  |CustomerID  |
+---------+------------+
|10248    |VINET       |
|10249    |TOMSP       |
+---------+------------+

OrderItems
+---------+---------+----------+
|OrderID  |LineNo   |ProductID |
+---------+---------+----------+
|10248    |1        |11        |
|10248    |2        |42        |
|10249    |1        |72        |
+---------+---------+----------+
```

## When it is efficient

- The outer input is small.
- The inner input has a supporting index.
- The optimizer expects few matching rows.

## Typical execution pattern

1. Read one row from the outer source.
2. Probe the inner source using a predicate (often index seek).
3. Emit matched rows and continue.

> In execution plans, Nested Loop is often chosen for OLTP-style selective queries.
