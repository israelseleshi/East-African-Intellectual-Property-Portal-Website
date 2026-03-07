/// <reference types="cypress" />

describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should successfully login and logout', () => {
    // 1. Fill login form using the exact placeholders from LoginPage.tsx
    cy.get('input[placeholder="Enter your email"]').type('israelseleshi09@gmail.com');
    cy.get('input[placeholder="Enter your password"]').type('1q2w3e4r5t');
    cy.get('button[type="submit"]').contains('LOG IN TO DASHBOARD').click();

    // 2. Verify redirect to Dashboard
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    
    // Check for user name in TopBar
    cy.get('header').should('contain', 'Israel Seleshi');

    // 3. Test Logout (clicking the logout button in TopBar)
    cy.get('button').filter(':has(svg)').last().click({force: true});
    
    // 4. Verify redirect back to login
    cy.url().should('include', '/login');
  });

  it('should show error for invalid credentials', () => {
    cy.get('input[placeholder="Enter your email"]').type('wrong@example.com');
    cy.get('input[placeholder="Enter your password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();

    // Check for error message div structure from LoginPage.tsx
    cy.get('div.bg-red-50').should('be.visible').and('contain', 'Invalid email or password');
  });

  it('should redirect unauthorized users to login', () => {
    cy.visit('/trademarks');
    cy.url().should('include', '/login');
  });
});
