# EAIP TPMS - East African Intellectual Property Trademark Management System

A comprehensive trademark portfolio management system for East African intellectual property offices, supporting multiple jurisdictions including Ethiopia, Kenya, Tanzania, Uganda, and Rwanda.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Client Management](#client-management)
- [Trademark Case Management](#trademark-case-management)
- [Invoice & Billing](#invoice--billing)
- [Workflow & Case Flow Stages](#workflow--case-flow-stages)
- [Deadlines Management](#deadlines-management)
- [PDF Document Generation](#pdf-document-generation)
- [Trash & Soft Delete](#trash--soft-delete)
- [Dashboard & Analytics](#dashboard--analytics)
- [Fee Schedules](#fee-schedules)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The East African Intellectual Property Trademark Management System (EAIP TPMS) is a full-stack web application designed to streamline the management of trademark portfolios across East African jurisdictions. It provides comprehensive tools for:

- **Client Management**: Track and manage client information with support for individuals, companies, and partnerships
- **Trademark Cases**: Full lifecycle management from application to registration and renewal
- **Multi-Jurisdiction Support**: Ethiopia (ET), Kenya (KE), Tanzania (TZ), Uganda (UG), Rwanda (RW)
- **Billing & Invoicing**: Automated invoice generation, payment tracking, and financial reporting
- **Document Generation**: PDF form generation for EIPA applications
- **Deadline Tracking**: Automated deadline management with reminders
- **Audit Trail**: Complete history tracking for all case activities

---

## Features

### Core Features

#### 1. Authentication & Authorization
- **User Registration** with email verification via OTP
- **Secure Login** with JWT tokens
- **Role-Based Access Control** (Super Admin, Admin, User)
- **Password Reset** via OTP-based verification
- **Session Management** with refresh tokens

#### 2. Client Management
- **Client Profiles**: Store detailed client information
  - Name (English and local language)
  - Type: Individual, Company, Partnership
  - Contact information: Email, Phone, Fax
  - Address: Street, City, Woreda/Zone, House No, PO Box
  - Nationality and residence country
  - Gender (for individuals)
- **Client Search & Filtering**: By name, type, city, nationality
- **Client Merge**: Combine duplicate client records
- **Soft Delete**: Move clients to trash with restore capability
- **Client View**: Display associated trademarks and invoices
- **Selection & Bulk Delete**: Select multiple clients for bulk operations

#### 3. Trademark Case Management
- **Case Creation**: Multi-step form with validation
  - Mark information (name, type, description)
  - Nice Class selection (1-45 classes)
  - Mark image/logo upload
  - Priority claims
  - Agent/representative information
- **Case Status Tracking**: 
  - DRAFT, FILED, FORMAL_EXAM, SUBSTANTIVE_EXAM
  - PUBLISHED, REGISTERED, OPPOSITION, ABANDONED, WITHDRAWN
- **Mark Types**: Word, Figurative/Logo, Mixed, 3D Dimension
- **International Classes**: Full Nice Classification support
- **Bulk Operations**: Select multiple cases for bulk delete
- **Detail View**: Comprehensive case information display with edit disabled when viewing from trash

#### 4. Case Flow Stages (Workflow)
Automated workflow progression through defined stages:
```
DATA_COLLECTION → FILED → FORMAL_EXAM → SUBSTANTIVE_EXAM → PUBLISHED → REGISTERED → RENEWAL
```

Each stage transition can:
- Update case status automatically
- Create associated deadlines
- Generate invoices (if configured)
- Record audit trail entries

#### 5. Nice Classes Management
- **Class Selection**: Support for all 45 Nice Classes
- **Class Descriptions**: Custom descriptions per class
- **Fee Calculation**: Automatic fee computation based on class count
- **Multi-Class Filing**: Support for multi-class applications

#### 6. Deadlines Management
- **Automated Deadline Creation**: Based on jurisdiction rules and stage transitions
- **Deadline Types**:
  - INTAKE_REVIEW
  - FORMAL_EXAM
  - SUBSTANTIVE_EXAM
  - OPPOSITION_WINDOW
  - OFFICE_ACTION_RESPONSE
  - CERTIFICATE_REQUEST
  - RENEWAL
- **Dashboard Widget**: Upcoming deadlines with overdue tracking
- **Mark Complete**: Mark deadlines as done
- **Trash Placeholder**: N/A tab for future implementation

#### 7. Invoice & Billing
- **Invoice Creation**: Multi-line invoices with categories
  - OFFICIAL_FEE
  - PROFESSIONAL_FEE
  - FILING_FEE
  - EXAMINATION_FEE
  - PUBLICATION_FEE
  - REGISTRATION_FEE
  - LEGAL
  - OTHER
- **Invoice Status**: DRAFT, ISSUED, PARTIALLY_PAID, PAID, OVERDUE
- **Payment Recording**: Track payments with method and reference
- **Auto-Invoice**: Generate invoices on stage changes
- **PDF Export**: Generate professional invoice PDFs
- **Currency Support**: USD, EUR, GBP, ETB, KES
- **Selection & Bulk Delete**: Move multiple invoices to trash
- **View from Trash**: View deleted invoice details with edit disabled

#### 8. Fee Schedules
- **Jurisdiction-Based Fees**: Configure fees per country
- **Stage-Based Pricing**: Different fees for different workflow stages
- **Multi-Class Fees**: Base fee + per-class additional fees
- **Date Range**: Effective dates for fee schedules
- **Fee Comparison**: Compare fees across jurisdictions

#### 9. PDF Document Generation
- **EIPA Form Generation**: Complete application forms
- **PDF Templates**: Pre-designed templates per jurisdiction
- **Field Mapping**: Automatic population from case data
- **Signature Date**: DD/MMM/YY format for applicant signatures
- **Download Options**: Generate and download PDFs

#### 10. Case Notes
- **Note Types**: GENERAL, INTERNAL
- **Pinned Notes**: Pin important notes to top
- **Threaded Replies**: Reply to notes with full thread view
- **Soft Delete**: Notes can be archived

#### 11. Case History (Audit Trail)
Complete activity logging:
- Case creation
- Status changes
- Stage transitions
- Invoice creation
- Payment recording
- Note additions
- Deadline completions

#### 12. Oppositions Management
- **Opposition Filing**: Track third-party oppositions
- **Opposition Status**: PENDING, RESPONDED, RESOLVED, WITHDRAWN
- **Automatic Deadlines**: Create response deadlines based on jurisdiction
- **Outcome Tracking**: WON, LOST, WITHDRAWN

#### 13. Jurisdictions
| Code | Country    | Opposition Period | Renewal Years | Grace Period |
|------|------------|------------------|---------------|--------------|
| ET   | Ethiopia   | 60 days          | 7 years       | 6 months     |
| KE   | Kenya      | 90 days          | 10 years      | 12 months    |
| TZ   | Tanzania   | 60 days          | 10 years      | 6 months     |
| UG   | Uganda     | 60 days          | 7 years       | 6 months     |
| RW   | Rwanda     | 90 days          | 10 years      | 6 months     |

#### 14. Dashboard & Analytics
- **Statistics Cards**: Total clients, cases, pending tasks
- **Case Status Distribution**: Visual breakdown
- **Upcoming Deadlines**: Priority list with days remaining
- **Revenue Overview**: Outstanding and paid amounts
- **Recent Activity**: Latest case updates

#### 15. Trash & Soft Delete
Centralized trash management:
- **Tabbed Interface**: Separate tabs for Trademarks, Clients, Invoices, Deadlines
- **View Details**: Click to view deleted item details (edit disabled)
- **Restore**: Recover items from trash
- **Purge**: Permanently delete items
- **Selection**: Bulk select and delete/restore

---

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **Icons**: Phosphor Icons
- **State Management**: React Context + Zustand
- **HTTP Client**: Axios
- **Forms**: React Hook Form + Zod validation
- **Toasts**: Sonner
- **Excel Export**: ExcelJS
- **PDF Generation**: pdf-lib (client-side)

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: MySQL with mysql2 driver
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod
- **Email**: Nodemailer
- **File Upload**: Multer
- **Password Hashing**: bcrypt
- **UUID Generation**: crypto

### Development Tools
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript strict mode

---

## Project Structure

```
EAIP-TPMS/
├── client/                    # React frontend
│   ├── src/
│   │   ├── api/              # API client modules
│   │   │   ├── auth.ts
│   │   │   ├── cases.ts
│   │   │   ├── clients.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── deadlines.ts
│   │   │   ├── documents.ts
│   │   │   ├── financials.ts
│   │   │   ├── financialResolver.ts
│   │   │   ├── httpClient.ts
│   │   │   └── notes.ts
│   │   ├── components/        # Reusable UI components
│   │   │   └── ui/           # shadcn/ui components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility functions
│   │   ├── pages/            # Page components
│   │   │   ├── AuthPage.tsx
│   │   │   ├── BillingPage.tsx
│   │   │   ├── CaseFlowPage.tsx
│   │   │   ├── ClientDetailPage.tsx
│   │   │   ├── ClientsPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── DeadlinesPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── InvoiceDetailPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── NewClientPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── TrashPage.tsx
│   │   │   ├── TrademarkDetailInfoPage.tsx
│   │   │   └── TrademarksPage.tsx
│   │   ├── store/            # Zustand stores
│   │   ├── utils/           # Utility functions
│   │   ├── app/             # App configuration
│   │   │   └── router.tsx   # React Router setup
│   │   └── main.tsx         # React entry point
│   ├── public/              # Static assets
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env                 # Environment variables
│
├── server/                   # Express backend
│   ├── src/
│   │   ├── database/        # Database connection & types
│   │   │   ├── db.ts
│   │   │   └── types.ts
│   │   ├── middleware/       # Express middleware
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── superAdmin.ts
│   │   │   └── softDelete.ts
│   │   ├── repositories/     # Data access layer
│   │   │   ├── caseRepository.ts
│   │   │   ├── clientRepository.ts
│   │   │   ├── feeRepository.ts
│   │   │   └── financialRepository.ts
│   │   ├── routes/          # API routes
│   │   │   ├── auth.ts
│   │   │   ├── cases.ts
│   │   │   ├── clients.ts
│   │   │   ├── deadlines.ts
│   │   │   ├── documents.ts
│   │   │   ├── financials.ts
│   │   │   ├── fees.ts
│   │   │   ├── forms.ts
│   │   │   ├── jurisdictions.ts
│   │   │   ├── niceClasses.ts
│   │   │   ├── notes.ts
│   │   │   ├── oppositions.ts
│   │   │   ├── system.ts
│   │   │   └── upload.ts
│   │   ├── services/        # Business logic
│   │   │   ├── caseLifecycleService.ts
│   │   │   ├── caseQueryService.ts
│   │   │   └── financialService.ts
│   │   ├── utils/           # Utility functions
│   │   │   ├── apiError.ts
│   │   │   ├── constants.ts
│   │   │   ├── filing.ts
│   │   │   ├── mailer.ts
│   │   │   └── validators.ts
│   │   └── server.ts        # Express app setup
│   ├── uploads/             # File uploads (gitignored)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                 # Environment variables
│
├── FEATURE_FLOWS.md          # Feature documentation
├── AUTH_FLOWS.md            # Authentication flows
├── README.md               # This file
└── package.json            # Root package.json for workspaces
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **MySQL**: v8.0 or higher
- **Git**: For version control

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd EAIP-TPMS
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

3. **Configure environment variables**

Server `.env`:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=eaip_tpms

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (for OTP and password reset)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
EMAIL_FROM="EAIP TPMS" <no-reply@eaip.com>

# Frontend URL (for CORS and email links)
CLIENT_URL=http://localhost:5173

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

Client `.env`:
```env
VITE_API_URL=http://localhost:3001/api
```

### Database Setup

1. **Create the database**
```sql
CREATE DATABASE eaip_tpms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. **Import the schema** (if schema file exists)
```bash
cd server
mysql -u root -p eaip_tpms < schema.sql
```

3. **Run database migrations** (if using migrations)
```bash
cd server
npm run migrate
```

### Running the Application

**Development Mode**

```bash
# Start the server (from server directory)
npm run dev

# Start the client (from client directory)  
npm run dev
```

The server will run on `http://localhost:3001` and the client on `http://localhost:5173`.

**Production Mode**

```bash
# Build the client
cd client && npm run build

# Start the server
cd server && npm start
```

---

## API Documentation

### Base URL
```
Development: http://localhost:3001/api
Production:  https://your-domain.com/api
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/verify-otp` | Verify email OTP |
| POST | `/auth/login` | User login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout user |
| POST | `/auth/forgot-password` | Request password reset OTP |
| POST | `/auth/reset-password` | Reset password with OTP |

### Client Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/clients` | List clients (paginated, searchable) |
| GET | `/clients/:id` | Get client details |
| POST | `/clients` | Create client |
| PATCH | `/clients/:id` | Update client |
| DELETE | `/clients` | Bulk soft delete |
| DELETE | `/clients/:id/permanent` | Permanent delete |
| POST | `/clients/:id/restore` | Restore from trash |
| GET | `/clients/trash` | List deleted clients |
| POST | `/clients/merge` | Merge duplicate clients |
| GET | `/clients/duplicates` | Find duplicate clients |

### Trademark Case Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cases` | List cases (searchable, filterable) |
| GET | `/cases/:id` | Get case details |
| POST | `/cases` | Create case |
| PATCH | `/cases/:id` | Update case |
| PATCH | `/cases/:id/status` | Update status |
| PATCH | `/cases/:id/flow-stage` | Advance flow stage |
| DELETE | `/cases/:id` | Soft delete |
| POST | `/cases/bulk-delete` | Bulk soft delete |
| POST | `/cases/:id/restore` | Restore from trash |
| DELETE | `/cases/:id/permanent` | Permanent delete |
| GET | `/cases/trash` | List deleted cases |

### Invoice Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/financials/invoices` | List invoices |
| GET | `/financials/invoices/:id` | Get invoice details |
| POST | `/financials/invoices` | Create invoice |
| PATCH | `/financials/invoices/:id` | Update invoice |
| DELETE | `/financials/invoices/:id` | Soft delete |
| POST | `/financials/invoices/:id/restore` | Restore from trash |
| GET | `/financials/invoices/trash` | List deleted invoices |
| POST | `/financials/payments` | Record payment |
| GET | `/financials/payments/invoice/:id` | List payments |

### Fee Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/fees` | List fee schedules |
| GET | `/fees/calculate/:jurisdiction/:stage` | Calculate fee |
| GET | `/fees/case/:caseId` | Calculate case fees |
| POST | `/fees` | Create fee schedule |
| PATCH | `/fees/:id` | Update fee schedule |
| DELETE | `/fees/:id` | Soft delete |

### Other Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/deadlines/upcoming` | List upcoming deadlines |
| PATCH | `/deadlines/:id/complete` | Mark complete |
| GET | `/jurisdictions` | List jurisdictions |
| GET | `/jurisdictions/:code` | Get jurisdiction details |
| GET | `/notes/case/:caseId` | List case notes |
| POST | `/notes` | Create note |
| GET | `/oppositions` | List oppositions |
| POST | `/oppositions` | Create opposition |
| GET | `/dashboard/stats` | Dashboard statistics |
| GET | `/system/trash` | Get all trash items |

---

## Authentication

### Registration Flow

```
1. User submits registration form
   POST /auth/register { email, password, fullName }

2. Server creates user (unverified)
   - Hash password with bcrypt
   - Generate verification OTP (6 digits)
   - Send OTP via email
   - Return success message

3. User verifies OTP
   POST /auth/verify-otp { email, otp }

4. Server validates OTP
   - Mark user as verified
   - Return JWT tokens
```

### Login Flow

```
1. User submits credentials
   POST /auth/login { email, password }

2. Server validates
   - Verify credentials
   - Check if user is verified
   - Generate access token (15 min)
   - Generate refresh token (7 days)
   - Store refresh token hash

3. Return tokens
   { accessToken, refreshToken }
```

### Password Reset Flow (OTP-Based)

```
1. User requests reset
   POST /auth/forgot-password { email }

2. Server generates OTP
   - 6-digit code
   - 10-minute expiry
   - Store hashed in database

3. User submits OTP + new password
   POST /auth/reset-password { email, otp, newPassword }

4. Server validates and updates
   - Verify OTP
   - Check expiry
   - Update password
   - Invalidate OTP
```

---

## Client Management

### Client Data Model

```typescript
interface Client {
  id: string;
  name: string;
  localName?: string;
  type: 'INDIVIDUAL' | 'COMPANY' | 'PARTNERSHIP';
  gender?: 'MALE' | 'FEMALE';
  nationality: string;
  residenceCountry?: string;
  email?: string;
  telephone?: string;
  fax?: string;
  addressStreet?: string;
  addressZone?: string;
  wereda?: string;
  houseNo?: string;
  city?: string;
  stateName?: string;
  cityCode?: string;
  stateCode?: string;
  zipCode?: string;
  poBox?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Bulk Operations

```typescript
// Delete multiple clients
DELETE /clients
Body: { ids: ['uuid1', 'uuid2', 'uuid3'] }

// Merge two clients
POST /clients/merge
Body: { sourceId: 'uuid1', targetId: 'uuid2' }
// All cases and invoices from source are transferred to target
// Source client is soft-deleted
```

---

## Trademark Case Management

### Case Data Model

```typescript
interface TrademarkCase {
  id: string;
  clientId: string;
  markName: string;
  markType: 'WORD' | 'LOGO' | 'MIXED' | 'THREE_DIMENSION';
  markDescription?: string;
  colorIndication?: string;
  translation?: string;
  transliteration?: string;
  jurisdiction: string; // ET, KE, TZ, UG, RW
  status: CaseStatus;
  flowStage: FlowStage;
  filingNumber?: string;
  filingDate?: Date;
  registrationNumber?: string;
  registrationDate?: Date;
  expiryDate?: Date;
  priorityCountry?: string;
  priorityFilingDate?: Date;
  agentId?: string;
  markImage?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Nice Classes

```typescript
interface NiceClassMapping {
  id: string;
  caseId: string;
  classNo: number; // 1-45
  description?: string;
}
```

### Bulk Operations

```typescript
// Delete multiple cases
POST /cases/bulk-delete
Body: { ids: ['uuid1', 'uuid2', 'uuid3'] }

// All selected cases are soft-deleted
// They appear in Trash page for potential restore
```

---

## Invoice & Billing

### Invoice Data Model

```typescript
interface Invoice {
  id: string;
  clientId: string;
  invoiceNumber: string;
  currency: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  issueDate: Date;
  dueDate: Date;
  notes?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface InvoiceItem {
  id: string;
  invoiceId: string;
  caseId?: string;
  description: string;
  category: 'OFFICIAL_FEE' | 'PROFESSIONAL_FEE' | 'FILING_FEE' | ...;
  amount: number;
}

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHECK' | 'CARD';
  referenceNumber?: string;
  notes?: string;
}
```

---

## Workflow & Case Flow Stages

### Stage Definitions

```typescript
const CASE_FLOW_STAGES = {
  DATA_COLLECTION: {
    status: 'DRAFT',
    next: 'FILED',
    deadlineType: 'INTAKE_REVIEW',
    deadlineDays: 7
  },
  FILED: {
    status: 'FILED',
    next: 'FORMAL_EXAM',
    deadlineType: 'FORMAL_EXAM',
    deadlineDays: 30
  },
  FORMAL_EXAM: {
    status: 'FORMAL_EXAM',
    next: 'SUBSTANTIVE_EXAM',
    // deadline based on jurisdiction
  },
  SUBSTANTIVE_EXAM: {
    status: 'SUBSTANTIVE_EXAM',
    next: 'PUBLISHED',
    // deadline = opposition_period_days
  },
  PUBLISHED: {
    status: 'PUBLISHED',
    next: 'REGISTERED',
    // deadline = opposition_period_days
  },
  REGISTERED: {
    status: 'REGISTERED',
    next: 'RENEWAL_DUE',
    // set expiry_date
  },
  RENEWAL_DUE: {
    status: 'RENEWAL',
    next: 'RENEWAL_ON_TIME',
    // deadline = renewal_period_years
  }
};
```

### Stage Advancement

```typescript
// Advance case to next stage
PATCH /cases/:id/flow-stage
Body: {
  stage: 'FORMAL_EXAM',
  triggerDate: '2026-04-12', // optional
  notes: 'Passed formal examination'
}

// Server automatically:
// 1. Updates flow_stage and status
// 2. Creates next deadline
// 3. Generates invoice (if configured)
// 4. Records in case_history
// 5. Returns updated case
```

---

## Deadlines Management

### Deadline Types

```typescript
type DeadlineType = 
  | 'INTAKE_REVIEW'
  | 'FORMAL_EXAM'
  | 'SUBSTANTIVE_EXAM'
  | 'OPPOSITION_WINDOW'
  | 'OPPOSITION_RESPONSE'
  | 'OFFICE_ACTION_RESPONSE'
  | 'CERTIFICATE_REQUEST'
  | 'RENEWAL';

interface Deadline {
  id: string;
  caseId: string;
  type: DeadlineType;
  description?: string;
  dueDate: Date;
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: string;
  deletedAt?: Date;
}
```

### Dashboard Query

```
GET /deadlines/upcoming?days=30&jurisdiction=ET

Response:
{
  deadlines: [...],
  stats: {
    overdue: number,
    dueThisWeek: number,
    dueThisMonth: number
  }
}
```

---

## PDF Document Generation

### EIPA Form Fields

The system generates EIPA (East African Intellectual Property) application forms with the following data mappings:

| PDF Field | Data Source |
|-----------|-------------|
| applicant_name_english | Client name |
| applicant_name_amharic | Client local_name |
| address_street | Client address_street |
| city_name | Client city |
| mark_name | Case mark_name |
| mark_type_word | Case is_word mark |
| mark_type_figurative | Case is_figurative mark |
| priority_country | Case priority_country |
| applicant_sign_day | Form input (DD) |
| applicant_sign_month | Form input (MMM) |
| applicant_sign_year_en | Form input (YY) |

### Generation Flow

```
1. User completes EIPA form
2. Client sends data to server
   POST /forms/submit { caseData, applicantData, niceClasses }
3. Server:
   - Validates all data
   - Generates PDF using pdf-lib
   - Maps form data to PDF fields
   - Saves PDF to uploads directory
   - Updates case record
4. Returns PDF download URL
5. Client downloads PDF
```

---

## Trash & Soft Delete

### Soft Delete Pattern

All major entities support soft delete using the `deleted_at` timestamp:

```sql
-- Soft delete
UPDATE clients SET deleted_at = NOW() WHERE id = ?;

-- List active (non-deleted)
SELECT * FROM clients WHERE deleted_at IS NULL;

-- List trash
SELECT * FROM clients WHERE deleted_at IS NOT NULL;

-- Restore
UPDATE clients SET deleted_at = NULL WHERE id = ?;

-- Permanent delete (only from trash)
DELETE FROM clients WHERE id = ? AND deleted_at IS NOT NULL;
```

### Trash Page Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  Trash Page (Tabbed)                                               │
├──────────────────────────────────────────────────────────────────┤
│  [Trademarks (n)] [Clients (n)] [Invoices (n)] [Deadlines (N/A)] │
├──────────────────────────────────────────────────────────────────┤
│  Item Name     │ Deleted At │ Status │ Actions                    │
│  ─────────────────────────────────────────────────────────────── │
│  [Clickable]  │ DateTime  │ Badge  │ [Restore] [Purge]         │
│                                                                 │
│  Click → Opens detail page with ?fromTrash=true                 │
│  Edit button is DISABLED when fromTrash=true                    │
└──────────────────────────────────────────────────────────────────┘
```

### Viewing Deleted Items

When navigating from Trash page, the detail page:
1. Receives `?fromTrash=true` query parameter
2. Fetches the deleted record (bypassing soft-delete filter)
3. Disables Edit and Delete buttons
4. Shows appropriate indicators

---

## Dashboard & Analytics

### Statistics Endpoint

```
GET /dashboard/stats

Response:
{
  overview: {
    totalClients: number,
    totalCases: number,
    pendingTasks: number,
    overdueDeadlines: number
  },
  caseStatus: {
    draft: number,
    filed: number,
    formalExam: number,
    substantiveExam: number,
    published: number,
    registered: number,
    ...
  },
  upcomingDeadlines: Deadline[],
  recentActivity: Activity[],
  financial: {
    totalOutstanding: number,
    totalPaid: number,
    overdueInvoices: number
  }
}
```

---

## Fee Schedules

### Fee Configuration

```typescript
interface FeeSchedule {
  id: string;
  jurisdiction: string;
  category: string;
  flowStage: string;
  baseFee: number;
  extraClassFee: number;
  currency: string;
  effectiveFrom: Date;
  expiresAt: Date;
  isActive: boolean;
}
```

### Fee Calculation

```typescript
// For 3-class filing in Ethiopia (ET) at FILED stage:
GET /fees/calculate/ET/FILED?extraClasses=2

// Response:
{
  jurisdiction: 'ET',
  stage: 'FILED',
  baseFee: 100,
  extraClasses: 2,
  extraClassFee: 40,
  total: 140,
  currency: 'USD'
}
```

---

## Development

### Running Tests

```bash
# Server tests
cd server
npm test

# Client tests
cd ../client
npm test
```

### Code Quality

```bash
# Lint
cd server && npm run lint
cd ../client && npm run lint

# Type check
cd server && npm run typecheck
cd ../client && npm run typecheck
```

### Building

```bash
# Build client
cd client && npm run build

# The build output is in client/dist/
```

---

## Deployment

### Production Checklist

1. **Environment Variables**
   - [ ] Set `NODE_ENV=production`
   - [ ] Use strong JWT secrets
   - [ ] Configure real SMTP credentials
   - [ ] Set correct `CLIENT_URL`

2. **Database**
   - [ ] Run migrations
   - [ ] Configure connection pooling
   - [ ] Enable SSL connections

3. **Security**
   - [ ] Enable HTTPS
   - [ ] Set secure cookie flags
   - [ ] Configure CORS properly
   - [ ] Review rate limiting

4. **Monitoring**
   - [ ] Set up error logging
   - [ ] Configure health checks
   - [ ] Set up backups

### Docker Deployment (Optional)

```dockerfile
# Dockerfile for server
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Use TypeScript strict mode
- Follow ESLint rules
- Write unit tests for new features
- Update documentation for API changes

---

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## Support

For technical support, please contact:
- Email: support@eastafricanip.com
- Documentation: https://docs.eastafricanip.com

---

## Acknowledgments

- **UI Components**: shadcn/ui
- **Icons**: Phosphor Icons
- **PDF Generation**: pdf-lib
- **Excel Export**: ExcelJS
