/// <reference types="cypress" />

describe('Conflict Tracking & Oppositions', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[placeholder="Enter your email"]').type('israelseleshi09@gmail.com');
    cy.get('input[placeholder="Enter your password"]').type('1q2w3e4r5t');
    cy.get('button[type="submit"]').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    
    // Navigate to a case detail page to access oppositions
    cy.visit('/trademarks');
    cy.get('table tbody tr').first().click();
    // Assuming Oppositions are in a section or tab, if it's a component in the main view
    cy.contains('Oppositions').should('be.visible');
  });

  it('should record a new third-party opposition', () => {
    const opponentName = `Opponent ${Date.now()}`;
    
    cy.button().contains('+ Record Opposition').click();
    
    cy.get('input[label="Opponent Name *"]').type(opponentName);
    cy.get('input[type="date"]').type('2026-03-01');
    cy.get('textarea[placeholder*="Legal grounds"]').type('Likelihood of confusion with existing mark.');
    
    cy.get('button').contains('Record Opposition').click();

    // Verify it appears in the list
    cy.contains(opponentName).should('be.visible');
    cy.get('span').contains('PENDING').should('be.visible');
  });

  it('should calculate opposition response deadline correctly', () => {
    cy.button().contains('+ Record Opposition').click();
    
    // Set an opposition date
    const testDate = '2026-02-01';
    cy.get('input[type="date"]').type(testDate);
    
    // Check if the deadline logic is visible in the form (as per OppositionSection.tsx)
    cy.get('.bg-blue-50').contains('Deadline:').should('be.visible');
    // For Ethiopia (ET), it should be 60 days
    cy.get('.bg-blue-50').should('contain', 'Apr 2, 2026'); // 2026-02-01 + 60 days
  });

  it('should update opposition status to RESPONDED', () => {
    // Find a pending opposition and mark as responded
    cy.get('button').contains('Mark Responded').first().click();
    
    // Verify status updated
    cy.get('span').contains('RESPONDED').should('be.visible');
    cy.contains('✓ Response filed on').should('be.visible');
  });
});
