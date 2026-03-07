---
description: Advanced deadline and statutory calculation logic for Trademark cases
---

# Trademark Deadline Engine Rules

Follow these rules when modifying or creating deadline calculation logic:

- **Source of Truth**: Always use `date-fns` for date manipulations.
- **Jurisdiction Mapping**:
  - **Ethiopia (ET)**: Opposition Window is exactly 60 days post-publication. Renewal is 10 years post-registration.
  - **Kenya (KE)**: Opposition Window is 90 days post-publication. Renewal is 10 years post-registration.
- **Grace Periods**: Implement a 6-month grace period for renewals across all jurisdictions unless specified otherwise in `jurisdictions` table.
- **Notification Logic**: Always generate a `RENEWAL_NOTICE` deadline 6 months BEFORE the actual `expiry_date`.
- **Validation**: Ensure `publication_date` or `registration_dt` exists before triggering calculations to prevent `null` date errors.
