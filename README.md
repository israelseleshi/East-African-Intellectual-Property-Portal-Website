# EAIP Trademark Practice Management System (TPMS)

<div align="center">
  <img src="client/public/eaip-logo.png" width="320" alt="EAIP Logo" />
  <p><strong>Premium Intellectual Property Management for the Modern Legal Enterprise</strong></p>
  <p><em>Built with Precision for the East African Legal Landscape</em></p>
</div>

---

## 🏛️ Executive Summary
The EAIP Trademark Practice Management System (TPMS) is a mission-critical, enterprise-grade platform specifically engineered for legal professionals managing intellectual property across East Africa. By fusing the **Apple Pro UI** philosophy with rigorous legal logic, the TPMS delivers an unparalleled experience in case tracking, document automation, and financial oversight.

This platform is not merely a tracking tool; it is a high-performance engine designed to handle the complexities of multi-jurisdictional filings, statutory deadline management, and high-fidelity form automation with surgical precision.

---

## 💎 Design Philosophy: Apple Pro UI
The platform is designed following the **Apple Human Interface Guidelines (HIG)**, prioritizing hierarchy, harmony, and clarity.

### Visual Architecture
- **Glassmorphism**: Extensive use of `backdrop-blur` and semi-transparent surfaces to create a sense of depth and focus.
- **Hierarchy**: A clear information hierarchy using weighted typography and color-coding to emphasize mission-critical data.
- **Harmony**: Custom tailored color palette (`#0F2652` primary) that balances authority with modern accessibility.
- **Clarity**: Subtle shadows and premium rounded corners (`rounded-xl` to `rounded-3xl`) that reduce cognitive load during high-density data entry.

### Interaction Model
- **macOS Style Layout**: A sophisticated "Sidebar + Main Detail" architecture providing immediate access to critical tools without context switching.
- **Hit Targets**: Precision-engineered touch targets (minimum 44pt) for fluid interaction.
- **Feedback Systems**: Integrated toast notifications and high-fidelity loading states ensuring the user is never left guessing.

---

## 🚀 Key Performance Pillars

### 1. Advanced Case Lifecycle Management
The heart of TPMS is a sophisticated 9-stage state machine that mirrors the actual legal journey of a trademark in East Africa.

#### The 9-Stage State Machine
1.  **DATA_COLLECTION**: Gathering client DNA and mark specifications.
2.  **FILED**: The transition from internal preparation to official registry record.
3.  **FORMAL_EXAM**: Tracking the initial administrative review.
4.  **SUBSTANTIVE_EXAM**: Monitoring the deep legal uniqueness review.
5.  **PUBLISHED**: The high-stakes opposition window monitoring.
6.  **CERTIFICATE_REQUEST**: Managing the post-publication request phase.
7.  **CERTIFICATE_ISSUED**: Recording the receipt of official protection.
8.  **REGISTERED**: The active protection and monitoring phase.
9.  **RENEWAL**: Long-term maintenance and protection extension.

#### Intelligence-Driven Transitions
- **Contextual Modals**: Dynamic action modals that adapt their fields based on the specific stage transition.
- **Validation**: Strict enforcement of required fields (e.g., Filing Number is required to move to `FILED`).
- **Wave UI**: A custom horizontal timeline providing a macro-view of the matter's progress.

### 2. Strategic Deadline Engine
The TPMS Deadline Engine is mission-critical, ensuring no firm ever misses a statutory window.

#### Interactive Calendar System
- **Full Navigation**: Month-to-month browsing with immediate day-specific task breakdowns.
- **Visual Indicators**: Red-dot deadline markers on the calendar view for rapid identification of busy periods.
- **Filtering**: Intelligent auto-suppression of `COMPLETED` or `SUPERSEDED` tasks to maintain absolute focus on what's next.

#### Jurisdiction-Specific Intelligence
- **Ethiopia (EIPA)**: Automatic calculation of the 60-day opposition window post-publication.
- **Renewal Cycles**: Precision tracking of the 7-year maintenance cycle for active registrations.
- **Urgency Matrix**:
    - **CRITICAL (Red)**: < 7 days remaining.
    - **WARNING (Orange)**: < 30 days remaining.
    - **STABLE (Green)**: > 30 days remaining.

### 3. Form Automation & PDF Intelligence
TPMS eliminates the manual burden of government filings through high-fidelity automation.

#### High-Fidelity Generation
- **EIPA Form 01**: One-click generation of the official Ethiopian application form.
- **Mapping Precision**: Surgical mapping of database fields to PDF coordinates, including multi-line goods/services lists and Nice class checkboxes.
- **Signing Date Logic**: Localized format support (DD MMM YY) for professional physical signature lines.

