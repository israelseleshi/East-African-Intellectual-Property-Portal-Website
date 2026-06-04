/// <reference types="cypress" />

describe('Clients - Soft Delete + Restore', () => {
  const email = Cypress.env('TEST_USER_EMAIL');
  const password = Cypress.env('TEST_USER_PASSWORD');

  // Real client from the dev DB (verified via SELECT against the SSH tunnel)
  const CLIENT_NAME = 'BOND CHEMICALS CO;LTD';
  const CLIENT_ID = '6c9a35b7-6c9a-4c9a-9a-6c9a35b7';

  before(() => {
    if (!email || !password) {
      throw new Error('Missing TEST_USER_EMAIL / TEST_USER_PASSWORD in cypress.env.json');
    }
  });

  beforeEach(() => {
    cy.loginAs(email, password, 'e2e-client-trash');
  });

  it('soft-deletes the client, then restores it from the trash', () => {
    // ---------- 1. Soft delete from /clients ----------
    cy.visit('/clients');
    cy.url().should('include', '/clients');

    // Search to isolate the target client (search is debounced ~500ms)
    cy.get('[data-tour="search-input"]').clear().type(CLIENT_NAME);
    cy.contains(CLIENT_NAME, { timeout: 10000 }).should('be.visible');

    // Click the card's checkbox button (first <button> inside the matching card)
    cy.contains('[data-tour="client-card"]', CLIENT_NAME)
      .find('button')
      .first()
      .click();

    // The selection toolbar should now show "Delete 1"
    cy.contains('button', /^Delete 1$/, { timeout: 5000 }).should('be.visible').click();

    // Confirm in the AlertDialog
    cy.get('[role="alertdialog"]').within(() => {
      cy.contains('button', /^Delete$/).click();
    });

    // Verify the card is no longer in the list
    cy.contains(CLIENT_NAME, { timeout: 10000 }).should('not.exist');

    // ---------- 2. Verify in /trash ----------
    cy.visit('/trash');

    // Switch to the Clients tab
    cy.get('[role="tab"]').contains(/^Clients$/).click();

    // The trashed client should be visible
    cy.contains('tr', CLIENT_NAME, { timeout: 10000 }).should('be.visible');

    // ---------- 3. Restore from trash ----------
    cy.contains('tr', CLIENT_NAME).within(() => {
      cy.contains('button', /^Restore$/).click();
    });

    // Confirm in the AlertDialog
    cy.get('[role="alertdialog"]').within(() => {
      cy.contains('button', /Confirm Restore/i).click();
    });

    // The client should be gone from the trash
    cy.contains('tr', CLIENT_NAME, { timeout: 10000 }).should('not.exist');

    // ---------- 4. Verify back in /clients ----------
    cy.visit('/clients');
    cy.get('[data-tour="search-input"]').clear().type(CLIENT_NAME);
    cy.contains(CLIENT_NAME, { timeout: 10000 }).should('be.visible');
  });
});
