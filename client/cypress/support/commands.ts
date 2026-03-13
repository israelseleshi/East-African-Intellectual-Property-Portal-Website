/// <reference types="cypress" />

Cypress.Commands.add('login', (email, password) => {
  cy.intercept('POST', '**/auth/login').as('loginRequest');
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.wait('@loginRequest', { timeout: 30000 }).its('response.statusCode').should('be.oneOf', [200, 201]);
  cy.url({ timeout: 30000 }).should('not.include', '/login');
});
