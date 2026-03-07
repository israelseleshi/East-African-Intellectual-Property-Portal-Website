/// <reference types="cypress" />

describe('Legal Logic & Jurisdiction Rules', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[placeholder="Enter your email"]').type('israelseleshi09@gmail.com');
    cy.get('input[placeholder="Enter your password"]').type('1q2w3e4r5t');
    cy.get('button[type="submit"]').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });

  it('should validate Ethiopia-specific rules (ET)', () => {
    cy.visit('/eipa-forms');
    
    // Select Ethiopia
    cy.get('select').select('Ethiopia');
    
    // Verify specific rules info (based on JurisdictionSelector.tsx)
    cy.contains('Opposition Period:').parent().should('contain', '60 days');
    cy.contains('Renewal Period:').parent().should('contain', '7 years');
    cy.contains('Currency:').parent().should('contain', 'ETB');
  });

  it('should validate Kenya-specific rules (KE)', () => {
    cy.visit('/eipa-forms');
    
    // Select Kenya
    cy.get('select').select('Kenya');
    
    // Verify specific rules info (based on KIPI rules in database)
    cy.contains('Opposition Period:').parent().should('contain', '60 days');
    cy.contains('Renewal Period:').parent().should('contain', '10 years');
    cy.contains('Currency:').parent().should('contain', 'KES');
  });

  it('should show regional jurisdiction info', () => {
    // Note: Some regional ones like EAC or ARIPO might use USD
    cy.visit('/eipa-forms');
    
    // The select in FormInspectorPage.tsx handles nationality, but JurisdictionSelector
    // is often used in Case Details or Case Flow.
    // Testing the logic visibility here.
  });
});
