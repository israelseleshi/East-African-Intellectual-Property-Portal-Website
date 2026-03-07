# API Endpoints Documentation

## Base URL
`http://localhost:3000/api` (Local) or `https://eastafricanip.com/api` (Production)

## 1. Authentication
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Login with email/password. Returns JWT. | No |
| `POST` | `/auth/register` | Register a new lawyer/firm. | No |
| `POST` | `/auth/verify-otp` | Verify email with 6-digit code. | No |
| `GET` | `/auth/me` | Get current user profile. | Yes |

## 2. Trademark Cases
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/cases` | List all cases (Recent first). | Yes |
| `POST` | `/cases` | Create a new trademark application. | Yes |
| `GET` | `/cases/:id` | Get full details (including assets, history). | Yes |
| `PATCH` | `/cases/:id/status` | Manual status update. | Yes |
| `PATCH` | `/cases/:id/flow-stage` | **Core Engine**: Move case to next lifecycle stage (e.g., `FILED` -> `FORMAL_EXAM`) and auto-calc deadlines. | Yes |

## 3. Clients (Trademark Owners)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/clients` | List all clients. | Yes |
| `POST` | `/clients` | Add a new client. | Yes |
| `GET` | `/clients/:id` | Get client details. | Yes |
| `PATCH` | `/clients/:id` | Update client contact info. | Yes |

## 4. Deadlines & Dashboard
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard/stats` | Get counts (Active Cases, Urgent Deadlines). | Yes |
| `GET` | `/deadlines/upcoming` | Get deadlines due in next X days (query `?days=30`). | Yes |
| `GET` | `/cases/:id/deadlines` | Get specific deadlines for a case. | Yes |
| `PATCH` | `/deadlines/:id/complete` | Mark a deadline as resolved. | Yes |

---

## 5. 🚧 Proposed Endpoints (To Be Implemented)

### File Uploads (The Vault)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/upload` | Upload a file (Logo, POA). Returns `file_path`. |
| `DELETE` | `/assets/:id` | Remove a file association. |

### Financials (The Ledger)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/invoices` | Generate a new invoice for a client. |
| `GET` | `/invoices` | List invoices (filter by status/client). |
| `GET` | `/invoices/:id/pdf` | Download invoice as PDF. |

### Document Automation (The Factory)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/documents/generate` | Generate a legal form (e.g., `FORM_01`) from case data. |
