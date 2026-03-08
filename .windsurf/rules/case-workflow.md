---
description: Definitive 11-stage workflow and timing invariants for the TPMS Case Lifecycle
trigger: always_on
---

# Case Workflow & Lifecycle Management

All development regarding trademark cases, deadlines, and UI tracking MUST follow this 11-stage model.

## 1. Application Stages (Linear)
| Stage | Name | Key Action | Legal Deadline | Required Document |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **DATA_COLLECTION** | Gather Client/Mark info | None | POA, Logo Image |
| **2** | **READY_TO_FILE** | Final Review | None | Generated EIPA Form |
| **3** | **FILED** | Record Submission | 20 Days (Watch for Exam) | Registry Receipt |
| **4** | **SUBSTANTIVE_EXAM** | Record Registry Result | 20 Days (to Result) | Office Action (if Path B) |
| **5** | **PUBLISHED** | Monitor Gazette | 60 Days (Opposition) | Gazette Page Scan |
| **6** | **CERTIFICATE_REQUEST**| Proactive Follow-up | 20 Days (Watch for Cert) | Request Log |
| **7** | **CERTIFICATE_ISSUED** | Upload Official Cert | 30 Days (Expected) | **Registration Certificate** |
| **8** | **RENEWAL_PERIOD** | Long-term Watch | 2,555 Days (7 Years) | None |

## 2. Renewal Stages (Conditional)
| Stage | Name | Condition | Window | Required Document |
| :--- | :--- | :--- | :--- | :--- |
| **9** | **RENEWAL_ON_DATE** | Within 30 days of Expiry | 30 Days | Renewal Form |
| **10**| **RENEWAL_PENALTY** | After 30 days of Expiry | 180 Days | Surcharge Proof |
| **11**| **DEAD_WITHDRAWN** | Terminal State | Immediate | Withdrawal Notice |

## 3. Global Status Overrides (Non-Linear)
Status is independent of Stage. A case can have a Stage of `PUBLISHED` but a Status of `OPPOSED`.
- **ACTIVE**: Normal progression (Stages 3-9).
- **FILED**: Specific to Stage 3.
- **FORMAL_EXAM**: Specific to Stage 4 (Initial).
- **SUBSTANTIVE_EXAM**: Specific to Stage 4 (In-depth).
- **AMENDMENT_PENDING**: Path B in Substantive Exam (90-day response window).
- **PUBLISHED**: Specific to Stage 5.
- **OPPOSED**: Third-party opposition during Publication. Resolution leads back to Stage 6 (if won) or Stage 11 (if lost).
- **CERTIFICATE_REQUEST**: Specific to Stage 6.
- **REGISTERED**: Specific to Stage 7-8.
- **RENEWAL**: Specific to Stage 9-10.
- **ABANDONED**: Missed legal deadline (Exam response or Renewal).
- **WITHDRAWN**: Voluntarily closed from any stage.

## 4. Timing Invariants (Ethiopia/EIPA)
- **Substantive Exam Result**: 20 Days from Filing.
- **Amendment Response**: 90 Days from Office Action.
- **Opposition Window**: Exactly 60 Days from Publication.
- **Opposition Resolution**: Variable. If Won -> Proceed to Stage 6. If Lost -> Stage 11.
- **Certificate Request Window**: 20 Days after Publication ends.
- **Renewal Cycle**: First renewal is at **7 Years (2555 days)**.
- **On-Time Renewal Window**: 30 Days.
- **Penalty Grace Period**: 180 Days (6 Months).

## 5. UI/UX Standards
- **Date Format**: ALWAYS display as `MM/DD/YYYY`.
- **Document Locking**: Uploading the **Registration Certificate** MUST be a requirement to advance to the `RENEWAL_PERIOD` stage.
- **Stage Tracker**: Display all 11 stages in the `CaseStageTracker` component.
