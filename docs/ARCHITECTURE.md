# TPMS Technical Architecture

A senior developer's guide to the internal workings of the TPMS platform.

---

## 🏛 System Components

TPMS is a monorepo-style project partitioned into `apps/api` and `apps/web`.

### 1. Frontend Architecture (`apps/web`)
-   **Routing**: `react-router-dom` v6 with `ProtectedRoute` guards for authentication.
-   **State Management**: `zustand` for high-performance, lightweight auth state.
-   **Data Fetching**: Centralized `api.ts` utilizing `axios` interceptors for automatic JWT handling.
-   **UI System**: Modern, premium aesthetics achieved through:
    -   Custom design tokens in `styles.css`.
    -   `shadcn/ui` foundation (radix-ui) for accessible primitives.
    -   `framer-motion` for micro-animations and smooth transitions.
-   **PDF Engine**: `pdf-lib` integration in `pdfUtils.ts` for real-time form manipulation.

### 2. Backend Architecture (`apps/api`)
-   **Execution Engine**: Node.js with Express and ESM (ES Modules).
-   **Database Layer**: `mysql2/promise` with connection pooling to handle high-concurrency requests.
-   **Security Architecture**:
    -   Sessionless authentication via JWT.
    -   Bcrypt hashing for password security.
    -   Middleware-level authorization (`authenticateToken`).
-   **Logic Separation**: 
    -   `routes/`: Handle HTTP inputs and validation.
    -   `utils/deadlines.ts`: The "Core Engine" that calculates legal windows based on jurisdiction.

---

## 🗄 Database Design

The schema is built for relational integrity and auditability.

### Primary Entities
-   **`users`**: Authentication and lawyer roles (ADMIN, LAWYER, PARTNER).
-   **`clients`**: Applicant entities, linked to trademarks (Many-to-One).
-   **`trademark_cases`**: The central record containing mark details, status, and legal dates.
-   **`deadlines`**: A dynamic table that provides a "Unified View" of all pending legal actions.
-   **`case_history`**: Immutable audit logs of all state transitions.

### Key Relationships
-   `trademark_cases.client_id` -> `clients.id`
-   `deadlines.case_id` -> `trademark_cases.id`
-   `nice_class_mappings.case_id` -> `trademark_cases.id`

---

## 📅 The Smart Deadline Engine

The system's intelligence resides in `apps/api/src/utils/deadlines.ts`.

```typescript
export async function recalculateDeadlines(caseId: string, status: string, caseData: any) {
    // 1. Clear existing stale deadlines
    // 2. Map current status to legal windows
    // 3. Insert fresh deadline records
}
```

This ensures that the "Deadlines" dashboard always reflects the reality of the trademark's status.

---

## 🤖 Form Automation Workflow

1.  User enters data in `FormInspectorPage.tsx`.
2.  Data is debounced and sent to `fillPdfForm`.
3.  `pdf-lib` maps the keys to the official `application_form.pdf` tags.
4.  User clicks "Submit", triggering a multi-step API call:
    -   `POST /clients` (If new)
    -   `POST /cases` (Created with `DRAFT` status)
    -   `INSERT /nice_class_mappings`
5.  Verification redirection to `/trademarks`.

---

## 🧪 Testing Strategy

We utilize **Cypress** for critical path testing.
-   **Smoke Tests**: Ensuring login and dashboard accessibility.
-   **EIPA Flow**: Testing a complete 125-line form submission from start to finish.
-   **Dynamic Data**: Using timestamps and unique identifiers to prevent database collisions during CI/CD.
