# TPMS Improvement Areas Report
Date: 2026-03-09
Scope: Full codebase scan (client + server), with emphasis on architecture, maintainability, performance, and production safety.

## Executive Summary
The codebase is functional and moving fast, but it has grown with substantial route-level SQL, mixed typing quality, and repeated frontend logic. The highest-value next step is to establish clear service/repository boundaries on the backend, normalize API contracts on the frontend, and improve observability and deployment hygiene.

## Priority 1: Backend Architecture and SQL Placement
Current state:
- A large amount of SQL is embedded directly in route handlers, especially in cases and financial flows.
- Complex business logic (stage transitions, invoices, deadlines, notes) is mixed with HTTP/controller code.

Evidence:
- `server/src/routes/cases.ts`
- `server/src/routes/financials.ts`
- `server/src/routes/fees.ts`

Risk:
- Harder to test business rules in isolation.
- Higher chance of regressions when changing routes.
- Reduced readability for legal workflow logic.

Recommendation:
1. Create `repositories` for raw SQL operations (`CaseRepository`, `InvoiceRepository`, `DeadlineRepository`).
2. Move lifecycle logic to `services` (`CaseLifecycleService`, `BillingService`, `DeadlineService`).
3. Keep route handlers thin: input validation -> service call -> response mapping.

## Priority 2: Type Safety and Runtime Contracts
Current state:
- Frequent use of `any` across server routes and middleware.
- Mixed implicit response shapes in frontend consumption.

Evidence:
- `server/src/routes/cases.ts` (multiple `any[]` and casts)
- `server/src/routes/oppositions.ts`
- `server/src/middleware/auth.ts`
- `server/src/utils/deadlines.ts`

Risk:
- Runtime shape mismatches.
- Silent bugs in billing/deadline logic.
- Slower refactors.

Recommendation:
1. Define shared DTO types for all API responses.
2. Replace `any` with typed interfaces or discriminated unions.
3. Add request schema validation (`zod`/`valibot`) at route boundaries.

## Priority 3: Frontend API and Data Consistency
Current state:
- Multiple API access patterns (`useApi`, `utils/api`) and repeated normalization logic.
- Asset URL resolution logic was duplicated and fragile before recent fixes.

Evidence:
- `client/src/hooks/useApi.ts`
- `client/src/utils/api.ts`
- `client/src/pages/TrademarkDetailInfoPage.tsx`
- `client/src/pages/DocketPage.tsx`

Risk:
- Inconsistent auth handling and retry behavior.
- Regressions like infinite fetch loops or image path breaks.

Recommendation:
1. Consolidate to one API client layer with typed endpoints.
2. Centralize media URL resolution utility and reuse across pages.
3. Add React Query/SWR for normalized caching and request deduplication.

## Priority 4: Performance and Bundle Size
Current state:
- Frontend production build emits a very large main chunk (>2.7 MB).

Evidence:
- Vite build warning during `npm run build`.

Risk:
- Slower first load and worse low-bandwidth experience.
- Higher mobile CPU/memory pressure.

Recommendation:
1. Route-level code splitting for heavy pages (forms, pdf tooling, billing).
2. Lazy-load PDF and advanced workflow modules.
3. Use manual chunking strategy for vendor-heavy packages.

## Priority 5: Error Handling and Observability
Current state:
- Logging is mostly `console.error` and unstructured.
- No centralized request correlation or structured trace context.

Evidence:
- `client/src/pages/*` and `client/src/components/*` repeated console error blocks.
- `server/src/routes/*` repeated console error blocks.

Risk:
- Hard to debug production incidents quickly.
- No severity, context, or aggregated trend visibility.

Recommendation:
1. Introduce structured logger on server (`pino`/`winston`) with request IDs.
2. Standardize API error envelope (`code`, `message`, `details`, `requestId`).
3. Add frontend error boundary telemetry to a monitoring backend.

## Priority 6: Security and Auth Posture
Current state:
- Token-based auth stored in localStorage.

Evidence:
- `client/src/utils/api.ts`
- `client/src/hooks/useApi.ts`
- `client/src/store/authStore.ts`

Risk:
- LocalStorage tokens are vulnerable to XSS theft.

Recommendation:
1. Move to httpOnly secure cookies for session tokens where feasible.
2. Add refresh token rotation + short-lived access token policy.
3. Add CSP headers and stricter sanitization at risky inputs.

## Priority 7: Encoding and UI Text Hygiene
Current state:
- Some mojibake artifacts (`â€”`, corrupted symbols) are present in UI text paths.

Evidence:
- `client/src/pages/DocketPage.tsx`
- `client/src/app/AppShell.tsx`

