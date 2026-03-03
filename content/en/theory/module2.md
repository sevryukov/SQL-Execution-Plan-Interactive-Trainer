# Index Seek vs Table Scan

A **Table Scan** reads most or all rows in a table. An **Index Seek** navigates directly to relevant rows.

## Optimizer trade-off

- If predicate selectivity is low (many rows match), scan can be cheaper.
- If selectivity is high (few rows match), seek is usually better.
- Missing or non-sargable predicates can force scans.

Keep statistics updated so the optimizer can estimate row counts correctly.
