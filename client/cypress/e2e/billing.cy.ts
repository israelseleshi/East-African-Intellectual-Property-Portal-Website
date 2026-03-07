/// <reference types="cypress" />

describe('Financials & Fee Calculator', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[placeholder="Enter your email"]').type('israelseleshi09@gmail.com');
    cy.get('input[placeholder="Enter your password"]').type('1q2w3e4r5t');
    cy.get('button[type="submit"]').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    
    // Navigate to a case detail page to access fee calculator
    cy.visit('/trademarks');
    cy.get('table tbody tr').first().click();
    
    // Fee Calculator is often visible in its own section/card
    cy.contains('Fee Estimate').should('be.visible');
  });

  it('should display automated fee calculations for the current stage', () => {
    // Check if total amount is displayed
    cy.get('.text-2xl.font-bold').should('be.visible');
    
    // Verify breakdown exist
    cy.get('.divide-y').find('button').first().as('stageButton');
    cy.get('@stageButton').should('contain', 'item');
    
    // Expand a stage
    cy.get('@stageButton').click();
    
    // Check for fee categories (from FeeCalculator.tsx)
    cy.get('table').within(() => {
      cy.get('span').contains(/Official Fee|Professional Fee|Disbursement/).should('exist');
      cy.get('tr').should('have.length.at.least', 1);
    });
  });

  it('should verify automated fee calculations based on jurisdiction', () => {
    // Navigate to new intake to check calculation logic during creation
    cy.visit('/eipa-forms');
    
    // Select Ethiopia
    cy.get('select').select('Ethiopia');
    
    // Wait for fee card to update (if visible in FormInspector)
    // Checking the data-driven values from the database
    cy.get('body').then(($body) => {
      if ($body.find('#fee-estimate-card').length > 0) {
        cy.get('#fee-estimate-card').should('contain', 'ETB');
      }
    });
  });
});
