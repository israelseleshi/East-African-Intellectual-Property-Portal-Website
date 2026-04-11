# TPMS Recovery Playbook

## Purpose

This document is a detailed recovery plan to restore the work that was done across the prior sessions,
move all important untracked work into tracked git history,
avoid accidental data loss,
and finish with clean commits pushed to remote.

This playbook is intentionally operational and step-by-step.

It is written for this repository:

- `East-African-Intellectual-Property-Portal-Website`
- branch target: `main` (or a recovery branch if you prefer)

---

## Reality Snapshot (Current State)

At the time of writing this plan, the repo status reflects:

- No tracked modified files.
- Multiple untracked files.
- Existing commit head on `main` at `c1646fb`.

Known untracked files to classify:

- `client/nul`
- `nul`
- `server/nul`
- `scripts/generate-invoicing-docs.js`
- `scripts/get-db-schema.ps1`
- `scripts/get-db-schema.sh`
- `scripts/update-user-role.ps1`
- `server/scripts/generate-invoicing-docs.js`
- `server/src/middleware/superAdmin.ts`

This playbook separates **must-restore product features** from **tooling/doc scripts** and from **junk files**.

---

## Recovery Objectives

1. Restore role model to exactly `SUPER_ADMIN` and `ADMIN` in app code and backend route protection.
2. Restore finance access control end-to-end so only SUPER_ADMIN can use invoicing/financial APIs.
3. Restore frontend navigation guards and visibility behavior for finance features.
4. Restore the invoicing improvements from prior sessions (filters/pagination/create flow).
5. Rebuild the invoice detail page and click-through behavior from billing ledger.
6. Restore multi-step signup and optional super-admin onboarding route.
7. Restore app tour integration and page anchor IDs where previously added.
8. Convert all important untracked files into tracked commits (or intentionally delete if junk).
9. Push all finalized work to remote with clear commit history.

---

## Non-Negotiable Safety Rules

1. Do not use `git reset --hard` during recovery unless explicitly requested in writing.
2. Do not force push to `main`.
3. Do not commit secrets (DB passwords, private hosts, private keys, API secrets).
4. Do not delete production-critical routes without test verification.
5. Do not collapse all changes into one giant commit.
6. Always run typecheck/build before each commit group.
7. If any step fails, stop and log exact error before continuing.

---

## Branching Strategy

Recommended branch workflow:

1. Create a dedicated recovery branch from current `main`.
2. Implement in grouped commits.
3. Push branch.
4. Open PR to `main`.
5. Merge only after sanity verification.

Commands:

```bash
git checkout -b recovery/role-guard-and-invoicing-restore
git status
```

Alternative direct-to-main workflow (less safe):

- Only use if team policy requires direct commits to `main`.
- Still keep commit groups and verification checkpoints.

---

## Workstream 0 - Untracked File Triage

### 0.1 Keep vs delete matrix

Keep candidates:

- `server/src/middleware/superAdmin.ts` (core feature)
- `scripts/get-db-schema.ps1` (tooling, but scrub secrets)
- `scripts/get-db-schema.sh` (tooling, template only)
- `scripts/update-user-role.ps1` (tooling, scrub secrets)
- `scripts/generate-invoicing-docs.js` (optional docs automation)
- `server/scripts/generate-invoicing-docs.js` (optional docs automation)

Delete candidates:

- `nul`
- `client/nul`
- `server/nul`

### 0.2 Immediate cleanup commands

```bash
git status --short
rm -f "nul" "client/nul" "server/nul"
git status --short
```

### 0.3 Secrets scrub pass for scripts

Review and replace sensitive inline values with env variables:

- In `scripts/get-db-schema.ps1`, replace hardcoded DB password with env variable.
- In `scripts/update-user-role.ps1`, remove exposed credentials from command examples.
- Keep scripts operational via secure env injection.

Target pattern:

- `TPMS_DB_USER`
- `TPMS_DB_PASS`
- `TPMS_DB_NAME`
- `TPMS_SSH_USER`
- `TPMS_SSH_HOST`
- `TPMS_SSH_PORT`
- `TPMS_SSH_KEY`