Risk:
- Unprofessional UX and potential downstream export/report formatting issues.

Recommendation:
1. Normalize files to UTF-8 clean text.
2. Add lint/check step for character encoding anomalies.

## Priority 8: Testing Depth
Current state:
- E2E tests exist, but domain-critical server logic still has limited unit/integration coverage.

Evidence:
- `client/cypress/e2e/*` present.
- No equivalent depth around transactional server logic.

Risk:
- Billing/deadline regressions can escape into production.

Recommendation:
1. Add integration tests for stage transitions -> deadlines -> invoice creation.
2. Add contract tests for financial endpoints (`invoices`, `payments`).
3. Add smoke test pipeline for deploy-ready build and key API routes.

## Priority 9: Database and Query Optimization
Current state:
- Heavy use of `SELECT *`.
- Repeated joins and case/deadline lookups without explicit query-shape optimization.

Evidence:
- `server/src/routes/cases.ts`
- `server/src/routes/system.ts`

Risk:
- Growing latency and data over-fetch as volume scales.

Recommendation:
1. Replace `SELECT *` with explicit field lists per endpoint.
2. Review and add composite indexes for hot filters:
   - `trademark_cases(status, jurisdiction, created_at)`
   - `deadlines(case_id, status, due_date)`
   - `invoices(status, due_date, created_at)`
3. Add query timing instrumentation in production.

## Priority 10: Deployment and Release Hygiene
Current state:
- Deploy workflow is largely manual and can drift between local/prod states.

Risk:
- Increased chance of partial deploys, stale assets, and rollback difficulty.

Recommendation:
1. Add repeatable deploy script with preflight checks (build hash, healthcheck, static asset sync).
2. Track deployed commit SHA in app footer or `/api/system/version`.
3. Add rollback shortcut to previous static asset set.

## Suggested 30-Day Plan
1. Week 1: API contracts + typed DTOs + centralized media URL utility.
2. Week 2: Extract repositories/services from `cases.ts` and `financials.ts`.
3. Week 3: Structured logging + error envelope + request IDs.
4. Week 4: Performance pass (code splitting) + targeted integration tests.

## Appendix: Immediate Wins Already Applied in This Session
1. Trademark list now supports mark-image thumbnail rendering with fallback candidate strategy.
2. Trademark detail deadlines/milestones section updated for proper dark-mode theming.
3. Nice Class column removed from trademark table per UX request.

## Codebase Structure Sanitation (Senior Plans)
Based on a full directory scan, the project currently mixes product runtime code with one-time deployment artifacts and legacy scratch folders (`delete-this`, `deploy_tmp`, root temp SQL/log files, nested `forms/forms/node_modules`).

### Plan A: Conservative Sanitation (No-Risk, Zero-Downtime)
Goal: Clean structure without disrupting any active workflow.

1. Define canonical runtime directories:
   - Keep: `client/`, `server/`, `scripts/`, `docs/`, `forms/` (templates only), `reports/`.
   - Keep root control files: `package.json`, `package-lock.json` (or choose pnpm only), `README.md`, `tables.md`, `tsconfig.base.json`.
2. Create quarantine folder and move one-time artifacts:
   - Move `delete-this/`, `deploy_tmp/`, `server.js.temp`, `passenger_log_tmp.txt`, `debug_pdf.js`, `api-htaccess.txt`, `database_dump.sql` into `archive/2026-03-sanitization/`.
   - Keep for 30 days, then purge.
3. Remove dependency duplication:
   - Delete nested `forms/forms/node_modules` from version control and add ignore rule.
   - Keep only one package manager lock strategy (prefer `package-lock.json` in this repo, remove `pnpm-lock.yaml` if npm is standard).
4. Introduce hygiene gates:
   - Add CI check to fail if temporary patterns are committed (`*.temp`, `*_tmp*`, `deploy_tmp`, `delete-this`).
   - Add script: `npm run audit:structure` that verifies approved directories only.
5. Keep database files policy explicit:
   - Keep `database_schema.sql` as source of schema bootstrap.
   - Move `database_data.sql` and other dumps to `backups/` (gitignored), not in tracked root.

Expected outcome:
- Cleaner repository immediately.
- Lower accidental deployment risk.
- No interruption to cPanel deployment flow.

### Plan B: Product-Grade Monorepo Restructure (Strategic Refactor)
Goal: Make the repository look and operate like a senior production system with clear boundaries.

1. Restructure into domain-aligned layout:
   - `apps/web` (current `client`)
   - `apps/api` (current `server`)
   - `infra/deploy` (deployment scripts, cPanel docs, passenger config)
   - `infra/db` (schema, migrations, seed templates)
   - `docs/` (product + engineering docs)
   - `reports/` (generated architecture and audit outputs)
