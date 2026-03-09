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
