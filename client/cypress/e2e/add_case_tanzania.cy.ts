/// <reference types="cypress" />

describe('Trademark Case Management - Tanzania (Form Automation Mock)', () => {
  const caseData = {
    applicantName: 'Kilimanjaro Coffee Exporters Ltd',
    markDescription: 'KILIMANJARO SELECT Premium Coffee',
    markTranslation: 'Kilimanjaro Select',
    markTransliteration: 'Kilimanjaro Select',
    language: 'English/Swahili',
    colorIndication: 'Brown and Dark Green',
    address_street: 'Samora Avenue',
    address_zone: 'Ilala',
    city_name: 'Dar es Salaam',
    house_no: '9112',
    zip_code: '11101',
    po_box: '9112',
    telephone: '+255222123456',
    email: 'logistics@kilimanjarocoffee.co.tz',
    fax: '+255222123457',
    nationality: 'Tanzanian',
    residenceCountry: 'Tanzania',
    goodsServices: 'Premium roasted coffee beans and coffee-based beverages.',
    niceClasses: [30]
  };

  beforeEach(() => {
    cy.login('israelseleshi09@gmail.com', '1q2w3e4r5t');
    cy.visit('/eipa-forms/application-form');
  });

  it('fills all fields and generates a Tanzanian trademark application', () => {
    // 1. Quick Load Client
    cy.get('#quick-client-select button').click();
    cy.contains('div', caseData.applicantName).click();
    // Wait for the form to populate
    cy.get('input[placeholder="Enter full legal name in English"]').should('have.value', caseData.applicantName);

    // 2. Address Section (Already populated)
    cy.get('#address-section').scrollIntoView();
    cy.get('input[placeholder="Enter street address"]').should('not.have.value', '');

    // 3. Contact Section (Loaded from client - do not manually edit client info)
    cy.get('#contact-section').scrollIntoView();
    cy.get('input[placeholder="name@example.com"]').should('exist');

    // 4. Mark Specification Section
    cy.get('#mark-specification-section').scrollIntoView();
    cy.contains('label', 'Goods mark').click();
    cy.contains('label', 'Figurative mark').click();
    
    // Upload Image
    cy.get('input[type="file"]').selectFile('public/flags/tanzania-flag.webp', { force: true });
    
    cy.get('textarea[placeholder="Describe the visual and literal elements of the mark..."]').type(caseData.markDescription);
    cy.get('input[placeholder="English translation"]').type(caseData.markTranslation);
    cy.get('input[placeholder="Phonetic pronunciation"]').type(caseData.markTransliteration);
    cy.get('input[placeholder="e.g., Amharic, Oromo"]').type(caseData.language);
    cy.get('input[placeholder="e.g., Blue and White"]').type(caseData.colorIndication);

    // 5. Nice Classification
    cy.get('#nice-classification').scrollIntoView();
    caseData.niceClasses.forEach(classNo => {
      cy.get('#nice-classification').click();
      cy.get('input[placeholder="Search classes..."]').should('be.visible').clear().type(classNo.toString());
      cy.contains('div', `Class ${classNo}`).should('be.visible').click();
    });
    cy.get('textarea[placeholder="List specific goods and services for the selected classes..."]').type(caseData.goodsServices);

    // 6. Priority
    cy.get('#priority-section').scrollIntoView();
    cy.contains('label', 'Priority country').parent().find('button').click();
    cy.get('input[placeholder="Search countries..."]').should('be.visible').type('Kenya');
    cy.contains('button', 'Kenya').should('be.visible').click();
    cy.get('input[type="date"]').first().type('2026-03-08');
    cy.get('textarea[placeholder="List goods/services covered by priority claim"]').type('Coffee products covered by the priority filing.');
    cy.contains('label', 'Documents accompany form').click();

    // 7. Disclaimer
    cy.get('#disclaimer-section').scrollIntoView();
    cy.get('input[placeholder="የመብት ገደቡን እዚህ ያስገቡ..."]').type('የቃላት መብት ገደብ ይመለከታል።');
    cy.get('input[placeholder="e.g. No claim to exclusive right of use of..."]').type('No claim is made to exclusive right of use of descriptive elements apart from the mark as shown.');

    // 8. Agent (Representative)
    cy.get('#agent-section').scrollIntoView();
    cy.get('input[placeholder="Enter law firm or agent name"]').clear().type('East African IP');
    cy.get('input[placeholder="Enter subcity"]').clear().type('Yeka');
    cy.get('input[placeholder="Enter wereda"]').clear().type('02');
    cy.get('input[placeholder="Enter telephone"]').clear().type('0939423012');
    cy.get('input[placeholder="Enter email"]').clear().type('info@eastafricanip.com');

    // 9. Checklist & Signature
    cy.get('#checklist-section').scrollIntoView();
    cy.contains('label', '3 identical copies of mark').click();
    cy.contains('label', 'Statutes governing mark').click();
    cy.contains('label', 'Power of attorney').click();
    cy.contains('label', 'Proof of payment').click();
    cy.get('input[placeholder="Type name for digital signature"]').type('Kilimanjaro Coffee Exporters Ltd');
    cy.get('input[placeholder="DD"]').type('08');
    cy.get('input[placeholder="MM"]').type('03');
    cy.get('input[placeholder="YYYY"]').type('2026');

    // 10. Preview Check
    cy.get('iframe').should('be.visible');

    // 11. Submit
    cy.contains('button', 'Submit application').click();
    
    // 9. Assertions
    cy.contains('Success').should('be.visible');
    cy.url().should('include', '/trademarks/');
  });
});
