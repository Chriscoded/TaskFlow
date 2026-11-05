# TaskFlow — Week 3 Performance Notes

## 1. Overview

This document records the database performance investigation and API reliability improvements carried out during Week 3.

**Technology stack**
- Backend: Laravel / PHP
- Database: MariaDB 10.4.32
- Frontend: React and TypeScript
- Query investigation: MariaDB `EXPLAIN`

The purpose of the investigation was to understand how the task listing endpoint interacts with the database, identify possible indexing or query inefficiencies, and make evidence-based decisions about optimization.

No performance improvement is claimed unless supported by an observed result.

---

## 2. Areas Investigated

The following areas were reviewed:

1. Task listing and database query behaviour.
2. Filtering by status and priority.
3. Pagination and page-size limits.
4. Sorting by creation date, due date and priority.
5. Search functionality.
6. Database indexes.
7. Potential N+1 query problems.
8. API response structure and ownership-based query scoping.

---

## 3. Database Query Investigation

The database was running:

**MariaDB 10.4.32**

Two representative queries were investigated using `EXPLAIN`.

### 3.1 Default task listing

Query:

```sql
EXPLAIN
SELECT *
FROM tasks
WHERE user_id = ?
ORDER BY created_at DESC, id DESC
LIMIT 10 OFFSET 0;
```

Observed execution plan:

| Property | Observed value |
|---|---|
| Table | tasks |
| Access type | index |
| Possible keys | tasks_user_id_foreign |
| Selected key | tasks_created_at_index |
| Estimated rows | 3 |
| Extra | Using where |

**Analysis**

MariaDB selected the `created_at` index to support the ordering operation.

The `user_id` condition is applied as a filter. The execution plan indicates that the database is using an existing index for ordering rather than performing an unrestricted table scan.

However, this plan does not establish that the query is optimal for a larger dataset. It also does not demonstrate a measurable reduction in execution time.

### 3.2 Task listing with status and priority filters

Query:

```sql
EXPLAIN
SELECT *
FROM tasks
WHERE user_id = ?
  AND status = ?
  AND priority = ?
ORDER BY created_at DESC, id DESC
LIMIT 10 OFFSET 0;
```

Parameters used:

```text
user_id = 1
status = todo
priority = high
```

Observed execution plan:

| Property | Observed value |
|---|---|
| Table | tasks |
| Access type | ref |
| Possible keys | tasks_status_priority_index, tasks_user_id_foreign |
| Selected key | tasks_status_priority_index |
| Key length | 124 |
| Estimated rows | 1 |
| Extra | Using index condition; Using where; Using filesort |

**Analysis**

MariaDB selected the composite `status_priority` index when filtering by both status and priority.

The estimated number of matching rows was one.

The execution plan also reports `Using filesort`, meaning MariaDB performs an additional sorting operation to satisfy the requested ordering by `created_at` and `id`.

Filesort does not necessarily mean that the query is slow. It is an execution-plan detail that should be evaluated against realistic data volumes and actual query timings.

No conclusion was made that this operation requires another index.

---

## 4. Existing Database Indexes

The original task migration defines:

```php
$table->index(['status', 'priority']);
$table->index('created_at');
```

The task ownership migration defines a foreign key on `user_id`:

```php
$table->foreignId('user_id')
    ->nullable()
    ->after('id')
    ->constrained('users')
    ->cascadeOnDelete();
```

The query plan also identifies `tasks_user_id_foreign` as a possible key.

The investigated indexes therefore include:

| Index | Purpose |
|---|---|
| status, priority | Supports combined status and priority filtering |
| created_at | Supports creation-date ordering |
| user_id foreign-key index | Supports task ownership relationships and filtering |

There is no explicitly declared `due_date` index in the reviewed task migration.

**Verification limitation:** The complete live index inventory from `SHOW INDEX FROM tasks` was not available during preparation of this document. The index descriptions above are based on the migration definitions and the indexes reported by the observed execution plans. They should not be interpreted as a complete independently verified index inventory.

---

## 5. API Query Improvements

The task listing endpoint supports:

- Filtering by status.
- Filtering by priority.
- Searching task titles and descriptions.
- Filtering by due-date range using `date_from` and `date_to`.
- Sorting by creation date, due date and priority.
- Configurable pagination.

### Pagination

The API uses database-level Laravel pagination rather than loading all tasks into application memory.

Supported behaviour:

- Default page size: 10.
- Maximum page size: 50.
- Client-selectable page size.
- Pagination metadata, including current page, last page, page size and total records.

Example:

```http
GET /api/tasks?page=1&per_page=10
```

This limits the records returned for a page. It does not eliminate the cost of counting matching records, which Laravel's standard `paginate()` performs to provide pagination metadata.

### Date-range filtering

The endpoint supports inclusive due-date filtering:

```http
GET /api/tasks?date_from=2026-11-01&date_to=2026-11-10
```

The backend applies the corresponding date conditions to `due_date`.

The endpoint also supports either boundary independently.

The API validates date formats and rejects a range where the start date is later than the end date.

### Sorting

Supported sort columns are explicitly allowlisted:

- `created_at`
- `due_date`
- `priority`

Sort direction is restricted to:

- `asc`
- `desc`

This prevents arbitrary client-supplied column names or sort directions from being passed directly into the query.

---

## 6. N+1 Query Investigation

The task resource currently returns scalar task fields, including:

- ID
- Title
- Description
- Status
- Priority
- Due date
- Creation timestamp
- Update timestamp

The reviewed resource does not access related models or relationship properties.

The task listing query is also scoped through the authenticated user's tasks relationship.

Based on the reviewed implementation, there is no obvious relationship-driven N+1 query in the task listing response.

This is a code inspection finding, not a result from a dedicated query-count benchmark.

If related information such as comments, attachments or assigned users is added to task responses in the future, relationship loading should be reviewed and eager loading introduced where appropriate.

---

## 7. Potential Performance Considerations

The investigation identified areas that may deserve attention as the application grows.

### Search

If search uses leading-wildcard conditions such as:

```sql
WHERE title LIKE '%keyword%'
```

a conventional B-tree index generally cannot efficiently seek to matching values using that pattern.

For larger datasets, full-text search or another search strategy may need to be considered.

No full-text search implementation was introduced during this investigation.

### Sorting

The combined filtering execution plan reported `Using filesort`.

A composite index combining ownership, filtering columns and ordering columns could be investigated in a future optimization exercise.

However, an additional index should only be introduced after testing its effect on representative queries and datasets.

### Due-date filtering

The reviewed migration does not explicitly define a standalone index on `due_date`.

A due-date index may be worth evaluating if due-date filtering becomes frequent and selective on a larger dataset.

No such index was added because the available evidence did not establish that it was necessary.

### Pagination

Standard offset pagination can become more expensive at high page numbers.

If the application eventually needs to navigate very large datasets, cursor pagination may be considered. This would involve evaluating its compatibility with the required sorting and filtering behaviour.

---

## 8. Optimization Decisions

The following decisions were made based on the available evidence:

| Area | Decision | Reason |
|---|---|---|
| Status and priority filtering | Retain existing composite index | MariaDB selected it in the observed execution plan |
| Default creation-date ordering | Retain existing index | MariaDB selected the creation-date index |
| Additional ownership/sorting index | Not added | Insufficient evidence to justify another index |
| Due-date index | Not added | No measured bottleneck established |
| N+1 optimization | No change required based on reviewed resource | No relationship access identified |
| Pagination | Retain database-level pagination | Avoids loading the entire task collection |
| Sorting | Retain allowlisted sorting | Supports required sorting while restricting accepted fields |

Indexes have costs: they consume storage and add maintenance work during inserts, updates and deletes. Adding indexes without a demonstrated query benefit can make the overall system less efficient.

---

## 9. Measurement and Evidence Limitations

The investigation used MariaDB `EXPLAIN` to inspect query execution plans.

The following evidence was not collected:

- Before-and-after endpoint response times.
- A controlled benchmark using a large representative task dataset.
- Database CPU and memory measurements.
- Query-count measurements across a complete HTTP request.
- A complete live index inventory from `SHOW INDEX FROM tasks`.

The estimated row counts shown by `EXPLAIN` are optimizer estimates, not benchmark measurements or proof of actual production-scale performance.

Consequently, this investigation establishes which indexes MariaDB selected for the tested query plans, but it does not establish a quantified improvement in response time.

---

## 10. Conclusion

The Week 3 investigation confirmed that MariaDB uses existing indexes for the examined task listing queries.

The composite status/priority index was selected for combined filtering, while the creation-date index was selected for the default listing order.

An additional sorting operation was observed for the combined filtering query. This was documented rather than treated as an automatic reason to add another index.

The API was also extended to support controlled pagination, filtering, date ranges and allowlisted sorting.

No speculative indexes were added, and no unmeasured performance gains are claimed.

Further optimization should be based on representative data, actual query timings, query-count analysis and a complete review of the live database indexes.