Add note in script headers:

- "This script expects credentials in environment variables; do not hardcode secrets."

---

## Workstream 1 - Restore Role Model in Frontend Store

### 1.1 File

- `client/src/store/authStore.ts`

### 1.2 Required changes

1. Replace role union:
   - from `'ADMIN' | 'LAWYER' | 'PARTNER'`
   - to `'SUPER_ADMIN' | 'ADMIN'`
2. Add helper selectors:
   - `isSuperAdmin()`
   - `canAccessFinance()`
3. Keep existing login/logout/signup-email behavior unchanged.
4. Keep persistence behavior intact.

### 1.3 Suggested interface update

```ts
interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
}
```

### 1.4 Suggested state helpers

```ts
isSuperAdmin: () => get().user?.role === 'SUPER_ADMIN',
canAccessFinance: () => get().user?.role === 'SUPER_ADMIN',
```

### 1.5 Validation checklist

- Login still succeeds.
- `useAuthStore.getState().isSuperAdmin()` returns expected boolean.
- Existing callers compile with new role union.

---

## Workstream 2 - Backend Auth and Finance Authorization

### 2.1 Add middleware file

- `server/src/middleware/superAdmin.ts`

Expected behavior:

- If `req.user?.role !== 'SUPER_ADMIN'` return 403 with stable API error shape.
- Otherwise `next()`.

### 2.2 Protect finance routes

File:

- `server/src/routes/financials.ts`

Change pattern:

1. Keep `authenticateToken`.
2. Add `requireSuperAdmin` after auth for all finance endpoints.
3. Ensure read endpoints and write endpoints are both protected.

Target route chain examples:

- `router.get('/invoices', authenticateToken, requireSuperAdmin, ...)`
- `router.post('/invoices', authenticateToken, requireSuperAdmin, ...)`
- `router.post('/payments', authenticateToken, requireSuperAdmin, ...)`

### 2.3 Update registration default role

File:

- `server/src/routes/auth.ts`

Changes:

1. Extend registration payload schema with optional role (restricted):
   - `'SUPER_ADMIN'` optionally for hidden onboarding path.
2. Default role should be `'ADMIN'` when unspecified.
3. Remove legacy `'LAWYER'` default usage.
4. Keep verification OTP flow unchanged.

Example intent:

```ts
const requestedRole = parsed.data.role;
const role = requestedRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';
```

### 2.4 API behavior checks

With ADMIN token:

- `GET /api/financials/invoices` => 403.
- `POST /api/financials/invoices` => 403.

With SUPER_ADMIN token:

- finance endpoints operate normally.

---

## Workstream 3 - Frontend Route Guard and Navigation Guard

### 3.1 Router guard

File:

- `client/src/app/router.tsx`

Goal:

- Block `/invoicing` for non-super-admin users.

Implementation options:

1. Inline guard wrapper component in router file.
2. Dedicated `FinanceRouteGuard` component under `client/src/components`.

Expected behavior:

- If authenticated but not SUPER_ADMIN -> redirect to `/` with warning toast or passive redirect.
- If SUPER_ADMIN -> render billing page.

### 3.2 Sidebar conditional navigation

File:

- `client/src/components/Sidebar.tsx`

Goal:

- Hide "Invoicing" entry for ADMIN users.

Implementation detail:

1. Read role from auth store.
2. Filter nav array before render.
3. Preserve stable ordering of remaining nav links.

### 3.3 Dashboard finance widgets

File:

- `client/src/pages/DashboardPage.tsx`

Goal:

- Hide finance-focused cards/queues when user is ADMIN.

Acceptance:

- SUPER_ADMIN sees full dashboard.
- ADMIN sees non-finance operational widgets only.

---

## Workstream 4 - Auth UX and Multi-Step Signup Recovery

### 4.1 AppShell auth-page theming

File:

- `client/src/app/AppShell.tsx`

Goal:

- Force light theme on auth routes:
  - `/login`
  - `/signup`
  - `/verify-otp`
  - `/signup/super_admin`

### 4.2 Signup page multi-step flow

File:

- `client/src/pages/SignUpPage.tsx`

