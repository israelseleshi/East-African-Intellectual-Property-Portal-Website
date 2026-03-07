# TPMS Enhancement Implementation Plan

## Overview
Implementing 6 new features to enhance the Trademark Practice Management System:
1. Fee Schedule Database Table
2. Opposition/Conflict Tracking
3. Email/Notification Log
4. Case Notes (Separate from History)
5. Jurisdiction Configuration
6. Soft Deletes

---

## 1. FEE_SCHEDULES Table

### Purpose
Replace hardcoded FEE_SCHEDULE constant with database-driven fee management supporting jurisdiction-specific, stage-based fees with historical tracking.

### Database Schema
```sql
CREATE TABLE fee_schedules (
    id UUID PRIMARY KEY DEFAULT UUID(),
    jurisdiction VARCHAR(10) NOT NULL, -- 'ET', 'KE', 'EAC', 'ARIPO', 'WIPO'
    stage VARCHAR(50) NOT NULL, -- 'FILING', 'FORMAL_EXAM', 'SUBSTANTIVE_EXAM', 'PUBLICATION', 'REGISTRATION', 'RENEWAL'
    category VARCHAR(20) NOT NULL, -- 'OFFICIAL_FEE', 'PROFESSIONAL_FEE', 'DISBURSEMENT'
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD', -- 'USD', 'ETB', 'KES'
    effective_date DATE NOT NULL,
    expiry_date DATE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by UUID,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_fee_version (jurisdiction, stage, category, effective_date)
);
```

### API Endpoints
- `GET /api/fees` - List all fee schedules with filters (jurisdiction, stage, active)
- `GET /api/fees/:jurisdiction/:stage` - Get specific fee for a jurisdiction/stage
- `POST /api/fees` - Create new fee schedule (admin only)
- `PATCH /api/fees/:id` - Update fee schedule (admin only)
- `DELETE /api/fees/:id` - Soft delete fee schedule (admin only)
- `GET /api/fees/calculate/:caseId` - Calculate total fees for a case based on current stage

### Backend Implementation
- Create `apps/api/src/routes/fees.ts`
- Update invoice auto-generation to query fee_schedules instead of using constants
- Add fee calculation utility `apps/api/src/utils/fees.ts`
- Update constants file to reference database instead of hardcoded values

### Frontend Implementation
- **Fee Management Page**: `apps/web/src/pages/FeesPage.tsx`
  - Table view of all fee schedules
  - CRUD operations for admin users
  - Filter by jurisdiction and stage
- **Case Fee Calculator**: Component in case detail page
  - Show estimated fees based on case jurisdiction and current stage
  - Display fee breakdown (official vs professional)
- **Invoice Integration**: Update invoice generation UI
  - Auto-populate line items based on fee schedules
  - Show fee history/changes

---

## 2. OPPOSITIONS Table

### Purpose
Track third-party oppositions against client trademark applications with deadline management and response workflow.

