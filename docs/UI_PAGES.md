To provide a "world-class" experience for lawyers, the UI flow must prioritize **data density** and **logical sequence**. This mapping follows the "Apple Pro" philosophy where tools are powerful but stay out of the way until needed.

---

# **UI_PAGES.md**

## **1. Application Map & User Flow**

The system is structured as a single-page application (SPA) with deep-linked views to ensure speed.

### **1.1 The "Global Sidebar" (Primary Navigation)**

* **Dashboard:** Performance metrics and "Action Needed" items.
* **Trademark Inventory:** The searchable "Vault" of all records.
* **Deadline Watchdog:** Calendar and list view of statutory dates.
* **Form Factory:** Document generation center.
* **Financial Ledger:** Invoicing and fee management.
* **Knowledge Base:** Regional Q&A and legal guides.

---

## **2. Detailed Page Specifications**

### **2.1 Dashboard (The "Control Center")**

* **UX Goal:** Immediate situational awareness.
* **Visuals:**
* **Key Widgets:**
* **Urgent Deadlines:** Countdown cards for Oppositions and Renewals.
* **Active Filings:** Progress bars showing Stage 1 through Stage 6.
* 
**Revenue Overview:** Quick glance at pending vs. paid invoices in USD/ETB.





### **2.2 Trademark Inventory (High-Density List)**

* **UX Goal:** Rapid retrieval of any case.
* **Visuals:**
* **Interaction:**
* **Cmd+K Search:** Global search across Mark Name, Application No, and Client.
* **Inline Filters:** Filter by Jurisdiction (Ethiopia, Kenya, etc.) or Status.
* **Row Action:** Hover to reveal "Quick Generate Invoice" or "Edit Status."



### **2.3 Trademark Detail View (The "Source of Truth")**

* **UX Goal:** Centralize all data from `Data.docx` and `Application Form.pdf`.
* **Layout:** Three-column "Pro" layout.
* **Left Column:** Mark Image, Type, and Nice Classes.
* **Center Column:** Live Timeline (The State Machine) showing the journey from Filing to Registration.
* 
**Right Column:** Client/Owner details and linked documents (POA, Priority Docs) .





### **2.4 Smart Intake Form (Multi-Step Wizard)**

* **UX Goal:** Error-free data entry.
* **Step 1: Jurisdiction & Mark Type:** Select country and type (Word, Logo, etc.).
* 
**Step 2: Owner Info:** Pull from existing Client database or enter new.


* 
**Step 3: Classes & Goods:** Dynamic text areas for Nice Classification descriptions .


* **Step 4: Review & Generate:** Final validation check before "Filing" the digital record.

### **2.5 Financial Ledger (The Invoice Builder)**

* **UX Goal:** Automate the logic from `Sample TM INV.xlsx`.
* **Interaction:**
* **Currency Toggle:** A smooth switch between USD and ETB.
* 
**Automated Items:** One-click addition of "First Class Fee" vs "Additional Class Fee".


* **Preview:** An Apple-style "Receipt" preview before downloading the PDF.



---

## **3. Interactive Logic Flow**

1. **Entry:** Lawyer logs in -> **Dashboard**.
2. **Creation:** Clicks "New Application" -> **Smart Intake Form**.
3. 
**Automation:** Finishes form -> System auto-calculates **Deadlines** and generates **Application Form PDF**.


4. **Monitoring:** System moves mark to "Formal Exam" -> Lawyer sees it in **Trademark Inventory**.
5. 
**Billing:** Lawyer clicks "Generate Invoice" -> **Financial Ledger** pulls class data and generates the bill.



---

## **4. Mobile & iPad Experience**

* **Adaptive UX:** On iPad, the sidebar collapses into a thin icon rail.
* **Touch Targets:** Large, rounded "Status Update" buttons (44pt) for lawyers in the field.

---

### **Summary of UX Interactions**

| Action | Transition | UX Result |
| --- | --- | --- |
| **Searching** | Cmd+K Modal | Instant access without page reload. |
| **Updating Status** | Status Pill Dropdown | Triggers immediate re-calculation of Next Action Date.

 |
| **Switching Currency** | Slide Fade | Visual clarity for multi-currency billing.

 |
| **Uploading Logo** | Drag & Drop Zone | Seamless asset management.

 |

**Next Step:** I can now generate the **Prisma Database Schema** or the **API Endpoints** list to begin the actual code implementation in Windsurf. Which would you like first?