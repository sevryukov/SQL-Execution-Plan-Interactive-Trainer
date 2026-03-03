# Index Seek vs Table Scan

A **Table Scan** reads most or all rows in a table. An **Index Seek** navigates directly to relevant rows.

## Visual difference (ASCII)

```text
TABLE SCAN
+----+----+----+----+----+
| r1 | r2 | r3 | r4 | r5 |
+----+----+----+----+----+
  ^    ^    ^    ^    ^
reads almost everything

INDEX SEEK
B-Tree -> [key=2024-01] -> [RID 145, RID 146]
                    |
                    v
                fetch only needed rows
```

## Optimizer trade-off

- If predicate selectivity is low (many rows match), scan can be cheaper.
- If selectivity is high (few rows match), seek is usually better.
- Missing or non-sargable predicates can force scans.

Keep statistics updated so the optimizer can estimate row counts correctly.
