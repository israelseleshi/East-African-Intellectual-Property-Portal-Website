/// <reference types="cypress" />

describe('System Utilities (Notifications & Trash)', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[placeholder="Enter your email"]').type('israelseleshi09@gmail.com');
    cy.get('input[placeholder="Enter your password"]').type('1q2w3e4r5t');
    cy.get('button[type="submit"]').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });

  describe('Notifications System', () => {
    it('should show notifications in the header bell and notifications page', () => {
      // 1. Check Bell Icon
      cy.get('button').find('svg').parent().as('bellButton');
      cy.get('@bellButton').should('exist');
      
      // 2. Open Dropdown
      cy.get('@bellButton').click();
      cy.get('div').contains('Notifications').should('be.visible');
      
      // 3. Navigate to full page
      cy.get('button').contains('View all notifications').click();
      cy.url().should('include', '/notifications');
      cy.get('h1').contains('Notifications').should('be.visible');
      
      // 4. Test filtering
      cy.get('#filter-tabs').contains('Unread Only').click();
      cy.get('#notification-list').should('exist');
    });
  });

  describe('Trash & Recovery', () => {
    it('should navigate to trash and verify empty state or items', () => {
      cy.visit('/trash');
      cy.get('#trash-header').should('contain', 'Trash');
      
      cy.get('body').then(($body) => {
        if ($body.find('#trash-table').length > 0) {
          cy.get('#trash-table').should('be.visible');
          cy.get('#restore-btn').first().should('be.visible');
        } else {
          cy.contains('Trash is empty').should('be.visible');
        }
      });
    });
  });

  describe('Interactive Tours', () => {
    it('should launch a tour from the help page', () => {
      cy.visit('/help');
      cy.get('h2').contains('Interactive Tours').should('be.visible');
      
      // Launch Dashboard Tour
      cy.get('h3').contains('Dashboard').parent().find('button').contains('Start Tour').click();
      
      // Verify Joyride elements appear
      cy.get('.joyride-step', { timeout: 10000 }).should('exist');
      cy.get('button').contains('Next').should('exist');
    });
  });
});
