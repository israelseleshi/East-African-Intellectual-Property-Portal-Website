/// <reference types="cypress" />

describe('Trademark Case Management - Ethiopia (Form Automation)', () => {
  const caseData = {
    applicantName: 'Ethio Telecom Corporation',
    applicantNameAmharic: 'የኢትዮጵያ ቴሌኮሙኒኬሽን ኮርፖሬሽን',
    markDescription: 'ETHIO-CONNECT 5G Mixed Mark',
    markTranslation: 'Ethio Connect 5G',
    markTransliteration: 'Ye-Ethio Telecom Corporation',
    language: 'Amharic',
    colorIndication: 'Blue, Orange, and White',
    address_street: 'Churchill Road',
    address_zone: 'Arada',
    wereda: '01',
    city_name: 'Addis Ababa',
    house_no: '456',
    zip_code: '1000',
    po_box: '1047',
    telephone: '+251111234567',
    email: 'info@ethiotelecom.et',
    fax: '+251111234568',
    nationality: 'Ethiopia',
    residenceCountry: 'Ethiopia',
    goodsServices: 'Telecommunications services, internet service provider, and networking hardware for 5G connectivity.',
    niceClasses: [9, 38]
  };

  beforeEach(() => {
    cy.login('israelseleshi09@gmail.com', '1q2w3e4r5t');
    cy.visit('/eipa-forms/application-form');
  });

  it('fills all fields and generates an Ethiopian trademark application', () => {
    // 1. Quick Load Client
    cy.get('#quick-client-select button').click();
    cy.contains('div', caseData.applicantName).click();
    
    // Verify automated population from client data instead of re-typing
    cy.get('input[placeholder="Enter full legal name in English"]').should('have.value', caseData.applicantName);
    cy.get('input[placeholder="ሙሉ ስም እዚህ ያስገቡ"]').should('have.value', caseData.applicantNameAmharic);
    
    // 2. Nationality & Type (Verify they are set correctly from client)
    cy.get('#nationality-field').should('contain', caseData.nationality);
    cy.contains('label', 'Company').find('input[type="checkbox"]').should('be.checked');

    // 3. Address Section (Verify auto-population)
    cy.get('#address-section').scrollIntoView();
    cy.get('input[placeholder="Enter street address"]').should('have.value', caseData.address_street);
    cy.get('input[placeholder="Enter zone or subcity"]').should('have.value', caseData.address_zone);
    cy.get('input[placeholder="Enter wereda/district"]').should('have.value', caseData.wereda);
    cy.get('input[placeholder="Enter city name"]').should('have.value', caseData.city_name);
    // Be more robust with the button text check
    cy.get('label').contains('Country of residence').parent().find('button').should(($btn) => {
      expect($btn.text()).to.contain(caseData.residenceCountry);
    });
    cy.get('input[placeholder="Enter house no."]').should('have.value', caseData.house_no);
    cy.get('input[placeholder="Enter ZIP code"]').should('have.value', caseData.zip_code);
    cy.get('input[placeholder="Enter P.O. Box"]').should('have.value', caseData.po_box);

    // 4. Contact Section (Verify auto-population)
    cy.get('#contact-section').scrollIntoView();
    cy.contains('label', 'Telephone').parent().find('input').should('have.value', caseData.telephone);
    cy.get('input[placeholder="name@example.com"]').should('have.value', caseData.email);

    // 5. Mark Specification Section (These ARE case-specific, so we should write them)
    cy.get('#mark-specification-section').scrollIntoView();
    cy.contains('label', 'Service mark').click();
    cy.contains('label', 'Mixed mark').click();
    
    // Upload Image
    cy.get('input[type="file"]').selectFile('public/flags/ethiopia-flag.png', { force: true });
    
    cy.get('textarea[placeholder="Describe the visual and literal elements of the mark..."]').clear().type(caseData.markDescription);
    cy.get('input[placeholder="English translation"]').clear().type(caseData.markTranslation);
    cy.get('input[placeholder="Phonetic pronunciation"]').clear().type(caseData.markTransliteration);
    cy.get('input[placeholder="e.g., Amharic, Oromo"]').clear().type(caseData.language);
    cy.get('input[placeholder="e.g., Blue and White"]').clear().type(caseData.colorIndication);

    // 6. Nice Classification
    cy.get('#nice-classification').scrollIntoView();
    caseData.niceClasses.forEach(classNo => {
      cy.get('#nice-classification').click();
      cy.get('input[placeholder="Search classes..."]').should('be.visible').clear().type(classNo.toString());
      cy.contains('div', `Class ${classNo}`).should('be.visible').click();
    });
    cy.get('textarea[placeholder="List specific goods and services for the selected classes..."]').clear().type(caseData.goodsServices);

    // 7. Priority
    cy.get('#priority-section').scrollIntoView();
    cy.contains('label', 'Priority country').parent().find('button').click();
    cy.get('input[placeholder="Search countries..."]').should('be.visible').type('Kenya');
    cy.get('div[role="dialog"], .absolute').contains('button', 'Kenya').should('be.visible').click();
    cy.get('input[type="date"]').first().type('2026-03-08');
    cy.get('textarea[placeholder="List goods/services covered by priority claim"]').clear().type('Telecommunications services covered by the priority filing.');
    cy.contains('label', 'Documents accompany form').click();

    // 8. Disclaimer
    cy.get('#disclaimer-section').scrollIntoView();
    cy.get('input[placeholder="የመብት ገደቡን እዚህ ያስገቡ..."]').clear().type('የቃላት መብት ገደብ ይመለከታል።');
    cy.get('input[placeholder="e.g. No claim to exclusive right of use of..."]').clear().type('No claim is made to exclusive right of use of descriptive elements apart from the mark as shown.');

    // 9. Agent (Representative)
    cy.get('#agent-section').scrollIntoView();
    cy.get('input[placeholder="Enter law firm or agent name"]').clear().type('East African IP');
    cy.get('input[placeholder="Enter subcity"]').clear().type('Yeka');
    cy.get('input[placeholder="Enter wereda"]').clear().type('02');
    cy.get('input[placeholder="Enter telephone"]').clear().type('0939423012');
    cy.get('input[placeholder="Enter email"]').clear().type('info@eastafricanip.com');

    // 10. Checklist & Signature
    cy.get('#checklist-section').scrollIntoView();
    cy.contains('label', '3 identical copies of mark').click();
    cy.contains('label', 'Statutes governing mark').click();
    cy.contains('label', 'Power of attorney').click();
    cy.contains('label', 'Proof of payment').click();
    cy.get('input[placeholder="Type name for digital signature"]').clear().type('Ethio Telecom Corporation');
    cy.get('input[placeholder="DD"]').clear().type('08');
    cy.get('input[placeholder="MM"]').clear().type('03');
    cy.get('input[placeholder="YYYY"]').clear().type('2026');

    // 11. Preview Check
    cy.get('iframe').should('be.visible');

    // 12. Submit
    cy.contains('button', 'Submit application').click();
    
    // 13. Assertions
    cy.contains('Success').should('be.visible');
    cy.url().should('include', '/trademarks/');
  });
});