Restore intended 4-step process:

1. Step 1: Full Name
2. Step 2: Contact (email + phone)
3. Step 3: Firm Name
4. Step 4: Password + confirm password

Behavior rules:

- Each step validates before next.
- Back button available on steps 2-4.
- Submit only on final step.
- Super admin hidden flow allowed via route.

### 4.3 Hidden super admin route

File:

- `client/src/app/router.tsx`

Add route:

- `/signup/super_admin`

Constraint:

- This route should not be linked from regular navigation.

---

## Workstream 5 - Interactive Tour Recovery

### 5.1 Dependency

- Ensure `react-joyride` is installed and in lockfile.

### 5.2 Add tour component

File to create:

- `client/src/components/AppTour.tsx`

Behavior:

- Read `?tour=true` URL param.
- Start guided tour for current route.
- End clears query param.

### 5.3 AppShell integration

File:

- `client/src/app/AppShell.tsx`

Add lazy mount or guarded mount for tour component.

### 5.4 Anchor IDs by page

Required IDs to restore:

- Dashboard:
  - `#ops-summary`
  - `#queue-due7`
- Trademarks:
  - `#new-application-btn`
  - `#search-filter`
  - `#docket-grid`
- Clients:
  - `#new-client-btn`
  - `#clients-table`
- Forms:
  - `#quick-client-select`
  - `#mark-specification-section`
  - `#nice-class-section`
  - `#preview-section`
- Invoicing:
  - `#billing-stats-grid`
  - `#billing-ledger`
  - `#record-payment-btn`

### 5.5 Tour smoke test

Commands:

```bash
pnpm --dir client dev
# Visit /?tour=true
# Visit /invoicing?tour=true as SUPER_ADMIN
```

Expected:

- Steps highlight target elements.
- No console errors for missing selectors.

---

## Workstream 6 - Billing Page Functional Recovery

### 6.1 File

- `client/src/pages/BillingPage.tsx`

### 6.2 Preserve what already exists

Keep these currently present features:

- Create Invoice modal.
- Payment recording modal.
- EIPO fee list and auto-fill behavior.
- Financial summary cards.

### 6.3 Restore filtering

Filters to restore:

1. Date from
2. Date to
3. Status (`ALL`, `PAID`, `PARTIALLY_PAID`, `OVERDUE`, `DRAFT`)
4. Client selector

Important UI bug fix to preserve:

- Select cannot use empty string for all option.
- Use placeholder value (example `__all__`) and map it internally.

### 6.4 Restore pagination

Requirements:

- 5 records per page.
- Previous/next controls.
- Display range summary.

### 6.5 Restore transaction behaviors

Required click behavior:

1. Row click should go to invoice detail page when invoice id exists.
2. Record payment button should not trigger row navigation.
3. Download button should not trigger row navigation.

### 6.6 Create-invoice form refinements

Restore structure improvements:

- Better line-item grouping.
- Dynamic total display.
- Fee type selection auto-fills description and amount.
- Add/remove line item controls.

### 6.7 Keep non-shadcn visual language

Given your preference, do **not** migrate global shell to shadcn look.

Acceptable:

- Continue using existing `apple-*` and `--eai-*` styles.
- Continue using existing design tokens and layout style.

---

## Workstream 7 - Rebuild Invoice Detail Page

### 7.1 Create page file

Create:

- `client/src/pages/InvoiceDetailPage.tsx`

### 7.2 Add route

Update:

- `client/src/app/router.tsx`

Route:

- `/invoicing/:id`

Guard:

- Same finance guard as invoicing page.

### 7.3 Invoice detail minimum feature set

1. Fetch invoice by id.
2. Show invoice metadata:
   - invoice number
   - client
   - mark (if linked)
   - currency
   - status
   - due date
3. Show line items.
4. Show totals:
   - subtotal
   - paid amount
   - outstanding amount
5. Provide edit mode for invoice fields/line items.
6. Provide delete flow with confirmation modal.
7. Provide record payment shortcut.

### 7.4 API integration notes

If backend lacks invoice-by-id endpoint, add one:

- `GET /financials/invoices/:id`

