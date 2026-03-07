# EAIP Trade Mark Practice Management System (TPMS)

![TPMS Header](https://images.unsplash.com/photo-1589254065878-42c9da997008?q=80&w=2070&auto=format&fit=crop)

## 🏛 Elevating Intellectual Property Management in East Africa

The **East African IP Practice Management System (TPMS)** is a state-of-the-art, enterprise-grade platform designed specifically for law firms and IP professionals operating in the Ethiopian and Kenyan jurisdictions. Built with a focus on precision, automation, and statutory compliance, TPMS transforms the complex trademark lifecycle into a streamlined, digital workflow.

---

## 🚀 Core Value Proposition

In the traditional IP landscape, managing hundreds of trademarks across multiple jurisdictions leads to "Deadline Anxiety," manual errors in form filling, and fragmented communication. TPMS solves this by providing:

1.  **Statutory Certainty**: Automated deadline calculation based on the specific laws of Ethiopia (Proclamation 501/2006) and Kenya (Trade Marks Act Cap 506).
2.  **Workflow Automation**: One-click generation of official EIPA (Ethiopian Intellectual Property Authority) forms, reducing filing time from hours to minutes.
3.  **Proactive Intelligence**: A unified "Deadlines Engine" that ensures you never miss a renewal or an opposition window.
4.  **Financial Transparency**: Database-driven fee schedules with automatic invoice generation per jurisdiction and stage.
5.  **Collaborative Notes**: Threaded case discussions with privacy controls for internal strategy discussions.
6.  **Opposition Tracking**: Full lifecycle management of third-party oppositions with automatic deadline alerts.

---

## 🛠 Technology Stack

TPMS is built using a modern, scalable, and secure stack:

-   **Frontend**: React 19 with TypeScript, architected for performance and maintainable UI components.
-   **Styling**: High-fidelity "Aesthetic" design system using Vanilla CSS and Tailwind for utility, featuring a premium glassmorphic interface.
-   **Backend**: Node.js & Express with a robust modular routing architecture.
-   **Database**: MySQL (hosted on enterprise-grade infrastructure) for relational data integrity.
-   **Security**: JWT-based authentication with OTP (One-Time Password) verification for critical actions.
-   **Testing**: End-to-end automation with Cypress, ensuring the "EIPA Form Automation" flow is always production-ready.

---

## 📦 Key Functional Modules

### 📋 1. EIPA Form Automation (The "Automator")
The crown jewel of our system. It features a digital twin of the official **EIPA Form 01**.
-   **Live Integration**: As you type applicant and mark data, the official PDF preview updates in real-time.
-   **Nice Class Intelligence**: Built-in picker for the International Classification of Goods and Services (Nice Classification).
-   **Data Synchronization**: Once a form is submitted, it automatically creates a new Trademark Docket and Client record, eliminating double entry.

### 🔄 2. The 10-Stage Case Lifecycle
We have codified the trademark journey into 10 distinct, traceable stages:
1.  **Data Collection**: Gathering initial client instructions.
2.  **Ready to File**: Internal review completed.
3.  **Filed**: Official submission recorded with Filing Number.
4.  **Formal Exam**: Cleanliness check by the registry.
5.  **Substantive Exam**: Uniqueness check by the examiner.
6.  **Amendment Pending (Office Action)**: Handling registry objections.
7.  **Published**: Navigating the "Opposition Window."
8.  **Certificate Request**: Final steps after successful publication.
9.  **Registered**: Post-grant tracking.
10. **Renewal**: Long-term maintenance (7 years for ET, 10 years for KE).

### 📅 3. Smart Deadline Engine
The engine that runs the firm. It calculates dates automatically:
-   **Opposition Windows**: 60 days for Ethiopia, 60 days for Kenya.
-   **Renewal Tracking**: Automatic 6-month pre-expiry alerts.
-   **Context-Aware**: Updates deadlines instantly when a case moves from one stage to another.
-   **Jurisdiction Rules**: Configurable rules per jurisdiction (opposition periods, renewal years, currencies).

### 💰 4. Fee Schedule Management
Database-driven financial management:
-   **Jurisdiction-Specific Fees**: Separate official and professional fees for ET, KE, EAC, ARIPO, WIPO.
-   **Stage-Based Billing**: Automatic fee calculation as cases progress through stages.
-   **Multi-Currency**: Support for ETB, KES, USD.
-   **Historical Tracking**: Fee schedule versioning with effective dates.

### 📝 5. Case Notes & Collaboration
Threaded discussion system for case management:
-   **Note Types**: General, Client Communication, Phone Call, Internal, Strategy.
-   **Threaded Replies**: Reply to notes for organized conversations.
-   **Privacy Controls**: Private notes visible only to internal staff.
-   **Pinning**: Pin important notes to the top of the case file.

### ⚠️ 6. Opposition Tracking
Manage third-party oppositions against your client's marks:
-   **Opponent Details**: Record opponent name, address, representative.
-   **Grounds Documentation**: Store legal grounds for opposition.
-   **Automatic Deadlines**: System calculates response deadlines based on jurisdiction rules.
-   **Status Workflow**: PENDING → RESPONDED → RESOLVED/WITHDRAWN.
-   **Deadline Alerts**: Visual warnings for approaching deadlines.

### 🔔 7. Notification System
Real-time notification system:
-   **Notification Types**: Deadline reminders, status changes, opposition alerts, invoice due.
-   **Delivery Channels**: In-app, email, SMS (configurable).
-   **Read Tracking**: Track notification delivery and read status.
-   **Bell Icon**: Header notification bell with unread badge.

### 🗑️ 8. Soft Delete & Trash
Data protection with recovery options:
-   **Soft Delete**: Records marked as deleted but recoverable.
-   **Trash Bin**: View and restore deleted items.
-   **Permanent Delete**: Option to permanently remove after confirmation.
-   **30-Day Retention**: Automatic cleanup policies.

---

## 📂 Project Structure

```text
TPMS/
├── apps/
│   ├── api/                # Node.js backend
│   │   ├── src/
│   │   │   ├── routes/     # Modular API endpoints
│   │   │   │   ├── cases.ts
│   │   │   │   ├── jurisdictions.ts  # Jurisdiction config
│   │   │   │   ├── notes.ts            # Case notes
│   │   │   │   ├── oppositions.ts      # Opposition tracking
│   │   │   │   ├── fees.ts             # Fee schedules
│   │   │   │   └── notifications.ts    # Notifications
│   │   │   ├── database/   # MySQL connection pool
│   │   │   └── utils/      # Statutory date calculators
│   └── web/                # React/TypeScript frontend
│       ├── src/
│       │   ├── pages/      # Dashboard & forms
│       │   ├── components/ # Reusable UI components
│       │   │   ├── JurisdictionSelector.tsx
│       │   │   ├── CaseNotesTab.tsx
│       │   │   ├── OppositionSection.tsx
│       │   │   ├── FeeCalculator.tsx
│       │   │   ├── NotificationBell.tsx
│       │   │   └── ...
│       │   ├── hooks/      # Custom hooks (useApi)
│       │   └── utils/      # Formatters & helpers
├── docs/                   # Documentation
├── migration.sql           # Database schema
└── .env                    # Environment configuration
```

---

## 🛠 Setup & Installation

### Prerequisites
-   Node.js (v18+)
-   pnpm (v8+)
-   MySQL Instance

### Local Development
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-org/tpms.git
    cd tpms
    ```

2.  **Install Dependencies**:
    ```bash
    pnpm install
    ```

3.  **Environment Setup**:
    Configure your `.env` in the root and `apps/api/` directories. Use the provided `.env.production` as a reference.

4.  **Database Setup**:
    ```bash
    # Run the migration SQL
    mysql -u your_user -p your_database < migration.sql
    ```

5.  **Run the System**:
    ```bash
    pnpm dev:all
    ```
    This launches the API on port 3001 and the Web UI on port 5173.

---

## 🛡 Security & Compliance

TPMS is built with legal confidentiality in mind:
-   **Audit Logging**: Every stage change and date modification is recorded in `case_history` with a timestamp and the acting user's ID.
-   **Soft Deletes**: Data is never permanently lost accidentally.
-   **Data Segregation**: Multi-tenancy ready to ensure firm-wide data integrity.
-   **Environment Protection**: Critical credentials (SMTP, DB passwords) are strictly managed via environment variables.
-   **Private Notes**: Internal discussions can be marked private, hidden from client views.

---

## 📈 Roadmap

### ✅ Completed Phases
- [x] **Phase 1**: Foundation (Soft Deletes, Jurisdictions)
- [x] **Phase 2**: Core Features (Case Notes, Opposition Tracking)
- [x] **Phase 3**: Financial & Notifications (Fee Schedules, Notification System)
- [x] **Phase 4**: Frontend UI Components

### 🚧 Upcoming Phases
- [ ] **Phase 5**: Client Portal (Client-facing status updates)
- [ ] **Phase 6**: Advanced Search (AI-powered similarity checking)
- [ ] **Phase 7**: Document Management (Template system, version control)
- [ ] **Phase 8**: Multi-Firm Support (Multi-tenancy)

---

## 📱 User Interface Features

### New Components (Phase 4)
- **JurisdictionSelector**: Smart dropdown showing jurisdiction rules
- **CaseNotesTab**: Threaded discussions with privacy controls
- **OppositionSection**: Full opposition lifecycle management
- **FeeCalculator**: Real-time fee estimation per case
- **NotificationBell**: Real-time notification center
- **TrashPage**: Soft delete management

### Page Updates
- **Case Detail Page**: Now includes Notes and Oppositions tabs
- **TopBar**: Notification bell with unread count
- **Notifications Page**: Full notification history
- **Help Page**: Comprehensive tutorials for all features

---

## 🤝 Contribution Guidelines

We maintain a high standard of code quality. Prior to submission:
1.  Verify the Cypress automation passes: `pnpm cypress:run`.
2.  Ensure TypeScript types are strict and documented.
3.  Maintain the "Aesthetic" design system tokens.

---

## 📄 License

Proprietary Software - Developed for **East African IP Professionals**.

---

> *"The future of Intellectual Property in Africa is digital, automated, and precise. TPMS is the engine of that future."*
