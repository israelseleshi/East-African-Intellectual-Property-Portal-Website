# East African IP Management System - Implementation Roadmap

## 1. The Core Concept: "Intake-First" Workflow
The system will now revolve around the **EIPA Form (Intake Wizard)**. There is no separate "Add Trademark" button. Filling the form *is* the process of creating a case.

---

## 2. Required Changes

### A. User Interface (Frontend)

#### 1. Intake Wizard (`/intake`) - *The "EIPA Form"*
- **Current**: Just a form.
- **New Behavior**:
    - **Submit Action**:
        1.  Saves data to `trademark_cases` and `clients`.
        2.  **Auto-Generates PDF**: Creates `[ApplicantName]_Trademark_Form.pdf`.
        3.  **Download Prompt**: Immediately offers the PDF for download.
        4.  **Redirect**: Moves user to the specific **Case Flow Page**.

#### 2. Case Flow Page (`/cases/:id/flow`) - *The "Dashboard"*
- **New Page**:
    - Visualizes the 10-stage lifecycle (Data Collection -> Filed -> Registered).
    - **Color Codes**:
        - 🟢 Green: Completed Stages
        - 🔵 Blue: Current Stage
        - 🟡 Orange: Warning (Deadline approaching)
        - 🔴 Red: Critical (Deadline missed/close)
    - **Actions**: Buttons to "Advance to Next Stage".

#### 3. Billing Page (`/billing`)
- **Updates**:
    - Read-only list of generated invoices.
    - Invoices are now created *automatically* by the system when a case moves stages (e.g., Filing Fee invoice generated when moving to "Filed").

#### 4. Calendar Page (`/calendar`)
- **Updates**:
    - "Subscribe to Calendar" button (for Google/Outlook integration).
    - Displays deadlines calculated by the backend.

#### 5. Help Page (`/help`)
- **New Page**:
    - Simple FAQs and user guide.

---

### B. Database Schema (Backend/cPanel)

**Good News**: The current comprehensive schema (8 tables) is largely sufficient. We just need to ensure the following are created:

1.  **`trademark_cases`**: Already exists.
2.  **`mark_assets`**: Stores the path to the generated `Applicant_Trademark_Form.pdf`.
3.  **`generated_documents`**: Tracks the generation history.
4.  **`invoices` & `invoice_items`**: Stores the auto-generated fees.

**No new tables are strictly required** for the core flow. We can store the "Fee Schedule" (Price List) in the backend code configuration (`server.ts`) for simplicity, rather than creating a complex database table for it right now.

---

## 3. Implementation Steps relative to cPanel

1.  **Update API**: Modify `server.ts` to handle the specific PDF naming (`applicant_name_Trademark_Form.pdf`).
2.  **Restart Node App**: Apply changes on cPanel.
3.  **Upload Templates**: Ensure `form01.docx` is in `apps/api/templates/`.
4.  **Verify Permissions**: Ensure `apps/api/uploads/` is writable.
