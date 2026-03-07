# TPMS API Documentation

## Base URL
- **Local:** `http://localhost:3001/api`
- **Production:** `https://eastafricanip.com/api`

## Authentication
All endpoints except Login, Register, and OTP Verification require a Bearer Token in the `Authorization` header.

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Returns JWT and user object. | No |
| `POST` | `/auth/register` | Create new account. Sends verification email. | No |
| `POST` | `/auth/verify-otp` | Verify email with 6-digit code. | No |
| `GET` | `/auth/me` | Get current user profile. | Yes |

---

## Trademark Cases (`/cases`)
The core engine for managing trademark lifecycles.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/cases` | List cases. Query params: `q` (search), `status`, `jurisdiction`. |
| `POST` | `/cases` | Create case. Can auto-create client if `clientId` is missing. |
| `GET` | `/cases/:id` | Get full case details, history, assets, and deadlines. |
| `PATCH` | `/cases/:id/status` | Update status (e.g., `FILED`). Auto-generates invoices. |
| `PATCH` | `/cases/:id/flow-stage` | **Workflow Engine**: Moves case through 10-stage lifecycle. Auto-calculates deadlines and fees. |
| `DELETE` | `/cases/:id` | Permanent deletion of case and all related records. |

---

## Clients (`/clients`)
Management of trademark owners/applicants.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/clients` | List clients. Query params: `q`, `type`, `page`, `limit`. |
| `POST` | `/clients` | Create new client. |
| `GET` | `/clients/:id` | Get client details and their associated trademarks. |
| `PATCH` | `/clients/:id` | Update client contact info. |
| `POST` | `/clients/bulk-delete` | Delete multiple clients by ID array. |
| `POST` | `/clients/merge` | Merge two client records (moves all cases/invoices). |

---

## Deadlines & Dashboard
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/dashboard/stats` | Summary counts for the main dashboard. |
| `GET` | `/dashboard/unified` | Combined stats, recent activity, and upcoming deadlines. |
| `GET` | `/deadlines/upcoming` | List pending deadlines. Query param: `days` (default 30). |
| `PATCH` | `/deadlines/:id/complete` | Mark a specific deadline as resolved. |

---

## Oppositions (`/oppositions`)
Tracking third-party challenges to marks.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/oppositions` | List all oppositions. Supports filtering by `status` or `caseId`. |
| `POST` | `/oppositions` | Record a new opposition. Auto-creates response deadlines. |
| `PATCH` | `/oppositions/:id/status` | Update opposition outcome (e.g., `RESOLVED`, `WITHDRAWN`). |
| `DELETE` | `/oppositions/:id` | Soft or permanent delete of an opposition record. |

---

## Financials & Fees
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/fees` | List the global fee schedule for all jurisdictions. |
| `GET` | `/fees/calculate/:jur/:stage` | Calculate expected fees for a specific stage. |
| `GET` | `/fees/case/:caseId` | Calculate total fees incurred by a case to date. |
| `POST` | `/financials/invoices` | Create a manual invoice with multiple items. |
| `GET` | `/financials/invoices` | List all invoices in the system. |

---

## System & Jurisdictions
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/jurisdictions` | List supported countries and their base rules. |
| `GET` | `/jurisdictions/:code/rules` | Detailed legal rules (opposition periods, renewal cycles). |
| `GET` | `/system/health` | API and Database connectivity check. |

---

## Notes & Collaboration
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/notes/case/:caseId` | Get all internal notes for a specific case. |
| `POST` | `/notes` | Create a new note (can be `PRIVATE` or `PUBLIC`). |
| `POST` | `/notes/:id/reply` | Create a threaded reply to an existing note. |
| `PATCH` | `/notes/:id/pin` | Pin important notes to the top of the case file. |

---

## Forms & Automation
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/forms/submit` | Submit a full EIPA form. Auto-creates client, case, and assets. |
| `GET` | `/forms/download/:file` | Secure download of submitted PDF forms. |
| `GET` | `/forms/list/:caseId` | List all official forms associated with a case. |