### Database Schema
```sql
CREATE TABLE oppositions (
    id UUID PRIMARY KEY DEFAULT UUID(),
    case_id UUID NOT NULL,
    opponent_name VARCHAR(255) NOT NULL,
    opponent_address TEXT,
    opponent_representative VARCHAR(255),
    grounds TEXT NOT NULL, -- Legal grounds for opposition
    opposition_date DATE NOT NULL,
    deadline_date DATE NOT NULL, -- Response deadline (60d ET, 90d KE)
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'RESPONDED', 'WITHDRAWN', 'RESOLVED'
    response_filed_date DATE,
    response_document_path VARCHAR(500),
    outcome VARCHAR(50), -- 'UPHELD', 'DISMISSED', 'SETTLED', 'PENDING_DECISION'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by UUID,
    FOREIGN KEY (case_id) REFERENCES trademark_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### API Endpoints
- `GET /api/oppositions` - List all oppositions (with case filter)
- `GET /api/oppositions/:id` - Get single opposition details
- `GET /api/cases/:caseId/oppositions` - Get oppositions for specific case
- `POST /api/oppositions` - Create new opposition
- `PATCH /api/oppositions/:id` - Update opposition details
- `PATCH /api/oppositions/:id/status` - Update opposition status
- `DELETE /api/oppositions/:id` - Remove opposition record
- `GET /api/oppositions/pending` - List pending oppositions with approaching deadlines

### Backend Implementation
- Create `apps/api/src/routes/oppositions.ts`
- Add opposition deadline calculation based on jurisdiction rules
- Integrate with deadlines table for automatic deadline creation
- Update case details endpoint to include related oppositions

### Frontend Implementation
- **Oppositions List Page**: `apps/web/src/pages/OppositionsPage.tsx`
  - Kanban or table view of all oppositions
  - Status-based filtering
  - Deadline warnings
- **Case Opposition Tab**: Add to case detail page
  - List oppositions against this specific case
  - Quick add opposition form
  - Upload response documents
- **Opposition Form Component**: `apps/web/src/components/OppositionForm.tsx`
  - Opponent details
  - Grounds for opposition
  - Automatic deadline calculation based on jurisdiction
- **Dashboard Widget**: Show pending oppositions count

---

## 3. NOTIFICATIONS Table

### Purpose
Track all system notifications, emails, and automated reminders with delivery status and retry logic.

### Database Schema
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT UUID(),
    recipient_type VARCHAR(20) NOT NULL, -- 'USER', 'CLIENT'
    recipient_id UUID NOT NULL,
    case_id UUID, -- Optional: related case
    type VARCHAR(50) NOT NULL, -- 'DEADLINE_REMINDER', 'STATUS_CHANGE', 'INVOICE_DUE', 'OPPOSITION_ALERT'
    channel VARCHAR(20) NOT NULL, -- 'EMAIL', 'SMS', 'IN_APP'
    subject VARCHAR(255),
    content TEXT,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ'
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    metadata JSON, -- Store template variables, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES trademark_cases(id) ON DELETE SET NULL,
    INDEX idx_recipient (recipient_type, recipient_id),
    INDEX idx_status (status),
    INDEX idx_case (case_id)
);
```

### API Endpoints
- `GET /api/notifications` - List notifications for current user
- `GET /api/notifications/unread` - Get unread notification count
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification
- `GET /api/admin/notifications` - Admin view of all notifications (with filters)
- `POST /api/admin/notifications/test` - Send test notification

### Backend Implementation
- Create `apps/api/src/routes/notifications.ts`
- Create notification service `apps/api/src/services/notifications.ts`
- Integrate with deadline calculations to auto-create notifications
- Add email/SMS sending with retry logic
- Update existing status change handlers to create notifications

### Frontend Implementation
- **Notification Bell Component**: `apps/web/src/components/NotificationBell.tsx`
  - Dropdown showing recent notifications
  - Unread count badge
  - Mark as read functionality
- **Notifications Page**: `apps/web/src/pages/NotificationsPage.tsx`
  - Full notification history
  - Filter by type and status
  - Pagination
- **Notification Settings**: `apps/web/src/pages/NotificationSettings.tsx`
  - User preferences for notification channels
  - Enable/disable specific notification types
- **Real-time Updates**: WebSocket or polling for new notifications

---

## 4. CASE_NOTES Table

### Purpose
Separate unstructured user notes from structured case_history audit trail for better organization.

### Database Schema
```sql
CREATE TABLE case_notes (
    id UUID PRIMARY KEY DEFAULT UUID(),
    case_id UUID NOT NULL,
    user_id UUID,
    note_type VARCHAR(30) DEFAULT 'GENERAL', -- 'GENERAL', 'CLIENT_COMMUNICATION', 'PHONE_CALL', 'INTERNAL', 'STRATEGY'
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE, -- Internal notes not visible to client portal
    is_pinned BOOLEAN DEFAULT FALSE, -- Pin important notes to top
    parent_note_id UUID, -- For threaded replies
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES trademark_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_note_id) REFERENCES case_notes(id) ON DELETE CASCADE,
    INDEX idx_case_created (case_id, created_at)
);
```

