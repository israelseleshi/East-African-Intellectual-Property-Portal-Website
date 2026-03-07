/// <reference types="cypress" />

describe('Trademark Intake Flow', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('/login');
    cy.get('input[placeholder="Enter your email"]').type('israelseleshi09@gmail.com');
    cy.get('input[placeholder="Enter your password"]').type('1q2w3e4r5t');
    cy.get('button[type="submit"]').click();
    
    // Wait for the login to complete and redirect to dashboard
    cy.url().should('not.include', '/login');
    // Give global state a tiny moment to register the auth token before moving
    cy.wait(500); 
    
    cy.visit('/eipa-forms');
  });

  it('should validate required fields in intake form', () => {
    cy.get('#submit-button').click();
    cy.get('div').contains('Please select an existing client or enter an applicant name').should('be.visible');
  });

  it('should fill and submit an EIPA trademark application using client dropdown', () => {
    // ==========================================
    // SECTION I: Applicant Information loaded from Database
    // ==========================================
    // Click the Quick load client dropdown
    cy.get('button').contains('Quick load client').click();
    
    // Select first client or specific client "Abebe Bekele"
    cy.get('[role="menuitem"]').contains('Abebe Bekele').click();

    // The name should now be filled. We repeat the English name in the Amharic field
    cy.get('input[placeholder="Enter full legal name in English"]')
      .should('not.have.value', '')
      .invoke('val')
      .then((val) => {
        cy.get('input[placeholder="ሙሉ ስም እዚህ ያስገቡ"]').clear().type(val as string);
      });

    // ==========================================
    // SECTION II: Address Details
    // ==========================================
    // ==========================================
    // SECTION II: Address Details
    // ==========================================
    cy.get('input[placeholder="Enter street address"]').clear().type('Mombasa Road, Industrial Area');
    cy.get('input[placeholder="Enter zone or subcity"]').clear().type('Industrial Area');
    cy.get('input[placeholder="Enter wereda/district"]').clear().type('01');
    cy.get('input[placeholder="Enter city name"]').clear().type('Addis Ababa');
    cy.get('input[placeholder="Enter house no."]').clear().type('123');
    cy.get('input[placeholder="Enter ZIP code"]').clear().type('1000');

    // ==========================================
    // SECTION III: Contact Details
    // ==========================================
    cy.get('input[placeholder="+251 ..."]').clear().type('+251911234567');
    cy.get('input[placeholder="name@example.com"]').clear().type('legal@test.com');
    cy.get('input[placeholder="Enter fax number"]').clear().type('+251112345678');
    cy.get('input[placeholder="Enter P.O. Box"]').clear().type('12345');
    cy.get('input[placeholder="Enter nationality"]').clear().type('Ethiopian');
    cy.get('input[placeholder="Enter residence country"]').clear().type('Ethiopia');

    // ==========================================
    // SECTION IV: Mark Specification
    // ==========================================
    // Scroll to Mark Type section first
    cy.get('span').contains('Goods mark').scrollIntoView();
    cy.get('span').contains('Goods mark').parent().click({force: true});
    
    cy.get('span').contains('Word mark').parent().click({force: true});
    cy.get('span').contains('Figurative mark').parent().click({force: true});

    // Upload Mark Image
    cy.get('input[type="file"]').selectFile('public/eaip-logo.png', { force: true });

    // Mark Description
    cy.get('textarea[placeholder="Describe the visual and literal elements of the mark..."]').clear().type('A trademark featuring coffee beans and the text Coffee Brand Trademark');
    cy.get('input[placeholder="English translation"]').clear().type('Coffee Brand');
    cy.get('input[placeholder="Phonetic pronunciation"]').clear().type('Co-fee Brand');
    cy.get('input[placeholder="e.g., Amharic, Oromo"]').clear().type('N/A');
    cy.get('input[placeholder="e.g., Blue and White"]').clear().type('Black & White');

    // Nice Classification - Click container to open dropdown, then select class 35
    cy.get('#nice-classification').find('div[class*="cursor-text"]').first().click();
    cy.get('input[placeholder="Search classes..."]').should('be.visible');
    cy.contains('Class 35').parent().parent().click();
    cy.get('body').click('topRight');
    cy.wait(500); // Wait for dropdown animation
    
    // Goods & Services
    cy.get('textarea[placeholder="List specific goods and services for the selected classes..."]')
      .clear({force: true})
      .type('Coffee wholesale and retail services', {force: true});

    // ==========================================
    // SECTION V: Disclaimer
    // ==========================================
    cy.get('input[placeholder="የመብት ገደቡን እዚህ ያስገቡ..."]').clear().type('ምንም የተለየ መብት የለም');
    cy.get('input[placeholder="e.g. No claim to exclusive right of use of..."]').clear().type('No claim to exclusive right to use the word "Coffee"');

    // ==========================================
    // SECTION VI: Priority Right Declaration
    // ==========================================
    cy.get('input[type="date"]').first().type('2025-01-15'); 
    cy.get('input[placeholder="Country of first filing"]').clear().type('United Kingdom');
    cy.get('textarea[placeholder="List goods/services covered by priority claim"]').clear().type('Coffee wholesale and retail services');
    cy.get('span').contains('Documents accompany form').parent().click({force: true});

    // ==========================================
    // SECTION VII: Checklist & Signature
    // ==========================================
    cy.get('span').contains('3 identical copies of mark').parent().click({force: true});
    cy.get('span').contains('Power of attorney').parent().click({force: true});
    cy.get('span').contains('Proof of payment').parent().click({force: true});

    cy.get('input[placeholder="Type name for digital signature"]').clear().type('Abebe Bekele');
    cy.get('input[placeholder="DD"]').clear().type('21');
    cy.get('input[placeholder="MM"]').clear().type('02');
    cy.get('input[placeholder="YYYY"]').clear().type('2026');

    // ==========================================
    // SUBMIT
    // ==========================================
    cy.get('#submit-button').click({force: true});
    
    // Verify successful submission redirect and toast
    cy.get('div').contains('Application submitted! Filing number:').should('be.visible');
    cy.url().should('include', '/trademarks/');
  });
});