For edits/deletes:

- `PATCH /financials/invoices/:id`
- `DELETE /financials/invoices/:id`

All with:

- `authenticateToken`
- `requireSuperAdmin`

### 7.5 Row navigation update

In billing table:

- replace navigate target from trademark detail to invoice detail for invoice rows.

Current pattern to replace:

- `navigate(/trademarks/${tx.markId})`

Desired pattern:

- `navigate(/invoicing/${tx.id})`

---

## Workstream 8 - Database and Schema Documentation Sync

### 8.1 DB enum (already done manually)

Expected DB role enum:

- `SUPER_ADMIN`
- `ADMIN`

### 8.2 Sync docs schema

File:

- `docs/database_schema.json`

Verify `users.role` enum reflects only the two roles.

### 8.3 Optional helper scripts hardening

Files:

- `scripts/get-db-schema.ps1`
- `scripts/get-db-schema.sh`
- `scripts/update-user-role.ps1`

Add secure notes and parameterization.

---

## Workstream 9 - Cross-File Change Checklist

Use this as a strict checklist before commit.

### Backend checklist

- [ ] `server/src/middleware/superAdmin.ts` added and imported where needed.
- [ ] `server/src/routes/financials.ts` protected with super admin middleware.
- [ ] `server/src/routes/auth.ts` defaults registration role to ADMIN.
- [ ] `server/src/routes/auth.ts` supports optional SUPER_ADMIN role for hidden route.
- [ ] No legacy role literal remains in server (`LAWYER`, `PARTNER`).

### Frontend auth and access checklist

- [ ] `client/src/store/authStore.ts` role union updated.
- [ ] `isSuperAdmin` helper added.
- [ ] `canAccessFinance` helper added.
- [ ] Router guard blocks finance for ADMIN.
- [ ] Sidebar hides invoicing for ADMIN.
- [ ] Dashboard finance widgets hidden for ADMIN.

### Frontend invoicing checklist

- [ ] Billing filters restored.
- [ ] Billing pagination restored.
- [ ] Billing create-invoice enhancements restored.
- [ ] Billing row click opens invoice detail page.
- [ ] Invoice detail page exists and route resolves.
- [ ] Edit/delete/payment actions work on invoice detail page.

### Tours checklist

- [ ] `client/src/components/AppTour.tsx` present.
- [ ] AppShell includes tour mount.
- [ ] Page element IDs are present and stable.

### Scripts and docs checklist

- [ ] Keep only intentional scripts.
- [ ] Secrets scrubbed from scripts.
- [ ] `docs/database_schema.json` aligned.

### Junk cleanup checklist

- [ ] `nul` removed.
- [ ] `client/nul` removed.
- [ ] `server/nul` removed.

---

## Workstream 10 - Testing and Verification Plan

### 10.1 Install and typecheck

```bash
pnpm --dir client install
pnpm --dir server install
pnpm --dir client typecheck
pnpm --dir server test || true
```

### 10.2 Build checks

```bash
pnpm --dir client build
pnpm --dir server build || true
```

### 10.3 Manual role verification matrix

Use two users:

- user A: `SUPER_ADMIN`
- user B: `ADMIN`

Test cases:

1. ADMIN cannot see invoicing menu.
2. ADMIN direct URL `/invoicing` blocked.
3. ADMIN finance API call returns 403.
4. SUPER_ADMIN can access billing.
5. SUPER_ADMIN can create invoice.
6. SUPER_ADMIN can record payment.
7. SUPER_ADMIN can open invoice detail from table.
8. SUPER_ADMIN can edit/delete invoice if endpoint supports it.
9. Tour links work and selectors resolve.

### 10.4 Regression tests

Verify unaffected areas:

- Docket page still loads.
- Clients page still loads.
- Form inspector still loads.
- Auth pages flow still works.

---

## Workstream 11 - Commit Strategy (Granular, Traceable)

Commit in this order:

### Commit 1 - cleanup and safe scripts

Scope:

- Remove `nul` files.
- Add/clean scripts without secrets.

Message suggestion:

- `chore: clean untracked junk files and harden admin utility scripts`