#### Digital Asset Vault
- **Asset Categorization**: Specialized storage for Logos, Powers of Attorney (POA), Priority Documents, and Certificates.
- **Security**: Assets are served through an authenticated proxy layer, never exposed directly.
- **Persistence**: Complex form states are preserved across sessions, allowing for meticulous review before final generation.

### 4. Enterprise Financial Ledger
A robust billing system designed for law firms, providing a 360-degree view of firm revenue.

#### Professional Invoicing
- **Layout**: High-end PDF invoices with centered EAIP branding and professional typography.
- **Categorization**: Grouped sections for Client Details, Billing Schedules, and Financial Summaries.
- **Customization**: Support for multiple currencies (USD, ETB, KES) and automated exchange rate calculations.

#### Revenue Management
- **Dashboard**: Real-time visualization of Total Revenue, Outstanding Balances (AR), and Monthly Paid totals.
- **Payment Tracking**: Granular recording of payments with support for Bank Transfer, Cash, Check, and Mobile Money.
- **Status Automation**: Automatic invoice status updates based on payment recording.

---

## 🛠️ Technical Architecture

### Frontend Excellence
- **Framework**: React 19 (Modern functional components with Hooks)
- **Engine**: Vite (Lightning-fast development and optimized production builds)
- **Styling**: Tailwind CSS + custom premium design tokens
- **Components**: `shadcn/ui` + `cult-ui` (The pinnacle of React component design)
- **Icons**: `Phosphor Icons` (Duotone weight for professional depth)
- **Typography**: `SF Pro` / `Inter` / `System-UI` hierarchy

### Backend Performance
- **Runtime**: Node.js (Scalable event-driven architecture)
- **Server**: Express.js (High-performance API routing)
- **Database**: MySQL (falolega_tpms) with optimized indexing for fuzzy searching
- **Validation**: `Zod` (Strict schema validation for all I/O)
- **Authentication**: Secure JWT strategies with sliding expiration

### Security & Integrity
- **CSRF Protection**: Comprehensive middleware for state-mutating actions.
- **Soft Deletion**: Universal implementation to prevent irreversible data loss.
- **Audit Logging**: Immutable history logs for every critical case modification.
- **Input Sanitization**: Multi-layer protection against XSS and SQL Injection.

---

## 📈 Data Mobility & Enterprise Exports
Data ownership is a priority. TPMS provides comprehensive export capabilities.

### 👥 Client CRM Export
- **Full Metadata**: Export every column including Local Name, Nationality, Type, and contact info.
- **Format**: Optimized CSV for Excel/Numbers integration.
- **Accessibility**: One-click export directly from the high-density client list.

### 📑 Matter Docket Export
- **Operational View**: Export the entire trademark docket with current stages, filing numbers, and next action dates.
- **Contextual Search**: Exported data respects active filters and search queries.

---

## 📂 System Directory Structure

```text
├── client/                 # React 19 Frontend
│   ├── src/
│   │   ├── api/            # Configured axios instances & endpoints
│   │   ├── components/     # High-fidelity Apple Pro UI components
│   │   ├── hooks/          # Custom business logic & data hooks
│   │   ├── pages/          # Mission-critical application views
│   │   ├── shared/         # Universal types and constants
│   │   └── utils/          # PDF generation & date-fns engines
├── server/                 # Express.js Backend
│   ├── src/
│   │   ├── database/       # Schema definitions & DB connectors
│   │   ├── middleware/     # Security, Auth & Validation layers
│   │   ├── repositories/   # Data access logic (MySQL)
│   │   ├── routes/         # API endpoint definitions
│   │   ├── services/       # Core business & lifecycle logic
│   │   └── utils/          # Logging, Mailing & PDF logic
├── docs/                   # Platform documentation & Migration logs
├── scripts/                # PowerShell deployment & backup automation
└── README.md               # Executive documentation
```

---

## 🚀 Deployment & Sustainability

### Infrastructure
- **Production Host**: `eastafricanip.com`
- **Process Manager**: Phusion Passenger
- **Reliability**: Keep-warm cron jobs ensuring zero cold-start latency.
- **Backups**: Daily automated SQL dumps for data integrity.

### Sync Workflow
1.  **Stage**: `npm run build`
2.  **Commit**: `git commit -m "feat: refinement"`
3.  **Sync**: `git push origin main`
4.  **Deploy**: `./scripts/deploy.ps1` (One-click SSH-powered deployment)

---

## ⚖️ Legal & Compliance
This software is proprietary and purpose-built for **East African Intellectual Property**. It adheres to the specific legal workflows of the Ethiopian Intellectual Property Authority (EIPA) and surrounding jurisdictions.

---
**EAIP Trademark Practice Management System**
*Digital Precision for the Future of African IP*

---
*(Documentation refined Mar 13, 2026 - v2.4.0)*
