---
trigger: always_on
---
# Cypress Testing Standards for TPMS

## **Core Principles**
- **Speed & Density**: Tests should reflect the "Power User" persona—fast execution, efficient data entry, and dense validation.
- **Realistic Data**: Always use realistic data for jurisdictions (e.g., Ethiopian addresses, Tanzanian TIN numbers).
- **Isolation**: Each test should be independent. Use `cy.request` for setup if possible, or clean up after.
- **Resilience**: Use `data-testid` or robust selectors (text-based, role-based) instead of fragile CSS classes.

## **Naming Conventions**
- **Test Files**: `[action]_[subject]_[jurisdiction].cy.ts` (e.g., `add_client_ethiopia.cy.ts`).
- **Test Descriptions**: Use clear, fact-based descriptions: `describe('Client Management', ...)` and `it('adds a new Ethiopian client with valid data', ...)`.

## **Jurisdiction-Specific Rules**
### **Ethiopia**
- **Address**: Must include Region, City, Sub-city/Zone, and Woreda if required.
- **ID/Tax**: Mention TIN (Taxpayer Identification Number) where applicable.
- **Language**: Test Amharic/Ethiopic character support in text fields.

### **Tanzania**
- **Address**: Include Region (e.g., Dar es Salaam, Arusha).
- **ID/Tax**: TIN is standard.

## **UI/UX Assertions**
- **Apple Pro UI**: Verify presence of high-fidelity elements (e.g., `rounded-xl`, `backdrop-blur` if relevant).
- **Feedback**: Assert on success toasts/notifications after submission.
- **Navigation**: Verify redirect to the detail page of the newly created entity.

## **Workflow Integration**
- **Case Stages**: When testing cases, follow the 11-stage model in `case-workflow.md`.
- **API Calls**: Ensure the frontend uses the relative `/api/*` paths as per project rules.
