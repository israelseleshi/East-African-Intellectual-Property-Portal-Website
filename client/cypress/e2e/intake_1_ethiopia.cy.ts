/// <reference types="cypress" />

describe('Trademark Intake - 1. Ethiopia', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[placeholder="Enter your email"]').type('israelseleshi09@gmail.com');
    cy.get('input[placeholder="Enter your password"]').type('1q2w3e4r5t');
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');
    cy.wait(1000); 
    cy.visit('/eipa-forms');
  });

  it('should submit Ethiopia intake with image upload', () => {
    // Applicant
    cy.get('input[placeholder="Enter full legal name in English"]').type('Abyssinia Coffee Exporters Ltd');
    cy.get('input[placeholder="ሙሉ ስም እዚህ ያስገቡ"]').type('አቢሲኒያ ቡና ላኪዎች ኃ/የተ/የግ/ማህበር');

    // Address
    cy.get('input[placeholder="Enter street address"]').type('Bole Road, Ward 03');
    cy.get('input[placeholder="Enter city name"]').type('Addis Ababa');
    cy.get('input[placeholder="Enter ZIP code"]').type('1000');

    // Contact
    cy.get('input[placeholder="+251 ..."]').type('+251911000111');
    cy.get('input[placeholder="name@example.com"]').type('info@abyssiniacoffee.et');
    cy.get('input[placeholder="Enter nationality"]').type('Ethiopian');
    cy.get('input[placeholder="Enter residence country"]').type('Ethiopia');

    // Mark Specification
    cy.get('span').contains('Goods mark').scrollIntoView();
    cy.get('span').contains('Goods mark').parent().click({force: true});
    cy.get('span').contains('Word mark').parent().click({force: true});

    // IMAGE UPLOAD
    cy.get('input[type="file"]').selectFile('public/eaip-logo.png', { force: true });

    // Mark Description
    cy.get('textarea[placeholder="Describe the visual and literal elements of the mark..."]')
      .type('A stylized mountain peak with a sun rising behind it and the text ABYSSINIA.');

    // Nice Classification (Class 30)
    cy.get('#nice-classification').scrollIntoView();
    cy.get('#nice-classification').find('div[class*="cursor-text"]').first().click();
    cy.get('input[placeholder="Search classes..."]').should('be.visible').type('30');
    cy.contains('div', 'Class 30').click({force: true});
    cy.get('body').click('topRight');
    cy.wait(500);
    
    // Goods & Services
    cy.get('textarea[placeholder="List specific goods and services for the selected classes..."]')
      .type('Coffee, tea, cocoa and artificial coffee; rice; spices.', {force: true});

    // V. Priority Right Declaration
    cy.get('input[placeholder="Country of first filing"]').type('United Kingdom');
    cy.get('input[type="date"]').first().type('2025-10-15');
    cy.get('textarea[placeholder="List goods/services covered by priority claim"]').type('Coffee and related beverages');
    cy.get('span').contains('Documents accompany form').parent().click({force: true});

    // Signature
    cy.get('input[placeholder="Type name for digital signature"]').type('Abyssinia Coffee CEO');
    cy.get('input[placeholder="DD"]').type('07');
    cy.get('input[placeholder="MM"]').type('03');
    cy.get('input[placeholder="YYYY"]').type('2026');

    // Submit
    cy.get('#submit-button').contains('Submit application').click({force: true});
    cy.get('div', { timeout: 15000 }).contains('Application submitted!').should('be.visible');
    cy.url().should('include', '/trademarks/');
  });
});
