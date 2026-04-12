/// <reference types="cypress" />

describe('TS-01: Authentication', () => {
  const loginEmail = 'israelseleshi09@gmail.com';
  const loginPassword = '1q2w3e4r5t';

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('TS-01: Authenticates successfully with valid credentials', () => {
    cy.intercept('POST', '**/api/auth/login').as('loginReq');
    
    cy.visit('/login');
    
    cy.get('input[id="email"]').should('have.attr', 'placeholder', 'Enter your email').type(loginEmail);
    cy.get('input[id="password"]').should('have.attr', 'placeholder', 'Enter your password').type(loginPassword);
    
    cy.get('button[type="submit"]').contains('Sign in').click();

    cy.wait('@loginReq').its('response.statusCode').should('eq', 200);
    
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    cy.contains('h1', 'Dashboard').should('be.visible');
  });
});
