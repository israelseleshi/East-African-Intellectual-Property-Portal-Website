# Product Requirements Document (PRD): East African IP Management System

## 1. Project Overview
**Project Name:** East African IP (EAIP) Practice Management System
**Domain:** eastafricanip.com
**Target Audience:** Lawyers and IP Professionals (Internal Use Only)
**Design Philosophy:** Apple Human Interface Guidelines (HIG) - Clean, Minimal, High-Density.

The EAIP system is a specialized web application designed to manage the entire lifecycle of Trademarks across East African jurisdictions (Ethiopia, Kenya, etc.). It replaces manual document handling with a robust, automated state machine and document generation engine.

---

## 2. Core User Personas
### 2.1 The IP Lawyer
- **Needs:** Rapid data entry, automated deadline tracking, one-click document generation, and clear visibility of case statuses.
- **Pain Points:** Typing errors, missed statutory deadlines, managing multiple jurisdictions with different rules, and version control of filing documents.

---

## 3. Functional Requirements

### 3.1 Trademark Database (The "Vault")
Based on `Data.docx`, the system must store and manage:
- **Jurisdictional Context:** Support for Ethiopia, Kenya, Eritrea, Djibouti, Somalia, etc.
- **Mark Details:** - Mark Type (Word, Figurative, Mixed, 3D, Other).
  - Use of Mark (Goods, Services, Collective).
  - Image Assets (High-res logo storage).
  - Color Claims (Black & White vs. Specific Hex codes).
- **Classification:** Nice Classification (Classes 1–45).
  - Must allow multi-class selection.
  - Must provide a text area for "Description of Goods/Services" per class.
- **Ownership Data:**
  - Applicant details (linked to a global "Client" entity).
  - Legal nature (Corporation, Individual, Partnership).
- **Priority Claims:** - Convention Priority (Yes/No).
  - Priority Date, Country, and Application Number.

### 3.2 Automated Case Flow (The "Engine")
Based on `Case Flow Stages.jpg`, the system must implement a strict State Machine.

#### **Stage 1: Intake & Filing**
- Capture "Filing Date" and "Official Filing Number."
- **Trigger:** System automatically sets "Status" to "Filed."

#### **Stage 2: Formal Examination**
- Field for "Formalities Notice Received Date."
- Options: "Formalities Met" or "Formalities Deficiency Issued."
- **Deadline Logic:** If deficiency is issued, auto-calculate a 30-day response window.

#### **Stage 3: Substantive Examination**
- Track "Office Actions" (Relative or Absolute grounds).
- Capacity to upload the Office Action PDF.

#### **Stage 4: Publication**
- **Critical Logic:** Capture "Publication Date" and "Journal Number."
- **Automation:** System MUST auto-calculate the **Opposition Period** end-date based on jurisdiction (e.g., 60 days for Ethiopia).

#### **Stage 5: Registration**
- Capture "Registration Number" and "Registration Date."
- **Trigger:** Status changes to "Registered."

#### **Stage 6: Maintenance (Renewals)**
- **Automation:** System auto-calculates the **Next Renewal Date** (e.g., 10 years minus 6 months for notice).

### 3.3 Document Automation (The "Factory")
Based on `Application.docx`, the app must feature a "Form Filler Pro" module:
- **Input:** Uses data from the Trademark Database.
- **Output:** Generate pre-filled `.docx` or `.pdf` files for:
  - New Application Form (Ethiopian/Kenyan specific).
  - Renewal Forms.
  - Power of Attorney (POA) templates.
- **Requirement:** Ensure "Typing Errors" are eliminated by pulling data directly from the record.

### 3.4 Financial & Invoicing Module
Based on `Sample TM INV.xlsx`:
- **Fee Management:** - Official Fees (Disbursements to government).
  - Professional Fees (Law firm service charge).
- **Currency Toggle:** Ability to view/generate invoices in **USD** or **ETB** (Ethiopian Birr).
- **Automated Items:** - Calculation of "Additional Class" fees.
  - Tax/VAT calculation (if applicable).

---

## 4. Non-Functional Requirements

### 4.1 UI/UX (Apple Design System)
- **Layout:** Sidebar-driven navigation (macOS style).
- **Theming:** Light/Dark mode support using Apple's system colors.
- **Responsiveness:** Fully functional on iPad Pro and iPhone for lawyers on the move.
- **Components:** Use `shadcn/ui` and `cult-ui` for:
  - Bento Grids for the Dashboard.
  - Translucent "Glassmorphism" sidebars.
  - Smooth "Spring" animations for transitions.

### 4.2 Security & Data Integrity
- **Authentication:** Secure login for lawyers.
- **Audit Logs:** Every change to a trademark status must be logged (Who, What, When).
- **Validation:** Strict regex for application numbers and dates.

### 4.3 Technical Stack
- **Frontend:** React + Vite + TypeScript.
- **UI Components:** Tailwind CSS + Shadcn/ui + Cult UI.
- **Backend:** Node.js (Express) with Prisma ORM.
- **Storage:** Local or Cloud storage for Mark Images and Generated PDFs.
- **Deployment:** Optimized for cPanel/Node.js environments.

---

## 5. Workflow State Machine Logic (Detailed)

| Current Status | Action | Next Status | Deadline Trigger |
| :--- | :--- | :--- | :--- |
| **Draft** | Submit Filing Info | **Filed** | N/A |
| **Filed** | Receive Notice | **Formal Exam** | 30 Days to respond |
| **Formal Exam** | Pass | **Substantive Exam** | N/A |
| **Substantive** | Approval | **Published** | **Opposition Window** (60d) |
| **Published** | No Opposition | **Registered** | **Renewal Date** (10y) |
| **Registered** | Time Elapsed | **Expiring** | 6 Months prior to expiry |

---

## 6. Known Issues to Fix (From `___All_Errors.txt`)
- **File Loss:** Implement a robust file upload/association system so documents are never unlinked from their cases.
- **Date Errors:** All dates must use a standardized ISO format internally but display in `DD/MM/YYYY`.
- **Version Control:** Only the most recent generated application form should be marked as "Active."

---

## 7. SEO & Performance
- **Dynamic Metadata:** For the public-facing knowledge base (Q&A Ethiopia/Kenya), use high-intent keywords: "Trademark Attorney Addis Ababa," "IP Law Kenya."
- **Performance:** Maintain 90+ Lighthouse scores. Lawyers need instant data loading.