# Project Progress & Feature Checklist: East African IP TPMS

## 1. Project Overview
- [cite_start]**Status:** Planning & Infrastructure [cite: 1]
- **Current Sprint:** Sprint 0 (Foundation & Monorepo)
- **Last Updated:** 2026-02-14

---

## 2. Global System Checklist (FEATURES.md)

### A. Core Database Infrastructure (The Vault)
*Based on `Data.docx` and `Application Form.pdf`*
- [ ] [cite_start]**Multi-Jurisdiction Support:** [cite: 2]
    - [ ] [cite_start]Dropdown menu for Ethiopia, Eritrea, Djibouti, Somalia, Somaliland, Kenya, Tanzania, Uganda, Rwanda, Burundi, Sudan[cite: 2].
- [ ] [cite_start]**Trademark Profile Management:** [cite: 3, 4, 5, 6, 7]
    - [ ] [cite_start]Mark Name (Open Text)[cite: 3].
    - [ ] [cite_start]Mark Type: Word, Figurative, Mixed, 3D, Other[cite: 4, 99, 101].
    - [ ] [cite_start]Use of Mark: Goods, Services, Collective[cite: 5, 86, 87, 90].
    - [ ] [cite_start]Image Asset Management (Logo Upload & Storage)[cite: 6, 93].
    - [ ] [cite_start]Color Logic: Black & White toggle vs. Specific Color Indication[cite: 7, 109].
- [ ] [cite_start]**Nice Classification System:** [cite: 12, 13, 110]
    - [ ] [cite_start]Dropdown for Classes 1–45[cite: 12].
    - [ ] [cite_start]Class-specific Goods/Services description mapping[cite: 13, 110].
- [ ] [cite_start]**Entity Management:** [cite: 9, 11, 42, 71]
    - [ ] [cite_start]**Client Database:** Name, Address (Street, City, Zip), Email, Telephone[cite: 9, 42, 43, 49].
    - [ ] [cite_start]**Agent/Law Firm Details:** Automated Agent mapping for filings[cite: 11, 71, 72].
- [ ] [cite_start]**Priority & Legal Declarations:** [cite: 14, 120]
    - [ ] [cite_start]Convention Priority (Yes/No)[cite: 14].
    - [ ] [cite_start]Priority Date, Application No, and Country tracking[cite: 121, 123].
    - [ ] [cite_start]Disclaimer management for exclusive rights[cite: 114].

### B. Automated Workflow Engine (The Engine)
*Based on `Case Flow Stages.jpg` and `Application.docx`*
- [ ] [cite_start]**Lifecycle State Machine:** [cite: 19]
    - [ ] [cite_start]Status: Intake -> Formal Exam -> Substantive Exam -> Published -> Registered -> Expired[cite: 19].
- [ ] [cite_start]**The "Watchdog" Deadline Engine:** [cite: 15, 18, 20]
    - [ ] [cite_start]**Opposition Window:** Auto-calculate end date from Publication Date[cite: 20].
    - [ ] [cite_start]**Renewal Tracker:** Auto-calculate 10-year validity[cite: 15, 18].
    - [ ] [cite_start]**Next Action Date:** Smart suggestion based on current status[cite: 20].

### C. Document Factory (Form Filler Pro)
*Based on `Application.docx` and `Application Form.pdf`*
- [ ] [cite_start]**Auto-Generation Logic:** [cite: 1]
    - [ ] [cite_start]Map Database fields to `Form 01` (Ethiopian IP Authority)[cite: 32].
    - [ ] [cite_start]Generate New Application PDF[cite: 31].
    - [ ] [cite_start]Generate Renewal Application PDF[cite: 1].
- [ ] [cite_start]**Checklist Verification:** [cite: 130]
    - [ ] [cite_start]Auto-verify if required attachments (POA, Logos, Priority docs) are uploaded[cite: 130, 131, 135].

### D. Financial Ledger (Billing)
*Based on `Sample TM INV.xlsx`*
- [ ] [cite_start]**Fee Calculation Logic:** [cite: 158]
    - [ ] [cite_start]Service Fees[cite: 158].
    - [ ] [cite_start]Official Filing Fees (1st Class vs. Additional Classes)[cite: 158].
    - [ ] [cite_start]Official Registration Fees (1st Class vs. Additional Classes)[cite: 158].
    - [ ] [cite_start]Disbursements (Courier, Publication, Translation, Bank Charges)[cite: 158].
- [ ] [cite_start]**Invoice Management:** [cite: 158]
    - [ ] [cite_start]Multi-currency support (USD/ETB toggle)[cite: 1].
    - [ ] [cite_start]Automatic Invoice Numbering (e.g., FLO0123452025)[cite: 158].

---

## 3. Current Development Progress

### **Phase 0: Foundation**
| Feature | Status | Notes |
| :--- | :--- | :--- |
| Monorepo Initialization | 🟡 In Progress | Setting up apps/web and apps/api |
| .windsurfrules Config | ✅ Completed | System "Brain" active |
| PRD & PLAN Creation | ✅ Completed | Roadmap defined |
| Knowledge Base | ✅ Completed | Implemented with search and regional guides |
| Documentation Review | 🟡 In Progress | Syncing MD files with current implementation |

### **Phase 1: Database & Intake**
| Feature | Status | Source |
| :--- | :--- | :--- |
| Trademark Schema | ⚪ Pending | [cite_start]Based on Data.docx [cite: 1] |
| Client Schema | ⚪ Pending | [cite_start]Based on Owner Details [cite: 9] |
| Multi-Jurisdiction Toggle| ⚪ Pending | [cite_start]Required for Ethiopia/Kenya [cite: 2] |

---

## 4. Error Resolution Log (Fixing `___All_Errors.txt`)
- [ ] [cite_start]**Doc/Folder Management:** Ensure all files (like Social Media Plan) are correctly associated to cases[cite: 25].
- [ ] [cite_start]**Manual Entry Prevention:** All filing forms must be 100% data-driven to stop "Typing Errors"[cite: 1].
- [ ] [cite_start]**Deadline Hard-Stops:** Missed deadlines must trigger system-wide alerts to lawyers[cite: 20].

---

## 5. Deployment Checklist
- [ ] cPanel Node.js Setup
- [ ] SSL Certificate Installation
- [ ] Domain Mapping (eastafricanip.com)