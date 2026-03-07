# The 10-Stage Trademark Lifecycle in TPMS

This document explains the technical and legal logic behind the **10-Stage Case Flow** implemented in TPMS.

---

## 🏗 Workflow Overview

Trademark prosecution in East Africa is a complex, multi-year process. TPMS simplifies this by breaking it down into logical gates. Each gate (stage transition) triggers specific **Statutory Deadlines** and **Data Requirements**.

### 1. DATA_COLLECTION
- **Status**: `DRAFT`
- **Purpose**: Initial intake of client instructions and mark details.
- **Action**: Use the "Form Automation" tool to fill out EIPA Form 01.
- **Exit Gate**: Completion of all mandatory applicant and mark fields.

### 2. READY_TO_FILE
- **Status**: `DRAFT`
- **Purpose**: Internal quality control and document preparation.
- **Action**: Lawyer reviews the PDF, verifies Power of Attorney (POA) and payment receipts.
- **Exit Gate**: "Advance" action triggers the **Filing Modal**.

### 3. FILED
- **Status**: `FILED`
- **Purpose**: Official submission recorded.
- **Action**: Enter the **Filing Number** and **Filing Date**.
- **System logic**: Automatically starts a **30-day Formalities Deadline**.

### 4. FORMAL_EXAM
- **Status**: `FORMAL_EXAM`
- **Purpose**: Registry checks for filing compliance (fees, forms, classifications).
- **System logic**: Calculated based on the transition date.

### 5. SUBSTANTIVE_EXAM
- **Status**: `SUBSTANTIVE_EXAM`
- **Purpose**: Examination for distinctiveness and conflict with existing marks.
- **System logic**: Sets a **120-day "Watch Window"** to track typical registry processing times.

### 6. AMENDMENT_PENDING
- **Status**: `SUBSTANTIVE_EXAM` (Sub-status)
- **Purpose**: Handling an "Office Action" or registry objection.
- **Action**: Triggers a strict **90-day Legal Deadline** for filing a response.
- **Legal Context**: Failure to respond within 90 days results in the case being "Dead/Withdrawn."

### 7. PUBLISHED
- **Status**: `PUBLISHED`
- **Purpose**: Public notice for opposition.
- **Legal Logic**: 
    - **Ethiopia**: 60 days.
    - **Kenya**: 90 days.
- **System logic**: The "Deadlines" page will prioritize these cases as they approach completion.

### 8. CERTIFICATE_REQUEST
- **Status**: `PUBLISHED` (Post-opposition)
- **Purpose**: Requesting the physical certificate after a successful publication.
- **Action**: Confirm that no oppositions were filed.

### 9. CERTIFICATE_ISSUED
- **Status**: `REGISTERED`
- **Purpose**: Finalizing the grant.
- **Action**: Enter the **Certificate Number** and **Registration Date**.
- **System logic**: This date is the "Anchor Date" for all future renewals.

### 10. REGISTERED / RENEWAL
- **Status**: `REGISTERED`
- **Purpose**: Long-term maintenance.
- **System logic**: 
    - **Ethiopia**: Renewal every 7 years.
    - **Kenya**: Renewal every 10 years.
- **Alerts**: The system creates a **Renewal Notice** deadline 6 months before the statutory deadline.

---

## 📊 Data Mapping Table

| Stage | Field Update | Deadline Generated |
| :--- | :--- | :--- |
| **FILED** | `filing_date`, `filing_number` | 30 Days (Formalities) |
| **PUBLISHED** | `publication_date` | 60/90 Days (Opposition) |
| **AMENDMENT** | `next_action_date` | 90 Days (Response) |
| **REGISTERED**| `registration_dt`, `expiry_date` | 7/10 Years (Renewal) |

---

## 🛡 Verification & Audit
Every transition described above is recorded in the `case_history` table:
- `user_id`: Who made the change.
- `action`: `STAGE_CHANGE: [OLD] -> [NEW]`
- `old_data` / `new_data`: JSON snapshots for rollback or audit.