### API Endpoints
- `GET /api/cases/:caseId/notes` - Get all notes for a case
- `POST /api/cases/:caseId/notes` - Add new note
- `PATCH /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `PATCH /api/notes/:id/pin` - Toggle pin status
- `POST /api/notes/:id/reply` - Add reply to note (threading)

### Backend Implementation
- Create `apps/api/src/routes/notes.ts`
- Update case details endpoint to include notes (separate from history)
- Add note_type validation
- Handle threaded replies with parent_note_id

### Frontend Implementation
- **Case Notes Tab**: `apps/web/src/components/CaseNotesTab.tsx`
  - Display notes with type badges
  - Pinned notes at top
  - Threaded conversation view
  - Rich text editor for note content
- **Note Form**: Add/Edit with note type selector
- **Quick Note Widget**: Dashboard widget for quick case notes
- **Notes Filter**: Filter by type (calls, internal, client communication)

---

## 5. JURISDICTIONS Table

### Purpose
Replace jurisdiction enum with comprehensive configuration table storing country-specific trademark rules.

### Database Schema
```sql
CREATE TABLE jurisdictions (
    code VARCHAR(10) PRIMARY KEY, -- 'ET', 'KE', 'EAC', 'ARIPO', 'WIPO', 'US', 'EU'
    name VARCHAR(100) NOT NULL,
    country_code VARCHAR(2), -- ISO 3166-1 alpha-2
    opposition_period_days INT NOT NULL, -- 60 for ET, 90 for KE
    renewal_period_years INT NOT NULL, -- 7 for ET, 10 for others
    grace_period_months INT, -- Late renewal grace period
    currency_code VARCHAR(3) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    requires_power_of_attorney BOOLEAN DEFAULT TRUE,
    requires_notarization BOOLEAN DEFAULT FALSE,
    multi_class_filing_allowed BOOLEAN DEFAULT TRUE,
    rules_summary TEXT, -- Summary of local trademark rules
    official_language VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Seed data
INSERT INTO jurisdictions (code, name, country_code, opposition_period_days, renewal_period_years, currency_code, rules_summary) VALUES
('ET', 'Ethiopia', 'ET', 60, 7, 'ETB', 'Local filing only. 60-day opposition window. 7-year renewal. Requires Power of Attorney.'),
('KE', 'Kenya', 'KE', 60, 10, 'KES', 'KIPO registration. 60-day opposition window. 10-year renewal.'),
('EAC', 'East African Community', NULL, 60, 10, 'USD', 'Regional registration covering 7 countries.'),
('ARIPO', 'African Regional IP Office', NULL, 60, 10, 'USD', 'Regional registration for 20 member states.'),
('WIPO', 'Madrid Protocol', NULL, 60, 10, 'USD', 'International registration via Madrid System.');
```

### API Endpoints
- `GET /api/jurisdictions` - List all jurisdictions
- `GET /api/jurisdictions/:code` - Get specific jurisdiction details
- `GET /api/jurisdictions/active` - List only active jurisdictions
- `POST /api/admin/jurisdictions` - Add new jurisdiction (admin)
- `PATCH /api/admin/jurisdictions/:code` - Update jurisdiction (admin)

### Backend Implementation
- Create `apps/api/src/routes/jurisdictions.ts`
- Update deadline calculation utilities to query jurisdictions table
- Replace hardcoded jurisdiction values with database lookups
- Update case creation/editing to validate jurisdiction codes

### Frontend Implementation
- **Jurisdiction Selector**: Update all dropdowns to fetch from API
- **Jurisdiction Info Card**: Show rules summary when jurisdiction selected
- **Jurisdiction Settings Page**: Admin interface for managing jurisdictions
- **Auto-calculate Deadlines**: Use jurisdiction rules to auto-populate deadlines

---

## 6. Soft Deletes (All Tables)

### Purpose
Add `deleted_at` timestamp to all tables for soft deletion instead of hard DELETE, enabling data recovery and audit trails.

### Database Schema Changes
Add to ALL existing tables:
```sql
-- Add to each table
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE trademark_cases ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE case_history ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE deadlines ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE invoice_items ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE nice_class_mappings ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE mark_assets ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
-- Add to new tables too
ALTER TABLE fee_schedules ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE oppositions ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE notifications ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE case_notes ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
```

### API Changes
- Update ALL `DELETE` endpoints to set `deleted_at = NOW()` instead of `DELETE FROM`
- Update ALL `GET` endpoints to filter `WHERE deleted_at IS NULL`
- Add `GET /api/:resource/trashed` - List soft-deleted items (admin)
- Add `POST /api/:resource/:id/restore` - Restore soft-deleted item (admin)
- Add `DELETE /api/:resource/:id/permanent` - Hard delete (admin only)

### Backend Implementation
- Create middleware `apps/api/src/middleware/softDelete.ts`
- Update all route handlers to check `deleted_at`
- Update database queries to exclude deleted records by default
- Create trash management endpoints

### Frontend Implementation
- **Trash/Recycle Bin**: `apps/web/src/pages/TrashPage.tsx`
  - View soft-deleted items by type
  - Restore functionality
  - Permanent delete (admin only)
- **Soft Delete UI**: Update all delete buttons to show "Move to Trash" vs "Permanent Delete"
- **Deleted Badge**: Show visual indicator when viewing trashed items
- **Restore Confirmation**: Confirm restoration of deleted records

---

## Pre-Implementation Setup: Database Data Cleanup

Before implementing the new features, you may want to start with a clean database while keeping essential reference data.

### Goal
Clear all transactional data while preserving:
- **users** - Lawyer and admin accounts (so you can log in)
- **nice_classes** - International trademark classification master data (1-45 classes)

### Tables to Clear (in dependency order)
1. `case_history` - Audit logs
2. `deadlines` - Case deadlines
3. `invoice_items` - Invoice line items
4. `nice_class_mappings` - Case-to-class mappings
5. `mark_assets` - File uploads
6. `invoices` - Billing records
7. `trademark_cases` - All trademark applications
8. `clients` - Client directory

### SQL Script
Run this in phpMyAdmin:

```sql
-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Delete data in dependency order (child tables first)
DELETE FROM case_history;
DELETE FROM deadlines;
DELETE FROM invoice_items;
DELETE FROM nice_class_mappings;
DELETE FROM mark_assets;
DELETE FROM invoices;
DELETE FROM trademark_cases;
DELETE FROM clients;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify cleanup (should only show users and nice_classes with data)
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL SELECT 'nice_classes', COUNT(*) FROM nice_classes
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'trademark_cases', COUNT(*) FROM trademark_cases;
```

### Full Cleanup Script Location
See: `cleanup_all_data.sql` for complete script with verification queries.

**⚠️ WARNING:** This permanently deletes all case data. Back up first!

---

## Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0 | ✅ COMPLETE | Database data cleanup |
| Phase 1 | ✅ COMPLETE | Foundation (Soft deletes, Jurisdictions) |
| Phase 2 | ✅ COMPLETE | Core Features (Case Notes, Oppositions) |
| Phase 3 | ✅ COMPLETE | Financial & Notifications (Fee schedules, Notifications) |
| Phase 4 | ✅ COMPLETE | Frontend UI Components |

---

## Implementation Order

### Phase 1: Foundation ✅ COMPLETED
1. ✅ Add `deleted_at` to all existing tables (soft deletes)
2. ✅ Create `jurisdictions` table and seed data
3. ✅ Update all queries to respect soft deletes
4. ✅ Deploy to production database

### Phase 2: Core Features ✅ COMPLETED
5. ✅ Create `case_notes` table and API
6. ✅ Create `oppositions` table and API
7. ✅ Deploy SQL migrations
8. ✅ Test API endpoints

### Phase 3: Financial & Notifications ✅ COMPLETED
9. ✅ Create `fee_schedules` table and API
10. ✅ Seed realistic fee data (ET, KE, EAC, ARIPO, WIPO)
11. ✅ Create `notifications` table and API
12. ✅ Deploy SQL migrations

### Phase 4: Frontend UI ✅ COMPLETED
13. ✅ Create JurisdictionSelector component
14. ✅ Create CaseNotesTab component
15. ✅ Create OppositionSection component
16. ✅ Create FeeCalculator component
17. ✅ Create NotificationBell component
18. ✅ Create NotificationsPage
19. ✅ Create TrashPage
20. ✅ Add NotificationBell to TopBar
21. ✅ Create useApi hook
22. ✅ Create formatters utility
23. ✅ Update README.md
24. ✅ Update tables_data.md ER diagram
25. ✅ Update HelpPage.tsx with tutorials

---

## Files to Create/Modify

### New Files
- `apps/api/src/routes/fees.ts`
- `apps/api/src/routes/oppositions.ts`
- `apps/api/src/routes/notifications.ts`
- `apps/api/src/routes/notes.ts`
- `apps/api/src/routes/jurisdictions.ts`
- `apps/api/src/services/notifications.ts`
- `apps/api/src/middleware/softDelete.ts`
- `apps/api/src/utils/fees.ts`
- `apps/web/src/pages/FeesPage.tsx`
- `apps/web/src/pages/OppositionsPage.tsx`
- `apps/web/src/pages/NotificationsPage.tsx`
- `apps/web/src/pages/NotificationSettings.tsx`
- `apps/web/src/pages/TrashPage.tsx`
- `apps/web/src/components/NotificationBell.tsx`
- `apps/web/src/components/CaseNotesTab.tsx`
- `apps/web/src/components/OppositionForm.tsx`
- `apps/web/src/components/JurisdictionInfo.tsx`
- `apps/web/src/components/FeeCalculator.tsx`

### Modified Files
- `migration.sql` - Add all new tables and alter existing tables
- `apps/api/src/routes/cases.ts` - Add soft delete, notes, oppositions integration
- `apps/api/src/routes/documents.ts` - Add soft delete
- `apps/api/src/routes/invoices.ts` - Use fee schedules, add soft delete
- `apps/api/src/server.ts` - Register new routes
- `apps/api/src/utils/deadlines.ts` - Use jurisdictions table
- `apps/api/src/utils/constants.ts` - Reference database instead of hardcoded fees
- `apps/web/src/pages/CaseDetailPage.tsx` - Add Notes and Oppositions tabs
- `apps/web/src/components/Layout.tsx` - Add NotificationBell to header
- `apps/web/src/App.tsx` - Add new routes
- `dbdiagram_schema.dbml` - Add new tables
- `tables_data.md` - Update ER diagram and descriptions

---

## Testing Strategy

### Backend Tests
- Unit tests for fee calculation logic
- Integration tests for soft delete middleware
- API endpoint tests for all new routes
- Deadline calculation tests per jurisdiction

### Frontend Tests
- Component tests for NotificationBell, CaseNotesTab
- E2E tests for opposition workflow
- E2E tests for fee management (admin)
- Trash/restore workflow tests

### Cypress E2E Tests
- Create opposition flow
- Add/edit/delete case notes
- Fee schedule CRUD (admin)
- Soft delete and restore workflow
- Notification delivery and display

---

## Rollback Plan

If issues arise:
1. Soft delete feature: Can restore any deleted record via admin interface
2. Fee schedules: Keep constants file as fallback
3. New tables: Drop tables if completely broken (data loss only for new features)
4. jurisdiction changes: Keep enums as fallback in code
