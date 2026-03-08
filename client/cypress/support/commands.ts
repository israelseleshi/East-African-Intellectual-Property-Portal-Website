/// <reference types="cypress" />

Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
  // Ensure we are logged in by checking for a sidebar or dashboard element
  cy.url().should('not.include', '/login');
});
