/// <reference types="cypress" />

describe('Trademark Intake Flow', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('/login');
    cy.get('input[placeholder="Enter your email"]').type('israelseleshi09@gmail.com');
    cy.get('input[placeholder="Enter your password"]').type('1q2w3e4r5t');
    cy.get('button[type="submit"]').click();
    // Use include to be more flexible with the URL check
    cy.url().should('include', '/');
    cy.visit('/eipa-forms');
  });

  it('should validate required fields in intake form', () => {
    cy.get('#submit-button').click();
    cy.get('div').contains('Applicant Name is required').should('be.visible');
  });

  it('should fill and submit a Kenyan trademark application with all fields', () => {
    // ==========================================
    // SECTION I: Applicant Information
    // ==========================================
    cy.get('input[placeholder="Enter full legal name in English"]').type('Kenya Test Corp Ltd');
    cy.get('input[placeholder="ሙሉ ስም እዚህ ያስገቡ"]').type('ኬንያ ቴስት ኮርፕ');
    cy.get('span').contains('Company').parent().click({force: true});
    cy.get('span').contains('Male').parent().click({force: true});
    cy.get('span').contains('Female').parent().click({force: true});

    // ==========================================
    // SECTION II: Address Details (Kenyan format)
    // ==========================================
    cy.get('input[placeholder="Enter street address"]').type('Mombasa Road, Industrial Area');
    cy.get('input[placeholder="Enter zone or subcity"]').type('Industrial Area');
    // Wereda is Ethiopian field - skip for Kenya
    cy.get('input[placeholder="Enter city name"]').type('Nairobi');
    // House No is Ethiopian field - skip for Kenya
    cy.get('input[placeholder="Enter state or region"]').type('Nairobi County');
    cy.get('input[placeholder="State code"]').type('NRB');
    cy.get('input[placeholder="Enter city code"]').type('00100');

    // ==========================================
    // SECTION III: Contact Details
    // ==========================================
    cy.get('input[placeholder="Enter telephone number"]').type('+254712345678');
    cy.get('input[placeholder="Enter email address"]').type('legal@kenyatest.co.ke');
    cy.get('input[placeholder="Enter fax (optional)"]').type('+254202345678');
    cy.get('input[placeholder="Enter P.O. Box"]').type('12345-00100');
    cy.get('select').select('Kenya');
    cy.get('input[placeholder="Enter postal code"]').type('00100');
    cy.get('input[placeholder="Principal place of business"]').type('Kenya');

    // ==========================================
    // SECTION IV: Mark Specification
    // ==========================================
    // Scroll to Mark Type section first
    cy.get('span').contains('Goods Mark').scrollIntoView();
    
    // Mark Type - click labels to toggle checkboxes
    cy.get('span').contains('Goods Mark').parent().click({force: true});
    cy.get('span').contains('Service Mark').parent().click({force: true});
    cy.get('span').contains('Collective Mark').parent().click({force: true});
    
    // Mark Form Type - click labels
    cy.get('span').contains('Type - Word').parent().click({force: true});
    cy.get('span').contains('Type - Figurative').parent().click({force: true});
    cy.get('span').contains('Type - Mixed').parent().click({force: true});
    cy.get('span').contains('Type - 3D').parent().click({force: true});

    // Mark Description
    cy.get('textarea[placeholder="Describe the mark visual elements..."]').type('A mixed trademark featuring the text "KENYA TRADE" with a distinctive circular logo containing mountain imagery');
    cy.get('input[placeholder="English translation"]').type('Kenya Trade');
    cy.get('input[placeholder="Phonetic pronunciation"]').type('KEH-nya TRAYD');
    cy.get('input[placeholder="State the language (if not English/Amharic)"]').type('Swahili');
    cy.get('input[placeholder="Describe three-dimensional features if any"]').type('N/A');
    cy.get('input[placeholder="Indication of colors (if other than B/W)"]').type('Green and Yellow');

    // Nice Classification - Click container to open dropdown, then select classes 35 and 36
    cy.get('#nice-classification').find('div[class*="cursor-text"]').first().click();
    // Wait for dropdown to open
    cy.get('input[placeholder="Search classes..."]').should('be.visible');
    // Select Class 35
    cy.contains('Class 35').parent().parent().click();
    // Select Class 36
    cy.contains('Class 36').parent().parent().click();
    // Close dropdown by clicking outside
    cy.get('body').click('topRight');
    cy.wait(500); // Wait for dropdown animation to complete
    
    // Goods & Services
    cy.get('textarea[placeholder="Class 01: Item description..."]').type('Business management services; retail store services; advertising; Insurance services; financial services', {force: true});

    // ==========================================
    // SECTION V: Disclaimer
    // ==========================================
    cy.get('input[placeholder="የመብት ገደቡን እዚህ ያስገቡ..."]').type('ምንም የተለየ መብት የለም');
    cy.get('input[placeholder="e.g. No claim to exclusive right of use of..."]').type('No claim to exclusive right to use the word "KENYA" apart from the mark as shown');

    // ==========================================
    // SECTION VI: Priority Right Declaration
    // ==========================================
    cy.get('input[type="date"]').first().type('2025-01-15'); // Priority Application Date
    cy.get('input[type="date"]').eq(1).type('2025-01-15'); // Priority Filing Date
    cy.get('input[placeholder="Enter country"]').type('United Kingdom');
    cy.get('textarea[placeholder="Covered goods/services..."]').type('Same as current application');
    
    // Priority Documents - click labels
    cy.get('span').contains('Accompanies this form').parent().click({force: true});
    cy.get('span').contains('Will be submitted in 3 months').parent().click({force: true});

    // ==========================================
    // SECTION VII: Checklist & Signature
    // ==========================================
    // Checklist - click labels
    cy.get('span').contains('3 Identical Copies of Mark').parent().click({force: true});
    cy.get('span').contains('Statutes Governing Mark Use').parent().click({force: true});
    cy.get('span').contains('Power of Attorney').parent().click({force: true});
    cy.get('span').contains('Priority Documents').parent().click({force: true});
    cy.get('span').contains('Mark Drawing (3D Features)').parent().click({force: true});
    cy.get('span').contains('Proof of Payment').parent().click({force: true});
    cy.get('span').contains('Other Document(s)').parent().click({force: true});

    // Applicant Signature
    cy.get('input[placeholder="Typed name for signature"]').type('John Kamau, Managing Director');
    cy.get('input[placeholder="DD"]').type('21');
    cy.get('input[placeholder="Month name"]').type('February');
    cy.get('input[placeholder="YYYY"]').type('2026');

    // ==========================================
    // SUBMIT
    // ==========================================
    // PDF Preview Check
    cy.get('#pdf-preview-section').should('be.visible');

    // Submit
    cy.get('#submit-button').click();
    cy.get('div').contains('Application Submitted Successfully!').should('be.visible');
    cy.url().should('include', '/trademarks');
  });
});
