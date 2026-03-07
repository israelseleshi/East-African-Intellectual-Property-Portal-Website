/// <reference types="cypress" />

describe('UX & Layout Consistency', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[placeholder="Enter your email"]').type('israelseleshi09@gmail.com');
    cy.get('input[placeholder="Enter your password"]').type('1q2w3e4r5t');
    cy.get('button[type="submit"]').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });

  it('should ensure all pages are scrollable on initial render', () => {
    const pages = ['/', '/trademarks', '/clients', '/invoicing', '/notifications', '/trash', '/help'];
    
    pages.forEach(page => {
      cy.visit(page);
      // Wait for content to render
      cy.get('main').should('exist');
      // Check if main is scrollable or at least visible without layout breaking
      cy.get('main').should('have.css', 'overflow-y', 'auto');
    });
  });

  it('should maintain dark mode consistency across UI elements', () => {
    // 1. Toggle dark mode (looking at TopBar for the toggle button)
    // The toggle is often a button with a Sun/Moon icon
    cy.get('header').find('button').filter(':has(svg)').eq(-2).click(); // Usually second to last button in header
    
    // 2. Check html class
    cy.get('html').should('have.class', 'dark');
    
    // 3. Verify Notification Bell dropdown follows dark mode
    cy.get('button').find('svg').parent().as('bellButton').click();
    cy.get('div').contains('Notifications').closest('.bg-\\[var\\(--eai-surface\\)\\]').should('exist');
    
    // 4. Verify Sidebar consistency
    cy.get('aside').should('have.css', 'background-color').and('not.equal', 'rgb(255, 255, 255)');
  });

  it('should respect Apple Pro UI curved design (rounded-xl)', () => {
    cy.visit('/help');
    // Check if cards have the standard Apple Pro rounding
    cy.get('.apple-card').first().should('have.css', 'border-radius', '12px');
    
    // Check buttons
    cy.get('.apple-button-primary').first().should('have.css', 'border-radius', '8px');
  });
});