2. Migration-first database governance:
   - Replace ad-hoc SQL dump workflow with `infra/db/migrations`.
   - Treat `tables.md` as generated artifact only (scripted refresh in CI).
3. Deployment hardening:
   - Replace manual ad-hoc copy with one canonical deploy command (build + upload + checksum + smoke check).
   - Ensure only `client/dist` and server build outputs are deploy artifacts.
4. Artifact discipline:
   - Store large binaries, temporary zips, and one-off docs outside repo (or Git LFS if truly required).
   - Enforce pre-commit checks for forbidden files and max file size.
5. Rollout approach:
   - Phase 1: introduce new folders + aliases while keeping old paths.
   - Phase 2: move code and update import/build paths.
   - Phase 3: remove legacy folders after two stable releases.

Expected outcome:
- Senior-grade project topology.
- Faster onboarding and safer releases.
- Easier CI/CD scaling and cleaner production operations.

## Plan A Execution Log (Implemented)
Date executed: 2026-03-09
Scope executed now: Plan A Priority 1 and Priority 2 only.

### Priority 1 Implemented: Canonical Runtime Structure
Canonical runtime/product directories confirmed as:
- `client/`
- `server/`
- `scripts/`
- `docs/`
- `forms/` (template assets)
- `reports/`

Root control files retained for active workflow:
- `package.json`
- `package-lock.json`
- `README.md`
- `tables.md`
- `tsconfig.base.json`

### Priority 2 Implemented: Quarantine of One-Time Artifacts
Created quarantine folder:
- `archive/2026-03-sanitization/`

Moved (not deleted) into quarantine:
- `delete-this/`
- `deploy_tmp/`
- `server.js.temp`
- `passenger_log_tmp.txt`
- `debug_pdf.js`
- `api-htaccess.txt`
- `database_dump.sql`

Safety note:
- This is a no-risk move (archive only, zero destructive delete).
- Any item can be restored immediately from `archive/2026-03-sanitization/`.

## Plan A Execution Log (Implemented - Continuation)
Date executed: 2026-03-09
Scope executed now: Plan A Priority 3, Priority 4, and Priority 5.

### Priority 3 Implemented: Dependency Duplication Cleanup
Actions completed:
- Moved nested dependency tree out of active runtime path:
  - `forms/forms/node_modules` -> `archive/2026-03-sanitization/forms_forms_node_modules`
- Moved alternate lockfile to quarantine to enforce npm lock strategy:
  - `pnpm-lock.yaml` -> `archive/2026-03-sanitization/pnpm-lock.yaml`
- Added prevention rules in `.gitignore`:
  - `forms/forms/node_modules/`
  - `pnpm-lock.yaml`

Outcome:
- Single lockfile strategy remains (`package-lock.json`).
- Nested duplicated dependency folder is removed from active project structure.

### Priority 4 Implemented: Structure Hygiene Gates
Actions completed:
- Added repository audit script:
  - `scripts/audit-structure.js`
- Added root npm command:
  - `npm run audit:structure`
- Added CI workflow:
  - `.github/workflows/structure-hygiene.yml`

What is enforced:
- Required runtime directories exist (`client`, `server`, `scripts`, `docs`, `forms`, `reports`).
- Unexpected top-level directories are flagged.
- Forbidden root paths are blocked (including `deploy_tmp`, `delete-this`, `forms/forms/node_modules`, `pnpm-lock.yaml`, root SQL dump/data files).
- Tracked temporary artifacts are blocked (`*.temp`, `*_tmp*`, legacy one-time folders/files).

Outcome:
- Hygiene checks now run automatically in CI on push and pull requests.
- A local guardrail exists before deployment and merges.

### Priority 5 Implemented: Database File Policy
Actions completed:
- Created local backup directory:
  - `backups/`
- Moved mutable dataset dump out of tracked root:
  - `database_data.sql` -> `backups/database_data_2026-03-09.sql`
- Updated `.gitignore` policy:
  - Added `backups/`
  - Kept root `database_data.sql` / `database_dump.sql` ignored
  - Removed broad `*.sql` ignore and removed `database_schema.sql` ignore to keep schema explicitly trackable
- Added policy enforcement in `audit-structure.js`:
  - Root `database_data.sql` and `database_dump.sql` are hard-fail conditions
  - `database_schema.sql` presence is required

Outcome:
- Root now keeps schema bootstrap as canonical.
- Dump/data artifacts are pushed to a backup location outside tracked runtime root.

### Verification Snapshot
- `archive/2026-03-sanitization/` now contains one-time artifacts plus `pnpm-lock.yaml` and archived nested `forms` dependencies.
- `forms/forms/node_modules` is no longer present in active runtime paths.
- `database_data.sql` is no longer present at repository root.
- Structure audit command and CI workflow are present and ready for use.