### Commit 2 - backend role enforcement

Scope:

- add `requireSuperAdmin`
- protect financial routes
- auth registration role changes

Message suggestion:

- `feat: enforce SUPER_ADMIN access for finance APIs`

### Commit 3 - frontend role model and guards

Scope:

- auth store role union helpers
- router finance guard
- sidebar visibility
- dashboard finance card hiding

Message suggestion:

- `feat: add frontend finance access guards for admin roles`

### Commit 4 - signup and auth UX

Scope:

- multi-step signup
- super admin hidden signup route
- auth-page theme behavior in shell

Message suggestion:

- `feat: restore multi-step signup and auth route theming`

### Commit 5 - tours

Scope:

- add `AppTour`
- restore anchor IDs

Message suggestion:

- `feat: restore guided app tour with route-based anchors`

### Commit 6 - invoicing page restoration

Scope:

- filters, pagination, create form refinements
- ledger interaction fixes

Message suggestion:

- `feat: restore billing ledger filters pagination and create-invoice workflow`

### Commit 7 - invoice detail page

Scope:

- new invoice detail page
- route wiring
- table click-through behavior

Message suggestion:

- `feat: add invoice detail page with edit delete and payment actions`

### Commit 8 - docs/schema sync

Scope:

- update `docs/database_schema.json`
- add recovery documentation notes if needed

Message suggestion:

- `docs: sync database role schema and recovery notes`

---

## Workstream 12 - Push Strategy

### 12.1 Preferred push flow

```bash
git push -u origin recovery/role-guard-and-invoicing-restore
```

### 12.2 If policy requires main directly

```bash
git checkout main
git pull --ff-only
git merge --ff-only recovery/role-guard-and-invoicing-restore
git push origin main
```

### 12.3 Post-push verification

1. Open repo remote and verify commit list order.
2. Confirm files in each commit are scoped as planned.
3. Confirm no secrets leaked in diffs.

---

## Implementation-Level Notes Per File

### `server/src/middleware/superAdmin.ts`

Status:

- currently exists as untracked.

Actions:

1. Keep file.
2. Ensure TS import paths use `.js` extensions where required in transpiled ESM context.
3. Ensure returned error uses existing `sendApiError` contract.

### `server/src/routes/financials.ts`

Actions:

1. Import middleware.
2. Add `requireSuperAdmin` to all route handlers.
3. Maintain schema parsing and error handling as-is.

### `server/src/routes/auth.ts`

Actions:

1. Update `registerSchema` with optional role.
2. Validate allowed role values.
3. Default role to `ADMIN`.
4. Replace any `'LAWYER'` fallback.

### `client/src/store/authStore.ts`

Actions:

1. Change role union to `SUPER_ADMIN | ADMIN`.
2. Add helper methods.
3. Keep backward compatibility with persisted sessions where possible.

### `client/src/app/router.tsx`

Actions:

1. Introduce finance guard wrapper.
2. Protect `/invoicing`.
3. Add `/invoicing/:id` once page exists.
4. Add `/signup/super_admin` route.

### `client/src/components/Sidebar.tsx`

Actions:

1. Read auth role.
2. Filter nav list conditionally.
3. Ensure active link rendering unaffected.

### `client/src/pages/DashboardPage.tsx`

Actions:

1. Wrap finance widgets in role checks.
2. Keep layout stable for both roles.
3. Avoid empty gaps in grid when hidden.

### `client/src/pages/BillingPage.tsx`

Actions:

1. Restore filter controls and state.
2. Restore pagination state and slicing.
3. Ensure form behavior remains reliable.
4. Update click-through to invoice detail route.

### `client/src/pages/InvoiceDetailPage.tsx`

Actions:

1. Create page component.
2. Fetch invoice id from route params.
3. Handle loading/error/empty states.
4. Implement edit/save cancel behavior.
5. Implement delete confirm modal.

### `client/src/components/AppTour.tsx`

Actions:

1. Add guided steps per route.
2. Use resilient selectors.
3. Fail gracefully if selector not found.

### `scripts/get-db-schema.ps1`

Actions:

