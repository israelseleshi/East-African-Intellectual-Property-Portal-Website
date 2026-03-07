/// <reference types="cypress" />

describe('Trademark Intake - 3. Tanzania', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[placeholder="Enter your email"]').type('israelseleshi09@gmail.com');
    cy.get('input[placeholder="Enter your password"]').type('1q2w3e4r5t');
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');
    cy.wait(1000); 
    cy.visit('/eipa-forms');
  });

  it('should submit Tanzania intake with image upload', () => {
    // Applicant
    cy.get('input[placeholder="Enter full legal name in English"]').type('Zanzibar Spice Masters');
    cy.get('input[placeholder="ሙሉ ስም እዚህ ያስገቡ"]').type('Zanzibar Spice Masters');

    // Address
    cy.get('input[placeholder="Enter street address"]').type('Stone Town Main Street');
    cy.get('input[placeholder="Enter city name"]').type('Zanzibar');
    cy.get('input[placeholder="Enter ZIP code"]').type('3101');

    // Contact
    cy.get('input[placeholder="+251 ..."]').type('+255242233445');
    cy.get('input[placeholder="name@example.com"]').type('sales@zanzibarspices.tz');
    cy.get('input[placeholder="Enter nationality"]').type('Tanzanian');
    cy.get('input[placeholder="Enter residence country"]').type('Tanzania');

    // Mark Specification
    cy.get('span').contains('Goods mark').scrollIntoView();
    cy.get('span').contains('Goods mark').parent().click({force: true});
    cy.get('span').contains('Word mark').parent().click({force: true});

    // IMAGE UPLOAD
    cy.get('input[type="file"]').selectFile('public/eaip-logo.png', { force: true });

    // Mark Description
    cy.get('textarea[placeholder="Describe the visual and literal elements of the mark..."]')
      .type('A rectangular logo with various spice illustrations and the text SPICE MASTERS.');

    // Nice Classification (Class 30)
    cy.get('#nice-classification').scrollIntoView();
    cy.get('#nice-classification').find('div[class*="cursor-text"]').first().click();
    cy.get('input[placeholder="Search classes..."]').should('be.visible').type('30');
    cy.contains('div', 'Class 30').click({force: true});
    cy.get('body').click('topRight');
    cy.wait(500);
    
    // Goods & Services
    cy.get('textarea[placeholder="List specific goods and services for the selected classes..."]')
      .type('Spices; preserved herbs; seasonings; condiments.', {force: true});

    // V. Priority Right Declaration
    cy.get('input[placeholder="Country of first filing"]').type('United Kingdom');
    cy.get('input[type="date"]').first().type('2025-10-15');
    cy.get('textarea[placeholder="List goods/services covered by priority claim"]').type('Spices and seasonings');
    cy.get('span').contains('Documents accompany form').parent().click({force: true});

    // Signature
    cy.get('input[placeholder="Type name for digital signature"]').type('Spice Master Admin');
    cy.get('input[placeholder="DD"]').type('07');
    cy.get('input[placeholder="MM"]').type('03');
    cy.get('input[placeholder="YYYY"]').type('2026');

    // Submit
    cy.get('#submit-button').contains('Submit application').click({force: true});
    cy.get('div', { timeout: 15000 }).contains('Application submitted!').should('be.visible');
    cy.url().should('include', '/trademarks/');
  });
});