## Post-Sanitization Priority Execution (In Progress)
Date executed: 2026-03-09
Current stream: Architecture hardening priorities after Plan A completion.

### Priority 1 (Backend SQL Placement) - Phase 1 Implemented
Scope completed:
- Added query repository layer for case reads:
  - `server/src/repositories/caseRepository.ts`
- Added case query service:
  - `server/src/services/caseQueryService.ts`
- Refactored `server/src/routes/cases.ts`:
  - `GET /api/cases`
  - `GET /api/cases/:id`
  - Both endpoints now call service/repository instead of embedding read SQL in route handlers.

Financials extraction completed:
- Added financial repository:
  - `server/src/repositories/financialRepository.ts`
- Added financial service:
  - `server/src/services/financialService.ts`
- Refactored `server/src/routes/financials.ts`:
  - `POST /payments`
  - `GET /payments/invoice/:invoiceId`
  - `POST /invoices`
  - `GET /invoices`
  - All endpoint SQL/transaction internals moved into service/repository layers.

Verification:
- `npm run typecheck --prefix server` passes.

### Priority 5 (Performance and Bundle Size) - Phase 1 Implemented
Scope completed:
- Introduced route-level lazy loading in router:
  - `client/src/app/router.tsx`
  - Core page routes now load through `React.lazy` + `Suspense` instead of eager imports.

Measured result (post-build):
- Build now emits multiple route chunks instead of one dominant monolith.
- Heavy screens are split into independent assets (examples):
  - `DocketPage` chunk
  - `FormInspectorPage` chunk
  - `TrademarkDetailInfoPage` chunk
  - `BillingPage` chunk

Verification:
- `npm run typecheck --prefix client` passes.
- `npm run build --prefix client` passes and confirms chunk splitting.

Remaining for full Priority 5 completion:
- Add manual chunk strategy in Vite for large third-party libraries (`pdf`, `countries`) to reduce very large vendor chunks further.
- Add performance budget checks in CI.
- `npm run audit:structure` passes.

Remaining for full Priority 1 completion:
- Extract write-heavy logic from `cases.ts` status/flow/update endpoints into dedicated lifecycle/billing services.

### Priority 2 (Type Safety and Runtime Contracts) - Phase 1 Implemented
Scope completed:
- Added runtime schema validation with `zod` for refactored endpoints:
  - `server/src/routes/financials.ts`
    - `POST /payments` payload validation
    - `GET /payments/invoice/:invoiceId` param validation
    - `POST /invoices` payload validation
  - `server/src/routes/cases.ts`
    - `GET /api/cases` query validation
    - `GET /api/cases/:id` param validation

Outcome:
- Invalid payloads now fail fast with `400` and structured validation details.
- Route-level request contracts are explicit and enforceable.

Remaining for full Priority 2 completion:
- Expand DTO/schema coverage to all write-heavy `cases.ts` endpoints and remaining route modules.
- Introduce shared response DTO types for frontend/backend alignment.

### Priority 3 (Frontend API Consistency) - Phase 1 Implemented
Scope completed:
- Unified `useApi` request execution to use the centralized axios client from `client/src/utils/api.ts` instead of native `fetch`.
- `useApi` now reuses:
  - shared base URL behavior
  - shared auth token interceptor behavior
  - consistent error extraction from API responses

Outcome:
- Removes split network stack behavior between axios and fetch for hook-driven consumers.
- Reduces risk of auth/retry/header drift across pages that depend on `useApi`.

Verification:
- `npm run typecheck --prefix client` passes after unification.

Remaining for full Priority 3 completion:
- Migrate direct axios service calls into typed endpoint modules progressively.
- Standardize fallback endpoint candidate behavior (invoice/invoicing) behind one resolver utility.

### Priority 4 (Error Handling and Observability) - Phase 1 Implemented
Scope completed:
- Added request correlation middleware:
  - `server/src/middleware/requestContext.ts`
  - Registers `x-request-id` on every request and response.
- Added standardized API error utility:
  - `server/src/utils/apiError.ts`
  - Error envelope: `code`, `message`, `details`, `requestId`
- Added Express request typing for requestId:
  - `server/src/types/express.d.ts`
- Applied standardized logging + error envelopes to refactored routes:
  - `server/src/routes/cases.ts` (query endpoints)
  - `server/src/routes/financials.ts` (all endpoints)

Outcome:
- Route errors now include request correlation ID for faster production diagnosis.
- API responses are more consistent for frontend error handling.

Verification:
- `npm run typecheck --prefix server` passes.