1. Remove hardcoded DB password.
2. Use env variables.
3. Keep output path to `docs/database_schema.json`.

### `scripts/update-user-role.ps1`

Actions:

1. Remove explicit password examples.
2. Keep SQL generation step only.
3. Add warning banner about secure execution.

### `scripts/get-db-schema.sh`

Actions:

1. Convert placeholder command into safe template.
2. Add `set -euo pipefail`.
3. Use env variables for connection settings.

### `scripts/generate-invoicing-docs.js`

Actions:

1. Decide if this script belongs in client-root scripts.
2. If yes, keep one canonical version only.
3. If duplicate with server script, remove duplicate.

### `server/scripts/generate-invoicing-docs.js`

Actions:

1. Compare content with root script.
2. Keep one source of truth.
3. Update npm script if needed.

---

## Duplicate Script Resolution Plan

Current duplicate candidates:

- `scripts/generate-invoicing-docs.js`
- `server/scripts/generate-invoicing-docs.js`

Resolution options:

Option A (recommended):

1. Keep root `scripts/generate-invoicing-docs.js`.
2. Delete `server/scripts/generate-invoicing-docs.js`.
3. Add docs generation npm script at root package if useful.

Option B:

1. Keep server script if docs generation is server concern.
2. Delete root script.

Decision criterion:

- Choose location aligned with where docx dependency is installed and used.

---

## Detailed End-to-End Runbook

### Phase A - Prepare

1. Pull latest main.
2. Create recovery branch.
3. Save status snapshot.
4. Remove junk `nul` files.
5. Triage script duplicates.

### Phase B - Backend roles

1. Add middleware.
2. Wire middleware to financial routes.
3. Update auth register role handling.
4. Run backend tests/type checks.

### Phase C - Frontend role guards

1. Update auth store role union.
2. Add helper methods.
3. Apply router guard.
4. Apply sidebar hiding logic.
5. Apply dashboard conditional widgets.
6. Run client typecheck and build.

### Phase D - Auth UX

1. Restore multi-step signup.
2. Add hidden super admin signup route.
3. Ensure auth page theme logic in app shell.
4. Test login/signup/verify flow.

### Phase E - Tour

1. Add/restore `AppTour`.
2. Add IDs across pages.
3. Verify route-scoped steps.
4. Manual browser verification.

### Phase F - Invoicing core

1. Restore billing filtering and pagination.
2. Preserve create invoice modal improvements.
3. Ensure select placeholder handling (`__all__`).
4. Restore status/client/date filters.
5. Verify list behavior and totals.

### Phase G - Invoice detail

1. Create page and route.
2. Hook row click to invoice detail.
3. Add edit/delete actions.
4. Verify read/update/delete API compatibility.
5. Add proper empty/error states.

### Phase H - Finalize

1. Run all checks.
2. Commit in planned order.
3. Push branch.
4. Open PR or fast-forward merge.
5. Tag release note.

---

## Git Command Playbook

### Inspect

```bash
git status --short
git branch -vv
git log --oneline --decorate -n 15
```

### Stage by commit groups

```bash
git add server/src/middleware/superAdmin.ts server/src/routes/financials.ts server/src/routes/auth.ts
git commit -m "feat: enforce SUPER_ADMIN access for finance APIs"
```

```bash
git add client/src/store/authStore.ts client/src/app/router.tsx client/src/components/Sidebar.tsx client/src/pages/DashboardPage.tsx
git commit -m "feat: add frontend finance access guards for admin roles"
```

```bash
git add client/src/pages/SignUpPage.tsx client/src/app/AppShell.tsx
git commit -m "feat: restore multi-step signup and auth page theme behavior"
```

```bash
git add client/src/components/AppTour.tsx client/src/pages/DocketPage.tsx client/src/pages/ClientsPage.tsx client/src/pages/FormInspectorPage.tsx client/src/pages/BillingPage.tsx
git commit -m "feat: restore app tour integration and guided element anchors"
```

```bash
git add client/src/pages/BillingPage.tsx client/src/pages/InvoiceDetailPage.tsx client/src/app/router.tsx client/src/api/financials.ts
git commit -m "feat: restore invoice detail workflow and billing interactions"
```

