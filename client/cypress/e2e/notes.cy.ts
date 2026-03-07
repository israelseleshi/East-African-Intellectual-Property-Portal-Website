/// <reference types="cypress" />

describe('Collaboration & Case Notes', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[placeholder="Enter your email"]').type('israelseleshi09@gmail.com');
    cy.get('input[placeholder="Enter your password"]').type('1q2w3e4r5t');
    cy.get('button[type="submit"]').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    
    // Navigate to a case detail page to access notes
    cy.visit('/trademarks');
    cy.get('table tbody tr').first().click();
    cy.get('button').contains('Notes').click();
  });

  it('should create a new general note', () => {
    const noteContent = `Cypress Test Note ${Date.now()}`;
    cy.get('textarea[placeholder="Enter note content..."]').type(noteContent);
    cy.get('select').select('GENERAL');
    cy.get('button').contains('Add Note').click();

    // Verify note appears in the list
    cy.contains(noteContent).should('be.visible');
    cy.get('span').contains('General').should('be.visible');
  });

  it('should create a private internal note', () => {
    const privateNote = `Private Internal Note ${Date.now()}`;
    cy.get('textarea[placeholder="Enter note content..."]').type(privateNote);
    cy.get('select').select('INTERNAL');
    cy.get('input[type="checkbox"]').check(); // Mark as private
    cy.get('button').contains('Add Note').click();

    // Verify private badge
    cy.contains(privateNote).parent().within(() => {
      cy.get('span').contains('Private').should('be.visible');
      cy.get('span').contains('Internal Note').should('be.visible');
    });
  });

  it('should reply to a note to create a thread', () => {
    const replyContent = 'This is a test reply';
    
    // Find the first root note and click reply
    cy.get('button').contains('Reply').first().click();
    cy.get('input[placeholder="Write a reply..."]').type(replyContent);
    cy.get('button').contains('Send').click();

    // Verify reply appears with indentation (ml-8 class)
    cy.contains(replyContent).closest('.ml-8').should('be.visible');
  });

  it('should pin a critical note to the top', () => {
    // Select a note and pin it
    cy.get('button[title="Pin"]').first().click();
    
    // Verify pinned badge appears
    cy.get('span').contains('📌 Pinned').should('be.visible');
  });
});
