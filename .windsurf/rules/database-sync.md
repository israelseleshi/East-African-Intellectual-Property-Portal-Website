---
description: How to synchronize the local tables.md with the live database schema and data
trigger: always_on
---

# Database Synchronization Rule

To ensure the `tables.md` file always reflects the current state of the live database (schema and rows), follow these instructions:

## **Update Command**
Run the following command from the project root:
```bash
node server/generate_tables.js
```

## **When to Run**
- Before starting any task involving database schema changes.
- After performing manual database operations via SSH or cPanel.
- When the AI assistant needs the most up-to-date data for context.

## **Implementation Details**
The script `server/generate_tables.js` connects to `eastafricanip.com` using the `falolega_admin` user to:
1. Fetch all table names (excluding `notifications` and `reports`).
2. Generate an ER Diagram using Mermaid syntax.
3. Extract `SHOW CREATE TABLE` for accurate SQL schemas.
4. Export all current rows into Markdown tables.