```bash
git add docs/database_schema.json scripts/get-db-schema.ps1 scripts/get-db-schema.sh scripts/update-user-role.ps1
git commit -m "docs: sync role schema and secure database utility scripts"
```

### Push

```bash
git push -u origin recovery/role-guard-and-invoicing-restore
```

---

## Acceptance Criteria

The recovery is complete only when all are true:

1. ADMIN user cannot access finance UI or API.
2. SUPER_ADMIN user can access finance UI and API.
3. Sidebar hides invoicing for ADMIN.
4. Billing page includes filters and pagination.
5. Billing row opens invoice detail page.
6. Invoice detail supports view/edit/delete flow.
7. Signup is multi-step and functional.
8. Tour works with expected anchors.
9. No leaked secrets in committed scripts.
10. No junk `nul` files remain.
11. Clean `git status` after push.

---

## Risk Register and Mitigations

### Risk 1 - Accidental secret commit

Mitigation:

- Run grep before commit for known secret patterns.
- Move credentials to env vars.

Checks:

```bash
rg -n "password|passwd|eastafricanip1q2w3e4r5t|BEGIN PRIVATE KEY|AKIA|secret" scripts server docs
```

### Risk 2 - Role mismatch between DB and app

Mitigation:

- Verify enum in DB and docs.
- Add fallback handling for unexpected role values.

### Risk 3 - Route guard bypass

Mitigation:

- Enforce on backend and frontend.
- Treat frontend guard as UX only; backend as source of truth.

### Risk 4 - Broken billing interactions

Mitigation:

- Add click propagation controls.
- Add loading/empty/error states.

### Risk 5 - Missing invoice detail API

Mitigation:

- Add endpoint if absent.
- Or derive detail from list as temporary fallback (not preferred).

---

## Suggested PR Description Template

```md
## What
- Restores role-based finance access control with SUPER_ADMIN and ADMIN only.
- Restores invoicing workflow improvements and invoice detail flow.
- Restores signup multi-step UX and guided product tour.

## Why
- Prior local work existed outside tracked history and was lost/untracked.
- This PR recovers intended behavior and ensures all work is now committed and push-safe.

## Key Changes
- Backend: super admin middleware + financial route protection
- Frontend: auth store role model, router/sidebar/dashboard guards
- Invoicing: filters, pagination, row interaction, invoice detail route/page
- Auth UX: multi-step signup + hidden super admin onboarding
- Tour: restored guide component and anchor IDs

## Verification
- [ ] ADMIN blocked from `/invoicing` and finance APIs
- [ ] SUPER_ADMIN finance flows pass
- [ ] Billing and invoice detail interactions pass
- [ ] Build/typecheck pass
```

---

## Execution Log Template

Use this section while applying the recovery.

### Log entries

- Date:
- Operator:
- Branch:
- Scope:
- Result:
- Notes:

### Entry 001

- Date:
- Operator:
- Branch:
- Scope: Remove junk untracked files
- Result:
- Notes:

### Entry 002

- Date:
- Operator:
- Branch:
- Scope: Secrets scrub utility scripts
- Result:
- Notes:

### Entry 003

- Date:
- Operator:
- Branch:
- Scope: Add super admin middleware
- Result:
- Notes:

### Entry 004

- Date:
- Operator:
- Branch:
- Scope: Protect financial routes
- Result:
- Notes:

### Entry 005

- Date:
- Operator:
- Branch:
- Scope: Auth register default role ADMIN
- Result:
- Notes:

### Entry 006

- Date:
- Operator:
- Branch:
- Scope: Update auth store role union
- Result:
- Notes:

### Entry 007

- Date:
- Operator:
- Branch:
- Scope: Add router finance guard
- Result:
- Notes:

### Entry 008

- Date:
- Operator:
- Branch:
- Scope: Sidebar finance visibility logic
- Result:
- Notes:

### Entry 009

- Date:
- Operator:
- Branch:
- Scope: Dashboard finance widgets role gating
- Result:
- Notes:

### Entry 010

