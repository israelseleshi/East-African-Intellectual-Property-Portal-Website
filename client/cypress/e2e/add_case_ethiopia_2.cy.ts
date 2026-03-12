/// <reference types="cypress" />

describe('Trademark Case Management - Ethiopia (Form Automation - Case 2)', () => {
  const caseData = {
    // I. Applicant (Individual - Female)
    applicantName: 'Sara Teklehaimanot',
    applicantNameAmharic: 'ሳራ ተክለሃይማኖት',
    nationality: 'Ethiopia',
    residenceCountry: 'Ethiopia',
    isFemale: true,
    address_street: 'Bole Road',
    address_zone: 'Bole',
    wereda: '03',
    city_name: 'Addis Ababa',
    city_code: 'AA',
    state_name: 'Addis Ababa',
    state_code: 'AA',
    house_no: '789/B',
    zip_code: '1000',
    po_box: '5678',
    telephone: '+251911001122',
    email: 'sara.tekle@gmail.com',
    fax: '+251111001123',

    // IV. Details of Mark (Figurative)
    markDescription: 'Stylized "S" with coffee bean patterns around it.',
    markTranslation: 'N/A',
    markTransliteration: 'N/A',
    language: 'English',
    colorIndication: 'Dark Brown and Gold',
    goodsServices: 'Organic roasted coffee beans, grounded coffee, and traditional coffee brewing services.',
    niceClasses: [30, 43],

    // VI. Priority Right
    priorityCountry: 'Kenya',
    priorityDate: '2026-01-15',
    priorityDeclaration: 'Priority claimed based on Kenyan registration for identical goods.',

    // V. Disclaimer
    disclaimerAmharic: 'ለቡና ፍሬ ምስል ልዩ መብት አልተጠየቀም።',
    disclaimerEnglish: 'No claim is made to the exclusive right to use the coffee bean representation apart from the mark as shown.',

    // IX. Agent
    agentName: 'East African IP',
    agentSubcity: 'Yeka',
    agentWereda: '02',
    agentTelephone: '0939423012',
    agentEmail: 'info@eastafricanip.com'
  };

  beforeEach(() => {
    cy.login('israelseleshi09@gmail.com', '1q2w3e4r5t');
    cy.visit('/eipa-forms/application-form');
  });

  it('fills all fields for an individual applicant with a figurative mark', () => {
    // 1. Applicant Section (Quick Load)
    cy.get('#quick-client-select button').click();
    cy.contains('div', caseData.applicantName).click();
    
    // Verify automated population from client data
    cy.get('input[placeholder="Enter full legal name in English"]').should('have.value', caseData.applicantName);
    cy.get('input[placeholder="ሙሉ ስም እዚህ ያስገቡ"]').should('have.value', caseData.applicantNameAmharic);
    
    // Verify radio/button state for Gender (Female)
    // shadcn-ui radio items are often within the same parent as the label or use a sibling relationship
    cy.contains('label', 'Female').invoke('attr', 'for').then((id) => {
      if (id) {
        cy.get(`#${id}`).should('have.attr', 'aria-checked', 'true');
      } else {
        // Fallback: search for the button within the same container
        cy.contains('label', 'Female').closest('div').find('button[role="radio"]').should('have.attr', 'aria-checked', 'true');
      }
    });
    
    cy.get('#nationality-field').should('contain', caseData.nationality);

    // 2. Address Section (Verify auto-population)
    cy.get('#address-section').scrollIntoView();
    cy.get('input[placeholder="Enter street address"]').should('have.value', caseData.address_street);
    cy.get('input[placeholder="Enter zone or subcity"]').should('have.value', caseData.address_zone);
    cy.get('input[placeholder="Enter wereda/district"]').should('have.value', caseData.wereda);
    cy.get('input[placeholder="Enter city name"]').should('have.value', caseData.city_name);
    
    // Check City/State codes on application form
    cy.get('input[placeholder="City code"]').should('have.value', caseData.city_code);
    cy.get('input[placeholder="Enter state/region"]').should('have.value', caseData.state_name);
    cy.get('input[placeholder="State code"]').should('have.value', caseData.state_code);

    cy.get('label').contains('Country of residence').parent().find('button').should('contain', caseData.residenceCountry);
    cy.get('input[placeholder="Enter house no."]').should('have.value', caseData.house_no);
    cy.get('input[placeholder="Enter ZIP code"]').should('have.value', caseData.zip_code);
    cy.get('input[placeholder="Enter P.O. Box"]').should('have.value', caseData.po_box);

    // 3. Contact Section (Verify auto-population)
    cy.get('#contact-section').scrollIntoView();
    cy.contains('label', 'Telephone').parent().find('input').should('have.value', caseData.telephone);
    cy.get('input[placeholder="name@example.com"]').should('have.value', caseData.email);
    cy.get('input[placeholder="Enter fax number"]').should('have.value', caseData.fax);

    // 4. Mark Specification Section (Figurative)
    cy.get('#mark-specification-section').scrollIntoView();
    cy.contains('label', 'Goods mark').click();
    cy.contains('label', 'Figurative mark').click();
    
    // Upload Image (using same placeholder as case 1)
    cy.get('input[type="file"]').selectFile('public/flags/ethiopia-flag.png', { force: true });
    
    cy.get('textarea[placeholder="Describe the visual and literal elements of the mark..."]').clear().type(caseData.markDescription);
    cy.get('input[placeholder="English translation"]').clear().type(caseData.markTranslation);
    cy.get('input[placeholder="Phonetic pronunciation"]').clear().type(caseData.markTransliteration);
    cy.get('input[placeholder="e.g., Amharic, Oromo"]').clear().type(caseData.language);
    cy.get('input[placeholder="e.g., Blue and White"]').clear().type(caseData.colorIndication);

    // 5. Nice Classification
    cy.get('#nice-classification').scrollIntoView();
    caseData.niceClasses.forEach(classNo => {
      cy.get('#nice-classification').click();
      cy.get('input[placeholder="Search classes..."]').should('be.visible').clear().type(classNo.toString());
      cy.contains('div', `Class ${classNo}`).should('be.visible').click();
    });
    cy.get('textarea[placeholder="List specific goods and services for the selected classes..."]').clear().type(caseData.goodsServices);

    // 6. Priority Right
    cy.get('#priority-section').scrollIntoView();
    cy.contains('label', 'Priority country').parent().find('button').click();
    cy.get('input[placeholder="Search countries..."]').should('be.visible').type(caseData.priorityCountry);
    cy.contains('button', caseData.priorityCountry).click();
    cy.get('input[type="date"]').first().type(caseData.priorityDate);
    cy.get('textarea[placeholder="List goods/services covered by priority claim"]').clear().type(caseData.priorityDeclaration);
    cy.contains('label', 'Documents accompany form').click();

    // 7. Disclaimer
    cy.get('#disclaimer-section').scrollIntoView();
    cy.get('input[placeholder="የመብት ገደቡን እዚህ ያስገቡ..."]').clear().type(caseData.disclaimerAmharic);
    cy.get('input[placeholder="e.g. No claim to exclusive right of use of..."]').clear().type(caseData.disclaimerEnglish);

    // 8. Agent Section (Quick Load)
    cy.get('#agent-section').scrollIntoView();
    cy.get('#quick-agent-select').click(); // Clicking the trigger/dropdown
    cy.get('div[role="dialog"], .absolute').contains('div', caseData.agentName).should('be.visible').click();
    
    // Verify agent data auto-population
    cy.get('input[placeholder="Enter law firm or agent name"]').should('have.value', caseData.agentName);
    cy.get('input[placeholder="Enter subcity"]').should('have.value', caseData.agentSubcity);
    cy.get('input[placeholder="Enter wereda"]').should('have.value', caseData.agentWereda);
    cy.get('input[placeholder="Enter telephone"]').should('have.value', caseData.agentTelephone);
    cy.get('input[placeholder="Enter email"]').should('have.value', caseData.agentEmail);

    // 9. Checklist & Signature
    cy.get('#checklist-section').scrollIntoView();
    cy.contains('label', '3 identical copies of mark').click();
    cy.contains('label', 'Power of attorney').click();
    cy.contains('label', 'Proof of payment').click();
    cy.get('input[placeholder="Type name for digital signature"]').clear().type(caseData.applicantName);
    
    // Date breakdown
    const today = new Date();
    cy.get('input[placeholder="DD"]').clear().type(String(today.getDate()).padStart(2, '0'));
    cy.get('input[placeholder="MM"]').clear().type(String(today.getMonth() + 1).padStart(2, '0'));
    cy.get('input[placeholder="YYYY"]').clear().type(String(today.getFullYear()));

    // 10. Preview & Submission
    cy.get('iframe').should('be.visible');
    cy.contains('button', 'Submit application').click();
    
    // Assertions
    cy.contains('Success').should('be.visible');
    cy.url().should('include', '/trademarks/');
  });
});
