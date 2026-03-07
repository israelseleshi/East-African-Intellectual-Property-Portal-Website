---
description: Workflow automation and case status transitions
---

# Workflow Automation & Status Transitions

Manage the complex Trademark lifecycle accurately:

- **State Machine**: Adhere strictly to the path: `Intake` -> `Formal Exam` -> `Substantive Exam` -> `Publication` -> `Registration` -> `Renewal`.
- **Automatic Transitions**:
  - When `filing_date` is set, status should automatically move to `FILED`.
  - When `publication_date` is set, status moves to `PUBLISHED` and triggers the Opposition Window calculation.
- **Case History**: Every status change MUST be recorded in the `case_history` table with the user ID, timestamp, and optional note.
- **Required Data**: Block transitions if required data for the next stage is missing (e.g., `filing_number` required for `FILED` status).
