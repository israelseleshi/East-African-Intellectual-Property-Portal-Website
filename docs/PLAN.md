

# **PLAN.md: Technical Roadmap & Implementation Guide**

## **1. Executive Summary**

This plan outlines the 6-phase development cycle for the `eastafricanip.com` platform. The goal is to move from a manual, error-prone document process to a high-speed, automated, and visually stunning "Apple-Pro" grade legal suite.

---

## **2. Phase 0: The Skeleton (Monorepo Setup)**

**Goal:** Establish the monorepo architecture and design tokens.

* [ ] **Workspaces:** Initialize `npm workspaces` for `/apps/web`, `/apps/api`, and `/packages/database`.
* [ ] **Frontend Init:** Setup React 19 + Vite + TypeScript in `apps/web`.
* [ ] **Design System:** - Install `tailwindcss`, `shadcn/ui`, and `cult-ui`.
* Configure `tailwind.config.js` with Apple-style border radii (`2xl`, `3xl`) and system fonts.
* Setup "Inter" or "San Francisco" font family.


* [ ] **Backend Init:** Setup Node.js (Express) with TypeScript in `apps/api`.
* [ ] **Database Setup:** Initialize Prisma with a PostgreSQL or MySQL schema (compatible with cPanel).

---

## **3. Phase 1: The Vault (Trademark Inventory)**

**Goal:** Build the central database where all trademark records live.

* [ ] **Data Modeling:** Create the `Trademark` and `Client` models in Prisma based on `Data.docx`.


* [ ] **The "Bento" Dashboard:**
* Create a dashboard using a Bento Grid layout (from Cult UI) showing high-level stats (Total Marks, Expiring Soon, Pending Oppositions).


* [ ] **Intake Form Pro:**
* Build a multi-step form for new applications covering Name, Type, and Image uploads.


* Implement the "Nice Classification" (1-45) searchable dropdown.


* Support for image uploads (Mark Logos) with preview.




* [ ] **Jurisdiction Logic:** Implement the "Ethiopia/Kenya" toggle that changes required fields (e.g., "Priority Country" for Kenya vs. "Sub-city" for Ethiopia).



---

## **4. Phase 2: The Engine (Case Flow State Machine)**

**Goal:** Implement the logic for automated status tracking and deadlines.

* [ ] **Status Tracker:** - Build a visual "Step Indicator" (Apple-style) showing the current stage of a mark.


* [ ] **Deadline Watchdog:**
* Logic: Calculate **Opposition Deadline** from Publication Date.


* Logic: Calculate **Renewal Deadline** based on Trademark Validity Date.




* [ ] **Automated Alerts:** - Create a "Daily Agenda" for the lawyer showing which marks have deadlines approaching.


* [ ] **State Transitions:** Implement backend logic to restrict status changes (e.g., cannot move to "Registered" without a "Registration Date").



---

## **5. Phase 3: The Factory (Document Automation)**

**Goal:** Auto-fill the `Application.docx` and `Renewal Form.pdf`.

* [ ] **Template Engine:** Setup `docx-templates` or `docxtemplater` for Node.js.
* [ ] **One-Click Generation:**
* Add a "Generate Filing Form" button on the Trademark detail page.
* The system maps database fields (Owner Name, Address, Class) directly onto the templates.




* [ ] **PDF Export:** Ensure all documents are converted to non-editable PDFs before the final download to prevent "Wrong Version" errors.



---

## **6. Phase 4: The Ledger (Financial Module)**

**Goal:** Professional invoicing based on `Sample TM INV.xlsx`.

* [ ] **Invoice Schema:** Create `Invoice` and `LineItem` models.


* [ ] **Fee Logic:**
* Auto-calculate: `Service Fee` + `Official Fee` + `Extra Class Fee`.




* [ ] **Currency Engine:**
* Implement a USD to ETB (Ethiopian Birr) conversion toggle.
* Allow manual override of exchange rates.


* [ ] **UI:** Create a "Clean & Modern" invoice preview screen that mimics the Apple "Wallet" aesthetic.

---

## **7. Phase 5: Knowledge Base & UI Polish**

**Goal:** Integrate the Q&A data and perfect the "Apple UI."

* [ ] **Legal Wiki:** - Convert `Q&A Ethiopia.docx` and `Q&A Kenya.docx` into a searchable internal knowledge base.
* [ ] **Global Search (Cmd+K):** Implement a fast search bar to jump to any trademark by Name, Application Number, or Owner.


* [ ] **Animations:** Add subtle "Layout Transitions" using Framer Motion (via Cult UI) so the app feels fluid.

---

## **8. Phase 6: Security & Deployment**

**Goal:** Launch on `eastafricanip.com`.

* [ ] **Security:** Implement JWT (JSON Web Tokens) for secure lawyer login.
* [ ] **Audit Logs:** Build a "History" tab for every trademark to show who changed what.
* [ ] **cPanel Deployment:** - Build the frontend into a static `/dist` folder.
* Setup the Node.js "Application Manager" in cPanel for the API.


* [ ] **SEO:** Set up `sitemap.xml` and schema markup for "Legal Service."

---

## **9. Development Milestones**

| Milestone | Deliverable | Est. Timeline |
| --- | --- | --- |
| **M1: Setup** | Monorepo + Database Schema | Week 1 |
| **M2: Data** | Trademark CRUD + File Uploads | Week 1-2 |
| **M3: Logic** | Case Flow Engine + Deadlines | Week 2 |
| **M4: Docs** | PDF/Docx Automation | Week 3 |
| **M5: Launch** | Deployment to eastafricanip.com | Week 4 |

---