- Date:
- Operator:
- Branch:
- Scope: Signup 4-step flow recovery
- Result:
- Notes:

### Entry 011

- Date:
- Operator:
- Branch:
- Scope: Hidden super admin route
- Result:
- Notes:

### Entry 012

- Date:
- Operator:
- Branch:
- Scope: App shell auth theming rules
- Result:
- Notes:

### Entry 013

- Date:
- Operator:
- Branch:
- Scope: Add/restore AppTour component
- Result:
- Notes:

### Entry 014

- Date:
- Operator:
- Branch:
- Scope: Restore tour anchors in dashboard
- Result:
- Notes:

### Entry 015

- Date:
- Operator:
- Branch:
- Scope: Restore tour anchors in trademarks page
- Result:
- Notes:

### Entry 016

- Date:
- Operator:
- Branch:
- Scope: Restore tour anchors in clients page
- Result:
- Notes:

### Entry 017

- Date:
- Operator:
- Branch:
- Scope: Restore tour anchors in forms page
- Result:
- Notes:

### Entry 018

- Date:
- Operator:
- Branch:
- Scope: Restore billing filters
- Result:
- Notes:

### Entry 019

- Date:
- Operator:
- Branch:
- Scope: Restore billing pagination
- Result:
- Notes:

### Entry 020

- Date:
- Operator:
- Branch:
- Scope: Restore create-invoice improvements
- Result:
- Notes:

### Entry 021

- Date:
- Operator:
- Branch:
- Scope: Add invoice detail route
- Result:
- Notes:

### Entry 022

- Date:
- Operator:
- Branch:
- Scope: Create invoice detail page
- Result:
- Notes:

### Entry 023

- Date:
- Operator:
- Branch:
- Scope: Wire billing row click to invoice detail
- Result:
- Notes:

### Entry 024

- Date:
- Operator:
- Branch:
- Scope: Manual QA as ADMIN
- Result:
- Notes:

### Entry 025

- Date:
- Operator:
- Branch:
- Scope: Manual QA as SUPER_ADMIN
- Result:
- Notes:

### Entry 026

- Date:
- Operator:
- Branch:
- Scope: Typecheck and build
- Result:
- Notes:

### Entry 027

- Date:
- Operator:
- Branch:
- Scope: Commit group 1
- Result:
- Notes:

### Entry 028

- Date:
- Operator:
- Branch:
- Scope: Commit group 2
- Result:
- Notes:

### Entry 029

- Date:
- Operator:
- Branch:
- Scope: Commit group 3
- Result:
- Notes:

### Entry 030

- Date:
- Operator:
- Branch:
- Scope: Push branch
- Result:
- Notes:

---

## Final Recovery Definition of Done

All conditions must be true:

- [ ] Important prior session work has been re-implemented.
- [ ] All required files are tracked in git.
- [ ] Unwanted junk files are removed.
- [ ] Secret exposure risk is eliminated.
- [ ] Build/typecheck pass.
- [ ] Role restrictions are enforced both frontend and backend.
- [ ] Invoicing workflow is restored with detail navigation.
- [ ] Commits are pushed successfully.
- [ ] Repository is left in clean state.

---

## Notes for Next Iteration

1. If you want exact historical parity with earlier local-only state,
   keep this plan but add a visual parity checklist with screenshots.
2. If invoice detail backend endpoints are missing,
   prioritize adding API support before polishing UI.
3. If tour selectors drift over time,
   centralize selector constants in one file to reduce breakage.
4. After merge,
   tag a recovery milestone release note in the repo.

---

## Quick Command Bundle (Copy/Paste Sequence)

```bash
git checkout -b recovery/role-guard-and-invoicing-restore
git status --short
rm -f "nul" "client/nul" "server/nul"
git status --short

# implement backend role enforcement changes
# implement frontend role and route guard changes
# implement invoicing + invoice detail restore

pnpm --dir client typecheck
pnpm --dir client build

git add .
git commit -m "feat: recover role-guarded finance flows and invoicing detail workflow"
git push -u origin recovery/role-guard-and-invoicing-restore
```

This quick bundle is only for speed.
Use granular commits from this playbook for cleaner history.
