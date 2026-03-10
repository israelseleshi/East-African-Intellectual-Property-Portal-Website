# TPMS — Full Platform Workflow & Architecture Review

> **Author:** Senior System Developer (AI Review)
> **Date:** 2026-03-08
> **Scope:** Full-stack analysis of the East African Intellectual Property Portal
> **Live URL:** https://eastafricanip.com

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Database Schema (Production)](#2-database-schema-production)
3. [The Trademark Case Lifecycle — In Detail](#3-the-trademark-case-lifecycle--in-detail)
4. [EIPA Form Automation (Application + Renewal)](#4-eipa-form-automation-application--renewal)
5. [Client Feedback Checklist (Agote's Comments)](#5-client-feedback-checklist-agotes-comments)
6. [What Is Working Well](#6-what-is-working-well)
7. [What Needs Improvement](#7-what-needs-improvement)
8. [Recommended Action Plan](#8-recommended-action-plan)

---

## 1. Technology Stack

| Layer       | Technology                                           |
|-------------|------------------------------------------------------|
| Frontend    | React 19 + TypeScript + Vite 6                       |
| Styling     | TailwindCSS 3.4 + Custom CSS Variables (`--eai-*`)   |
| UI Library  | Radix UI (Select, Dialog, Dropdown) + Lucide/Phosphor Icons |
| State       | Zustand for global state, React hooks for local       |
| PDF         | `pdf-lib` + `@pdf-lib/fontkit` (Amharic support)     |
| Backend     | Node.js + Express (ES Modules) + TypeScript           |
| Database    | MySQL (MariaDB on cPanel) via `mysql2/promise` pool   |
| Auth        | JWT (`jsonwebtoken`) + bcrypt                         |
| Hosting     | cPanel (A2 Hosting) + Phusion Passenger for Node.js   |
| Deployment  | PowerShell deploy script (`scripts/deploy.ps1`)       |
| Testing     | Cypress 15 (E2E)                                      |
| Export      | `xlsx` (SheetJS) for Excel export                     |

---

## 2. Database Schema (Production)

**16 tables** in `falolega_tpms`:

```
trademark_cases      — Core case entity (14+ columns including flow_stage, status, dates)
clients              — Applicant/owner information
case_history         — Audit log for every action on a case
case_notes           — Internal/external notes per case
deadlines            — Statutory deadlines (auto-generated on stage change)
nice_classes         — Reference table: 45 classes
nice_class_mappings  — Many-to-many: case ↔ nice class
mark_assets          — Files: LOGO, POA, PRIORITY documents
eipa_form_payloads   — Raw JSON payload from form submissions
invoices             — Invoice headers (client, amounts, status)
invoice_items        — Line items per invoice (linked to cases)
fee_schedules        — Jurisdiction-specific fee rules
jurisdictions        — Country configuration (11 EA countries)
notifications        — Alert/notification queue
oppositions          — Third-party opposition tracking
users                — Auth users
```

### Key Columns on `trademark_cases`

| Column              | Type          | Purpose                                  |
|---------------------|---------------|------------------------------------------|
| `id`                | CHAR(36)      | UUID primary key                         |
| `client_id`         | CHAR(36)      | FK → clients                             |
| `jurisdiction`      | VARCHAR(10)   | ET, KE, TZ, etc.                         |
| `mark_name`         | VARCHAR(255)  | Trademark word mark                      |
| `mark_type`         | VARCHAR(50)   | WORD, LOGO, COMBINED, etc.               |
| `mark_image`        | TEXT          | Path to uploaded mark image              |
| `status`            | VARCHAR(50)   | Legacy status: DRAFT→FILED→...→REGISTERED|
| `flow_stage`        | VARCHAR(50)   | **Primary lifecycle**: 14 possible stages |
| `filing_number`     | VARCHAR(100)  | Official filing number                   |
| `certificate_number`| VARCHAR(100)  | Certificate number once issued           |
| `filing_date`       | DATE          | Date of filing                           |
| `registration_dt`   | DATE          | Date of registration                     |
| `expiry_date`       | DATE          | When registration expires                |
| `next_action_date`  | DATE          | Next deadline for this case              |
| `priority`          | ENUM(YES,NO)  | Priority claim                           |
| `user_id`           | CHAR(36)      | Assigned user                            |
| `deleted_at`        | TIMESTAMP     | Soft delete                              |

### Current Production Data

| Metric          | Value |
|-----------------|-------|
| Total Cases     | 6     |
| Total Clients   | 3     |
| Distinct Statuses | DRAFT, FILED, FORMAL_EXAM, SUBSTANTIVE_EXAM, PUBLISHED |
| Distinct Stages | DATA_COLLECTION, FILED, FORMAL_EXAM, AMENDMENT_PENDING |

---

## 3. The Trademark Case Lifecycle — In Detail

The platform implements a **14-stage case flow system**. Below is the full lifecycle, what each stage does, and how the backend + frontend handle it.

### 3.1 Stage Definitions

```
STAGE 1:  DATA_COLLECTION      → "In-take" (default for new cases)
STAGE 2:  READY_TO_FILE        → "Ready to File" (form is complete, ready to print/submit)
STAGE 3:  FILED                → "Filed" (application submitted to IP office)
STAGE 4:  FORMAL_EXAM          → "Formal Exam" (office reviewing paperwork)
STAGE 5:  SUBSTANTIVE_EXAM     → "Substantive Exam" (office reviewing uniqueness)
STAGE 6:  AMENDMENT_PENDING    → "Office Action Response" (office action, needs response)
STAGE 7:  PUBLISHED            → "Published" (gazette publication, opposition window)
STAGE 8:  CERTIFICATE_REQUEST  → "Certificate Request" (requesting physical certificate)
STAGE 9:  CERTIFICATE_ISSUED   → "Certificate Issued" (certificate received)
STAGE 10: REGISTERED           → "Registered" (mark fully registered)
STAGE 11: RENEWAL_DUE          → "Renewal Due" (approaching expiry)
STAGE 12: RENEWAL_ON_TIME      → "Renewed On Time" (renewed within window)
STAGE 13: RENEWAL_PENALTY      → "Renewal with Penalty" (renewed after grace period)
STAGE 14: DEAD_WITHDRAWN       → "Dead/Withdrawn" (case abandoned or withdrawn)
```

### 3.2 How a Case Moves Through the Lifecycle

#### Entry Point: EIPA Form Submission
1. User fills Application Form on `/eipa-forms/application-form`
2. Frontend (`FormInspectorPage.tsx`) collects applicant, mark, classes, image data
3. Sends `POST /api/forms/submit` with full payload including PDF Base64
4. Backend (`forms.ts`) creates:
   - `clients` record (if new)
   - `trademark_cases` record with `flow_stage = 'FILED'`, `status = 'FILED'`
   - `nice_class_mappings` for selected classes
   - `eipa_form_payloads` with raw JSON
   - `mark_assets` for PDF and logo image
   - `case_history` entry (FORM_SUBMITTED)
   - `deadlines` entry (FORMAL_EXAM, 60 days out)

#### OR: Manual Case Creation
1. User clicks "New Application" on Docket page → navigates to `/case-intake`
2. Submits `POST /api/cases` with basic data
3. Backend creates case with `flow_stage = 'DATA_COLLECTION'`, `status = 'DRAFT'`

#### Stage Advancement (Lifecycle Page)
- User navigates to `/trademarks/:id` → clicks "Manage Lifecycle"
- Opens `CaseFlowPage.tsx` with the `CaseStageTracker` component
- User clicks stage action button → `StageActionModal` opens
- Modal collects: trigger date, notes, filing number, certificate number
- Sends `PATCH /api/cases/:id/flow-stage` with `{ stage, triggerDate, notes, ...extraData }`

#### What happens on each stage transition (backend `cases.ts` lines 337-530):

| Transition To          | Backend Actions                                                      |
|------------------------|----------------------------------------------------------------------|
| `READY_TO_FILE`        | Sets `status = 'DRAFT'`                                             |
| `FILED`                | Validates mark_name/client/jurisdiction. Sets `filing_date`, `next_action_date` (+30d), `status = 'FILED'` |
| `FORMAL_EXAM`          | Sets `next_action_date` (+30d), `status = 'FORMAL_EXAM'`           |
| `SUBSTANTIVE_EXAM`     | Sets `next_action_date` (+120d), `status = 'SUBSTANTIVE_EXAM'`     |
| `AMENDMENT_PENDING`    | Sets `next_action_date` (+90d), `status = 'SUBSTANTIVE_EXAM'` (stays) |
| `PUBLISHED`            | Sets `next_action_date` (+60d ET / +90d KE for opposition), `status = 'PUBLISHED'` |
| `CERTIFICATE_REQUEST`  | Sets `next_action_date` (+30d)                                      |
| `CERTIFICATE_ISSUED`   | Sets `registration_dt`, `certificate_number`                         |
| `REGISTERED`           | Sets `registration_dt`, calculates `expiry_date` (+7yr ET / +10yr others), `status = 'REGISTERED'` |
| `RENEWAL_DUE`          | Sets `next_action_date` (+30d), `status = 'RENEWAL'`               |
| `RENEWAL_ON_TIME`      | Sets `status = 'REGISTERED'` (reset)                                |
| `RENEWAL_PENALTY`      | Sets `next_action_date` (+180d)                                     |
| `DEAD_WITHDRAWN`       | Sets `status = 'EXPIRING'`                                          |

#### After Every Transition:
1. **Deadline auto-creation**: Deletes all incomplete deadlines for the case, creates a new one with the type matching the stage
2. **History audit**: Inserts into `case_history` with old/new stage data + notes
3. **Notes save**: If notes provided, saves to `case_notes`
4. **Auto-invoice**: If `FEE_SCHEDULE` has a fee for this stage+jurisdiction, auto-creates an invoice in `invoices` + `invoice_items`

### 3.3 Visual Lifecycle Component

`CaseStageTracker.tsx` renders:
- **Current Stage Banner** with deadline countdown (color-coded: green >30d, orange ≤30d, red ≤7d pulsing)
- **Horizontal Timeline** showing 9 main stages as clickable dots
- **Stage Cards Grid** with completion status, deadlines, and action buttons
- **Special Actions Panel**: "Respond to Office Action" (→ AMENDMENT_PENDING), "Renew Trademark" (→ RENEWAL_DUE), "Withdraw/Abandon Case" (→ DEAD_WITHDRAWN)
- **Download Form link** at READY_TO_FILE stage

### 3.4 Deadline System

The `deadlines` table stores computed deadlines:
```sql
deadlines (id, case_id, due_date, type, is_completed, created_at)
```

Types include: `FORMAL_EXAM`, `OPPOSITION_WINDOW`, `OFFICE_ACTION_RESPONSE`, `RENEWAL`, `CERTIFICATE_REQUEST_DEADLINE`, etc.

The `DeadlinesPage.tsx` displays these by:
1. Fetching all cases via `trademarkService.getCases()`
2. Extracting nested `deadlines[]` array from each case
3. Filtering by jurisdiction, trademark name, client name
4. Showing countdown (days left), urgency coloring, mini calendar

---

## 4. EIPA Form Automation (Application + Renewal)

### 4.1 Application Form (`/eipa-forms/application-form`)

**Page:** `FormInspectorPage.tsx` (865 lines)

**Sections** (modular React components):
1. `ApplicantSection` — Full name (English + Amharic), type (Female/Male/Company), client quick-load dropdown
2. `AddressSection` — Street, Zone, Wereda, City, House No, ZIP, P.O. Box, **Nationality** (dropdown with flags), **Residence Country** (dropdown with flags)
3. `ContactSection` — Telephone, Email, Fax
4. `MarkSpecificationSection` — Mark type (Goods/Service/Collective), form (Word/Figurative/Mixed/3D), image upload, description, translation, color
5. `NiceClassificationSection` — Multi-select Nice Class picker
6. `PrioritySection` — Priority country (dropdown with flags), filing date, goods/services, document options
7. `AgentSection` — Pre-filled with East African IP defaults (Subcity: Yeka, Wereda: 02, Tel: 0939423012)
8. `DisclaimerSection` — Amharic disclaimer text
9. `ChecklistSection` — Document checklist toggles

**How it works:**
1. User fills all fields → Live PDF preview updates in real-time (side panel)
2. PDF preview uses `fillPdfForm()` from `pdfUtils.ts` to fill `/application_form.pdf` template
3. On submit → sends to `POST /api/forms/submit`
4. Backend creates the full trademark case + client + classes + saves PDF binary

### 4.2 Renewal Form (`/eipa-forms/renewal-form`)

**Component:** `RenewalSection.tsx` (437 lines, all-in-one)

**Sections within:**
- Applicant Name (with client quick-load)
- Address & Contact (with **Nationality** and **Residence Country** dropdowns with flags)
- Agent Details (with **Country** dropdown with flags)
- Mark Details (type checkboxes, logo upload)
- Registration Info (App No, Reg No, Reg Date)
- Goods/Services + Nice Classes
- Signature/Date

**How it works:**
1. Shares the same `FormInspectorPage.tsx` parent (toggled by URL path)
2. Uses the same `fillPdfForm()` with `/renewal_form.pdf` template
3. Same submission to `POST /api/forms/submit`

### 4.3 Agent Pre-fill

The agent fields are pre-filled with default data on every new form:
```typescript
agent_name: 'East African IP',
agent_subcity: 'Yeka',
agent_wereda: '02',
agent_telephone: '0939423012',
agent_email: 'info@eastafricanip.com',
```

---

## 5. Client Feedback Checklist (Agote's Comments)

### Trademark Detail & Editing

| # | Feedback Item | Status | Details |
|---|---------------|--------|---------|
| 1 | Details for Trademark need to show up | ✅ **IMPLEMENTED** | `TrademarkDetailInfoPage.tsx` renders all case fields: mark info, dates, client, classes, history, EIPA form data |
| 2 | Edit Trademark Detail – should be editable | ✅ **IMPLEMENTED** | Edit mode toggled by pencil icon. `PATCH /api/cases/:id` updates fields. Image upload via Base64 |
| 3 | Image Upload doesn't work | ✅ **FIXED** (this session) | Backend now handles Base64 image strings. Deployed updated backend to cPanel. `VITE_API_URL` configured for live backend |
| 4 | Nice Class should show up | ✅ **IMPLEMENTED** | `NiceClassPicker` component on detail page. `nice_class_mappings` table stores associations. Docket table shows class numbers |
| 5 | Instructions & Remarks | ✅ **IMPLEMENTED** | `clientInstructions` and `remark` fields on `TrademarkDetailInfoPage.tsx`, editable in edit mode |
| 6 | Document Upload | ⚠️ **PARTIAL** | `documentService.upload()` exists in `api.ts`. Backend route `POST /api/upload` exists. BUT: no dedicated document management UI in detail page (only mark_assets with types LOGO/POA/PRIORITY) |
| 7 | Download Button should download the form | ✅ **IMPLEMENTED** | Docket page has download button per row. Fetches case + EIPA data, fills PDF template, triggers browser download |
| 8 | EIPA Form should include new and renewal | ✅ **IMPLEMENTED** | Both forms exist at `/eipa-forms/application-form` and `/eipa-forms/renewal-form`. Tab switcher in the UI |
| 9 | Client Dropdown should be in EIPA Form | ✅ **IMPLEMENTED** | "Quick load client" dropdown in `ApplicantSection` and `RenewalSection`. Fetches from `GET /api/clients` |
| 10 | Agent info should be pre-filled | ✅ **IMPLEMENTED** | Default values hardcoded in form state init: `agent_name: 'East African IP'`, `agent_subcity: 'Yeka'`, etc. |
| 11 | Export Button should download XLSX | ✅ **IMPLEMENTED** | `handleExportExcel()` in `DocketPage.tsx` using SheetJS. Exports mark name, filing #, jurisdiction, status, client, dates |

### Case Flow / Lifecycle

| # | Feedback Item | Status | Details |
|---|---------------|--------|---------|
| 12 | Ready to File form has to be on the Files stage | ⚠️ **PARTIAL** | "Download Filled Form" button exists at READY_TO_FILE stage in `CaseStageTracker.tsx`, but the `window.open()` URL is **broken** (uses `STAGES.id` which is undefined). Needs fix to correctly link to the case's filled PDF |
| 13 | Amendment Pending should be optional, not a mandatory stage | ✅ **IMPLEMENTED** | Amendment Pending is a "Special Action" (side button), NOT a required step in the main 9-stage flow. It's a detour you can trigger from any stage |
| 14 | Date should be global (month first) | ❌ **NOT IMPLEMENTED** | Currently uses `toLocaleDateString()` without forced locale. Some places use `en-US` (month first), others use browser default. **Need to standardize all dates to `MM/DD/YYYY` globally** |
| 15 | Issue Certificate should be on Certificate Issued stage | ✅ **IMPLEMENTED** | `CERTIFICATE_ISSUED` stage exists. Backend sets `registration_dt` and `certificate_number` on transition |
| 16 | Renewal Date should be seen | ⚠️ **PARTIAL** | Backend calculates `expiry_date` on REGISTERED stage (ET: +7yr, others: +10yr). But the expiry/renewal date is **not prominently displayed** on the detail page or docket table header |
| 17 | Renewal Penalty should be optional | ✅ **IMPLEMENTED** | `RENEWAL_PENALTY` is a separate stage, accessible as a special action. It's not a mandatory step in the flow |
| 18 | Dead/Withdrawn should be status instead of stage | ⚠️ **NEEDS REVIEW** | Currently `DEAD_WITHDRAWN` is both a flow_stage AND maps to `status = 'EXPIRING'`. The client wants it as a separate status that can be applied from any stage. Backend already supports it as a special action (accessible from any stage), but the status value 'EXPIRING' is misleading — should be 'DEAD' or 'WITHDRAWN' |
| 19 | From any stage, trademark could be withdrawn | ✅ **IMPLEMENTED** | "Withdraw/Abandon Case" is a Special Action button visible at all times in `CaseStageTracker`. Sets stage to `DEAD_WITHDRAWN` regardless of current stage |
| 20 | Implement Pagination or Lock/Freeze Effect | ✅ **IMPLEMENTED** | Docket page has pagination (5 per page) with page size, total count, prev/next buttons. Table headers are styled but **not sticky/frozen** |

### Deadline Page

| # | Feedback Item | Status | Details |
|---|---------------|--------|---------|
| 21 | Manage alert | ❌ **NOT IMPLEMENTED** | `notifications` table exists in DB but no UI to manage/view/configure alerts. No email/SMS integration. No alert rules engine |
| 22 | Add countries all of them from trademarks | ⚠️ **PARTIAL** | DeadlinesPage has jurisdiction filter with all 11 countries. But missing SD (Sudan) in image flags. Filter works correctly |

### Invoice Page

| # | Feedback Item | Status | Details |
|---|---------------|--------|---------|
| 23 | Automatically with Particular | ⚠️ **PARTIAL** | Auto-invoice generation works on stage transitions when `FEE_SCHEDULE` has matching fees. But the invoice doesn't contain "Particulars" as a separate line — just a generic description |
| 24 | But 1st time is... | ❓ **UNCLEAR** | Incomplete feedback. Likely refers to first-time filing fee logic. Currently fees are flat per stage. May need tiered logic |

### Notifications

| # | Feedback Item | Status | Details |
|---|---------------|--------|---------|
| 25 | Critical deadlines should go to specific... | ❌ **NOT IMPLEMENTED** | `notifications` table has columns for `recipient_type`, `channel`, `status`, `retry_count`. But NO notification dispatch service, no email integration, no cron job to check deadlines |

### Search

| # | Feedback Item | Status | Details |
|---|---------------|--------|---------|
| 26 | Search bar should be indexed for trademarks | ⚠️ **PARTIAL** | Frontend search by mark name, filing number, client name works. Backend SQL uses `LIKE %query%` which doesn't use indexes. For current data volume (6 cases) this is fine, but **needs FULLTEXT index** for scale |

---

## 6. What Is Working Well

### ✅ Architecture & Code Quality
- Clean separation of concerns: modular sections for forms, dedicated API service layer
- TypeScript throughout frontend and backend
- Proper DB transactions with rollback on all critical operations
- UUID-based primary keys across all tables
- Soft delete pattern (`deleted_at`) on all major entities
- Toast notification system for user feedback

### ✅ Case Lifecycle System
- 14-stage flow is well-designed and covers the complete trademark lifecycle
- Jurisdiction-aware deadline calculations (ET: 7yr renewal, others: 10yr; ET: 60d opposition, KE: 90d)
- Auto-invoice generation on stage transitions
- Audit trail via `case_history` on every stage change
- Special actions (Amendment, Renewal, Withdrawal) accessible from any stage

### ✅ EIPA Form Automation
- Real-time PDF preview with Amharic font support
- Both Application and Renewal forms
- Client quick-load dropdown
- Agent pre-fill with East African IP defaults
- Country dropdowns with flag images (just implemented)
- PDF download with filled data from any row in the docket

### ✅ Docket & Export
- Table + Grid view toggle
- Sortable columns (client, mark, jurisdiction, status, filing #)
- Pagination with 5 records per page
- XLSX export with all key fields
- Jurisdiction image flags throughout

### ✅ UI/UX Design
- Premium Apple-inspired design system with CSS variables
- Interactive guided tours (Joyride) for onboarding
- Loading skeletons for all data-heavy pages
- Responsive mobile layout with bottom nav
- Dark mode support via CSS variables

---

## 7. What Needs Improvement

### 🔴 Critical Issues

1. **Download Form URL broken at READY_TO_FILE stage**
   - `CaseStageTracker.tsx` line 181: `window.open(\`/api/cases/${(STAGES as any).id}/download\`, '_blank')`
   - `STAGES` is the array of stages, not the case object. Should use the actual case ID.

2. **No Notification System**
   - DB table exists but no backend service dispatches notifications
   - No cron job to scan deadlines and trigger alerts
   - No email/SMS integration

3. **Date Format Inconsistency**
   - Some views use `toLocaleDateString()` (browser default), some use `en-US`, some use ISO format
   - Client requested month-first globally

4. **Dead/Withdrawn Status Mapping**
   - Backend maps `DEAD_WITHDRAWN` → `status = 'EXPIRING'`, which is semantically wrong
   - Should be a distinct `DEAD` or `WITHDRAWN` status

5. **Document Upload UX Missing**
   - Backend supports file upload, DB has `mark_assets`
   - But no dedicated UI section for document management on the detail page (upload, view, delete POA/Priority docs)

### 🟡 Medium Issues

6. **No Sticky Headers on Docket Table**
   - Table headers scroll out of view on long lists
   - Client asked for "Lock/Freeze Effect" — need `position: sticky` on `<thead>`

7. **Renewal Date Not Visible**
   - `expiry_date` is calculated and stored but not displayed prominently
   - Should show on detail page info card and optionally in docket table

8. **Search Performance**
   - Backend uses `LIKE %query%` which does full table scan
   - Add FULLTEXT index on `mark_name`, `filing_number` for future scale

9. **Invoice Particulars**
   - Auto-generated invoice items have generic descriptions
   - Should include clear line items: "Official Fee — Filing (Class 25)", "Professional Fee", etc.

10. **Fee Schedule Not Fully Populated**
    - `fee_schedules` table exists but fees are hardcoded in `constants.ts`
    - Should migrate to DB-driven fee schedule for admin configurability

### 🟢 Minor / Polish

11. **Dashboard → Deadlines Link**
    - Critical deadlines widget on dashboard should deep-link to the specific trademark's case flow page, not just the deadlines list

12. **Calendar Widget**
    - DeadlinesPage has a mini-calendar but it's static (always shows 28 days)
    - Should be a real calendar showing actual deadline dates with dots

13. **Docket: Missing `mark_image` thumbnail**
    - Got the mark image stored, but docket table only shows a generic FileText icon
    - Could show the actual mark thumbnail for visual identification

14. **Trash Page Recovery**
    - `TrashPage.tsx` exists but recovery/permanent delete should be tested

---

## 8. Recommended Action Plan

### Phase 1: Quick Wins (1-2 days)

| Priority | Task | Files to Change |
|----------|------|-----------------|
| P0 | Fix download URL at READY_TO_FILE | `CaseStageTracker.tsx` — pass `caseId` prop |
| P0 | Standardize all dates to `MM/DD/YYYY` | Create `formatDate()` utility, use across all pages |
| P0 | Fix DEAD_WITHDRAWN status to use proper values | `cases.ts` line 422 — change from `EXPIRING` to `WITHDRAWN` |
| P1 | Add Renewal/Expiry date display | `TrademarkDetailInfoPage.tsx`, `DocketPage.tsx` |
| P1 | Add sticky table headers | `DocketPage.tsx` — CSS `position: sticky; top: 0` on `<thead>` |
| P1 | Add Sudan to image flags | `DeadlinesPage.tsx`, `DocketPage.tsx` — add SD entry to `JURISDICTION_IMAGE_FLAGS` |

### Phase 2: Feature Completion (3-5 days)

| Priority | Task | Scope |
|----------|------|-------|
| P0 | Document Upload UI | Add document upload/list/delete section to `TrademarkDetailInfoPage.tsx`. Expand `mark_assets` types or create new `documents` table |
| P1 | Notification System | Build deadline-watching cron job, email dispatch via SendGrid/SMTP, notification center UI |
| P1 | Invoice Particulars | Improve auto-invoice descriptions with specific fee names, class counts, jurisdiction labels |
| P2 | Real Calendar Widget | Replace static calendar with proper date-picker or calendar showing deadline dots |
| P2 | Fee Schedule Admin | Build admin UI for managing `fee_schedules` table (CRUD) |

### Phase 3: Scale & Polish (5-10 days)

| Priority | Task |
|----------|------|
| P2 | FULLTEXT search index on `mark_name`, `filing_number` |
| P2 | Mark image thumbnails in docket table |
| P3 | Notification preferences per user |
| P3 | Multi-language support (Amharic UI) |
| P3 | Activity feed / real-time updates |

---

> **Summary:** The TPMS platform has a solid foundation with a well-designed 14-stage lifecycle, real PDF generation with Amharic support, and professional UI. The primary gaps are: (1) no notification/alert system despite the DB schema being ready, (2) document upload UX missing from the detail page, (3) date formatting inconsistency, and (4) a broken download link at the READY_TO_FILE stage. The architecture is clean and extensible — these gaps can be closed methodically without restructuring.

## Query Shape Expectations (2026-03-10)
- Avoid `SELECT *` in API routes; return only fields consumed by the client DTOs.
- New indexes: `trademark_cases(status, jurisdiction, created_at)`, `deadlines(case_id, status, due_date)`, `invoices(status, due_date, created_at)`.
- Slow query logging triggers at >200ms; see `/api/system/metrics` for aggregated counts.
