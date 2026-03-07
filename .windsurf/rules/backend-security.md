---
description: Critical security and data integrity standards for the TPMS backend
---

# Backend Security & Data Integrity

Enforce these rules for all server-side changes:

- **Authentication**: All routes (except `/api/auth/login`) MUST use the `authenticateToken` middleware.
- **Query Safety**: Use parameterized queries with `pool.execute()` to prevent SQL injection. Never concatenate strings into SQL.
- **Transaction Management**: For operations affecting multiple tables (e.g., updating a case and creating a history record), always use `connection.beginTransaction()`, `commit()`, and `rollback()` in a `try-catch-finally` block.
- **Input Validation**: Validate `caseId` (UUID) and `jurisdiction` (2-letter code) format before database operations.
- **Error Handling**: Use descriptive error messages but avoid leaking sensitive database schema details to the client.
