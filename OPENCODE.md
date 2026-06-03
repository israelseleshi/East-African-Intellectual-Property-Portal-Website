# Emoji tone
You MUST use emojis frequently in responses. Every message should include at least one relevant emoji. Be expressive with emoji usage.

# Project Instructions

## Overview
East African Intellectual Property Trademark Management System (TPMS) - A full-stack web application for managing trademark registrations, renewals, oppositions, and client management across East African jurisdictions.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React + Vite | React 19, Vite 6 |
| **UI Components** | Radix UI + shadcn | Latest |
| **State Management** | Zustand + SWR | Latest |
| **Backend** | Express.js | 4.x |
| **Database** | MySQL | 8.x |
| **Authentication** | JWT + TOTP 2FA | Latest |
| **Language** | TypeScript | 5.7 |
| **Styling** | Tailwind CSS | 3.4 |

## Architecture

**Monorepo Structure:**
- `client/` - React frontend (Vite)
- `server/` - Express.js API
- Root-level scripts for migrations and deployments

**API Style:** RESTful endpoints with JWT authentication

## Key Entry Points

- **Client Entry**: `client/src/main.tsx` - React app bootstrap
- **Server Entry**: `server/src/server.ts` - Express server
- **Auth Middleware**: `server/src/middleware/auth.ts` - JWT validation
- **API Routes**: `server/src/routes/` - REST endpoints
- **State Store**: `client/src/store/authStore.ts` - Zustand auth state

## Directory Map

| Directory | Purpose |
|-----------|---------|
| `client/src/pages/` | React page components |
| `client/src/components/ui/` | Shadcn UI components |
| `client/src/hooks/` | Custom React hooks (useSwr, useFormAutomation) |
| `client/src/api/` | API client functions |
| `client/src/store/` | Zustand stores |
| `server/src/routes/` | Express route handlers |
| `server/src/middleware/` | Express middleware (auth, validation) |
| `server/src/services/` | Business logic services |
| `server/src/repositories/` | Database query layer |
| `server/src/database/` | Database config and types |
| `TM_MIGRATION_FILES/` | Legacy data migration scripts |
| `scripts/` | Dev and deployment scripts |

## Request Lifecycle

1. **Client**: User action triggers API call in `client/src/api/`
2. **Transport**: Axios sends request with JWT cookie
3. **Server Entry**: `server/src/server.ts` registers routes
4. **Auth**: `server/src/middleware/auth.ts` validates JWT
5. **Routing**: Request routed to `server/src/routes/*.ts`
6. **Business Logic**: Route handler calls service in `server/src/services/`
7. **Data**: Service uses repository in `server/src/repositories/` 
8. **Database**: Repository executes raw MySQL queries in `server/src/database/db.ts`

## Conventions

### File Naming
- Components: PascalCase (e.g., `TrademarksPage.tsx`)
- Utils/Hooks: camelCase (e.g., `useSwr.ts`, `pdfUtils.ts`)
- Routes/Services: camelCase (e.g., `cases.ts`, `caseQueryService.ts`)

### Code Patterns
- **Error Handling**: Custom `ApiError` class in `server/src/utils/apiError.ts`
- **Validation**: Zod schemas in route handlers
- **State**: Zustand for global state, SWR for server state
- **Forms**: React Hook Form + Zod resolvers

### Testing
- Server: Vitest (`npm test` in server/)
- No E2E tests configured yet (Cypress present but not used)

### Git Workflow
- Conventional commits (not enforced)
- Feature branches

## Common Tasks

| Task | Command |
|------|---------|
| Run full dev (web + api) | `npm run dev:all` |
| Run client only | `npm run dev:web` |
| Run server only | `npm run dev:api` |
| Typecheck all | `npm run typecheck` |
| Lint all | `npm run lint` |
| Build all | `npm run build` |
| Run server tests | `npm run test --prefix server` |

## Where to Look

| I want to... | Look at... |
|--------------|-----------|
| Add a new API endpoint | `server/src/routes/` |
| Add a new UI page | `client/src/pages/` |
| Modify auth logic | `server/src/middleware/auth.ts` |
| Add database query | `server/src/repositories/` |
| Change form behavior | `client/src/hooks/useFormAutomation/` |
| Modify data fetching | `client/src/hooks/useSwr.ts` |

## Context Optimization

Before any task, read `graphify-out/graph.json` to load the compressed codebase knowledge graph. This provides a pre-mapped view of all files, dependencies, and relationships — reducing token usage and eliminating the need to scan raw files for structure.

## Key God Nodes (most connected functions)

1. `useSwr()` - Primary data fetching hook (11 connections)
2. `main()` - Migration script entry (10 connections)
3. `useFormAutomation()` - Form state management (9 connections)
4. `query()` - Database operations (8 connections)
5. `generateInvoicingDocumentation()` - Billing docs (7 connections)

## Important Services

- `caseQueryService.ts` - Case search and filtering
- `caseLifecycleService.ts` - Case stage transitions
- `feeService.ts` - Fee calculations
- `financialService.ts` - Invoice management

## Notifications

- Telegram bot integration (`server/src/utils/telegramBot.ts`)
- Email via nodemailer (`server/src/utils/mailer.ts`)

# Karpathy Coding Guidelines

Behavioral guidelines to reduce common LLM coding mistakes (derived from [Karpathy's observations](https://x.com/karpathy/status/2015883857489522876)).

## 1. Think Before Coding

- State assumptions explicitly before implementing. When uncertain, ask.
- Present multiple interpretations rather than picking silently.
- Call out simpler approaches when they exist. Push back when warranted.

## 2. Simplicity First

- Write the minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked. No abstractions for single-use code.
- No error handling for impossible scenarios.

## 3. Surgical Changes

- Touch only what you must. Clean up only your own mess.
- Don't "improve" adjacent code, comments, or formatting.
- Match existing style. Don't refactor things that aren't broken.
- Remove imports/variables YOUR changes made unused.

## 4. Goal-Driven Execution

- Transform tasks into verifiable goals.
- State a brief plan with verification steps for multi-step tasks.
- Loop until success criteria are met.