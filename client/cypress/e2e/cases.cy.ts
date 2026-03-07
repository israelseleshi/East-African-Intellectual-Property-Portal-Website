/// <reference types="cypress" />

describe('Case Lifecycle Flow', () => {
  beforeEach(() => {
    // 1. Visit Login
    cy.visit('/login');
    
    // 2. Perform Login
    cy.get('input[placeholder="Enter your email"]').type('israelseleshi09@gmail.com');
    cy.get('input[placeholder="Enter your password"]').type('1q2w3e4r5t');
    cy.get('button[type="submit"]').click();
    
    // 3. Verify we are logged in by checking the URL and waiting for the dashboard to load
    cy.url().should('not.include', '/login');
    
    // 4. Explicitly navigate to trademarks and wait for the page to render
    cy.visit('/trademarks');
    
    // 5. Ensure we are on the Trademarks page by checking the header
    // Using a more specific selector for the page header to avoid matching the login header
    cy.get('h1.text-h1').contains('Trademarks', { timeout: 15000 }).should('be.visible');
  });

  it('should search and filter cases in the docket', () => {
    // Intercept search API call to wait for it
    cy.intercept('GET', '**/api/cases*').as('searchCases');

    // Test search functionality using data from intake test
    cy.get('input[placeholder="Search by mark, filing #, or owner..."]').clear().type('Cypress Test');
    
    // Wait for search results to return
    cy.wait('@searchCases');
    
    // Check for search result in the main content area
    cy.get('main').contains('Cypress Test', { timeout: 10000 }).should('be.visible');

    // Test jurisdiction filter
    cy.get('button').contains('Jurisdiction', { matchCase: false }).parent().click({ force: true });
    cy.get('div[role="menuitem"], button').contains('Ethiopia').click({ force: true });
    cy.wait('@searchCases');
    // Check for the Ethiopia text/badge in the results area instead of just 'ET'
    cy.get('main').contains('Ethiopia', { timeout: 10000 }).should('be.visible');

    // Test view toggle
    cy.get('button[title="Grid View"]').click({ force: true });
    cy.get('.grid').should('exist');
    cy.get('button[title="Table View"]').click({ force: true });
    cy.get('table').should('exist');
  });

  it('should navigate to case details and verify tabs', () => {
    cy.intercept('GET', '**/api/cases/*').as('loadCaseDetail');
    cy.intercept('GET', '**/api/cases*').as('loadCases');
    
    cy.visit('/trademarks');
    cy.wait('@loadCases');

    // Search for our test case
    cy.get('input[placeholder="Search by mark, filing #, or owner..."]').clear().type('Cypress Test');
    cy.wait('@loadCases');
    
    // Click on the case row specifically containing our test text
    // Using a more robust selector for the clickable element
    cy.get('main').contains('Cypress Test').scrollIntoView().click({ force: true });
    
    // 3. Verify we are on the details page
    cy.url().should('include', '/trademarks/');
    cy.wait('@loadCaseDetail');
    
    // 4. Check for core components visible in the screenshot
    cy.contains('Documents', { timeout: 15000 }).should('exist');
    cy.contains('Audit History').should('exist');
    cy.contains('Owner Information').should('exist');

    // 5. Test navigation to Lifecycle/Timeline
    cy.get('button').contains('MANAGE LIFECYCLE').click();
    
    // Verify we are on the Case Flow page
    cy.url().should('include', '/case-flow/');
    
    // Check for core lifecycle components visible in CaseFlowPage.tsx
    // The layout has nested scrolling, so we use scrollIntoView and relaxed visibility checks
    cy.contains('Case Lifecycle Management', { timeout: 15000 }).scrollIntoView().should('be.visible');
    
    // Audit log might be further down
    cy.contains('Lifecycle Audit Log').scrollIntoView().should('be.visible');
    
    // Verify the stage tracker is present (using a more unique text from the component)
    cy.contains('Current Status', { matchCase: false }).scrollIntoView().should('be.visible');
  });
});
