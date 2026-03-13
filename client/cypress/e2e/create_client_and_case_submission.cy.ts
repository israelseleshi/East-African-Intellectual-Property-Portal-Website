/// <reference types="cypress" />

describe('Client + Trademark Application Submission', () => {
  const uniqueSuffix = `${Date.now()}`;
  const clientData = {
    name: `Cypress QA Client ${uniqueSuffix}`,
    localName: `ሳይፕሬስ ደንበኛ ${uniqueSuffix}`,
    nationality: 'Ethiopia',
    residenceCountry: 'Ethiopia',
    email: `qa.client.${uniqueSuffix}@example.com`,
    telephone: '+251911123456',
    fax: '+251111654321',
    addressStreet: 'Bole Road',
    addressZone: 'Bole',
    wereda: '03',
    city: 'Addis Ababa',
    cityCode: 'AA',
    stateName: 'Addis Ababa',
    stateCode: 'AA',
    houseNo: '789/B',
    zipCode: '1000',
    poBox: '5678'
  };

  const caseData = {
    markDescription: `QA MARK ${uniqueSuffix}`,
    markTranslation: `QA Translation ${uniqueSuffix}`,
    markTransliteration: `QA Transliteration ${uniqueSuffix}`,
    language: 'English',
    colorIndication: 'Blue and White',
    threeDimFeatures: 'N/A',
    goodsLine1: 'Telecommunications services and related support services.',
    goodsLine2: 'Online communication platforms and data transmission services.',
    priorityCountry: 'Kenya',
    priorityDate: '2026-03-08',
    priorityDeclaration: 'Priority is claimed based on earlier filing in Kenya.',
    priorityGoods: 'Telecommunications and communication platform services.',
    disclaimerAmharic: 'የቃላት ክፍል ላይ ልዩ መብት አይጠየቅም።',
    disclaimerEnglish: 'No exclusive rights claimed over descriptive wording apart from the mark as shown.'
  };

  const selectCountryInLabeledField = (label: string, country: string) => {
    cy.contains('label', label)
      .parent()
      .within(() => {
        cy.get('button').first().click({ force: true });
        cy.get('input[placeholder="Search countries..."]').clear().type(country, { force: true });
        cy.contains('button', country).click({ force: true });
      });
  };

  beforeEach(() => {
    cy.login('israelseleshi09@gmail.com', '1q2w3e4r5t');
  });

  it('creates a new client successfully', () => {
    cy.visit('/clients/new');

    cy.get('input[placeholder="Enter full legal name"]').type(clientData.name);
    cy.contains('button', 'Company').click();
    cy.get('input[placeholder="ሙሉ ስም እዚህ ያስገቡ"]').type(clientData.localName);

    selectCountryInLabeledField('Nationality', clientData.nationality);
    selectCountryInLabeledField('Country of Residence', clientData.residenceCountry);

    cy.get('input[type="email"]').type(clientData.email);
    cy.get('input[placeholder="+251..."]').type(clientData.telephone);
    cy.get('input[placeholder="Fax number"]').type(clientData.fax);

    cy.get('input[placeholder="Street Address"]').type(clientData.addressStreet);
    cy.get('input[placeholder="Zone / Subcity"]').type(clientData.addressZone);
    cy.get('input[placeholder="Wereda"]').type(clientData.wereda);
    cy.get('input[placeholder="City"]').type(clientData.city);
    cy.get('input[placeholder="City Code"]').type(clientData.cityCode);
    cy.get('input[placeholder="State / Region"]').type(clientData.stateName);
    cy.get('input[placeholder="State Code"]').type(clientData.stateCode);
    cy.get('input[placeholder="House No."]').type(clientData.houseNo);
    cy.get('input[placeholder="ZIP / Postal Code"]').type(clientData.zipCode);
    cy.get('input[placeholder="P.O. Box"]').type(clientData.poBox);

    cy.contains('button', 'Create Client').click();

    cy.url().should('match', /\/clients\/[a-z0-9-]+/);
    cy.contains('h1', clientData.name).should('be.visible');
  });

  it('creates a trademark case by quick-loading the created client and agent data', () => {
    cy.visit('/eipa-forms/application-form');

    cy.intercept('POST', '**/documents/upload').as('uploadMarkImage');
    cy.intercept('POST', '**/cases').as('createCase');

    cy.get('#quick-client-select button').click({ force: true });
    cy.contains('span', clientData.name, { timeout: 20000 }).click({ force: true });

    cy.get('input[placeholder="Enter full legal name in English"]').should('have.value', clientData.name);
    cy.get('input[placeholder="name@example.com"]').should('have.value', clientData.email);

    cy.get('#mark-specification-section').scrollIntoView();
    cy.contains('label', 'Service mark').click();
    cy.contains('label', 'Mixed mark').click();
    cy.get('input[type="file"]').selectFile('public/flags/ethiopia-flag.png', { force: true });
    cy.get('textarea[placeholder="Describe the visual and literal elements of the mark..."]').clear().type(caseData.markDescription);
    cy.get('input[placeholder="English translation"]').clear().type(caseData.markTranslation);
    cy.get('input[placeholder="Phonetic pronunciation"]').clear().type(caseData.markTransliteration);
    cy.get('input[placeholder="e.g., Amharic, Oromo"]').clear().type(caseData.language);
    cy.get('input[placeholder="e.g., Blue and White"]').clear().type(caseData.colorIndication);
    cy.get('input[placeholder="Describe 3D features"]').clear().type(caseData.threeDimFeatures);

    cy.get('#nice-classification').scrollIntoView();
    cy.get('#nice-classification').click();
    cy.get('input[placeholder="Search classes..."]').should('be.visible').clear().type('38');
    cy.contains('div', 'Class 38').should('be.visible').click();
    cy.get('input[placeholder="Goods/services line 1"]').clear().type(caseData.goodsLine1);
    cy.get('input[placeholder="Goods/services line 2"]').clear().type(caseData.goodsLine2);

    cy.get('#priority-section').scrollIntoView();
    selectCountryInLabeledField('Priority country', caseData.priorityCountry);
    cy.get('#priority-section input[type="date"]').clear().type(caseData.priorityDate);
    cy.get('input[placeholder="Enter declaration"]').clear().type(caseData.priorityDeclaration);
    cy.get('textarea[placeholder="Enter goods and services covered..."]').clear().type(caseData.priorityGoods);
    cy.contains('label', 'Documents accompany form').click();

    cy.get('#disclaimer-section').scrollIntoView();
    cy.get('input[placeholder="የመብት ገደቡን እዚህ ያስገቡ..."]').clear().type(caseData.disclaimerAmharic);
    cy.get('input[placeholder="e.g. No claim to exclusive right of use of..."]').clear().type(caseData.disclaimerEnglish);

    cy.get('#agent-section').scrollIntoView();
    cy.get('#agent-section [role="combobox"]').click({ force: true });
    cy.contains('[role="option"]', 'Fikadu Asfaw').click({ force: true });
    cy.get('input[placeholder="Full name of agent"]').should('have.value', 'Fikadu Asfaw');
    cy.get('input[placeholder="agent@example.com"]').should('have.value', 'fikadu@gmail.com');

    cy.get('#checklist-section').scrollIntoView();
    cy.contains('label', '3 identical copies of mark').click();
    cy.contains('label', 'Statutes governing mark').click();
    cy.contains('label', 'Power of attorney').click();
    cy.contains('label', 'Proof of payment').click();
    cy.get('input[placeholder="DD"]').clear().type('08');
    cy.get('input[placeholder="MMM"]').clear().type('Mar');
    cy.get('input[placeholder="YYYY"]').clear().type('2026');

    cy.get('#submit-button').click();

    cy.wait('@uploadMarkImage').its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.wait('@createCase').then((interception) => {
      const requestBody = interception.request.body as { markImage?: string };
      expect(requestBody.markImage, 'markImage path').to.be.a('string');
      expect(requestBody.markImage || '').to.not.match(/^data:image/);
      expect(requestBody.markImage || '').to.match(/^\/uploads\//);
      expect(interception.response?.statusCode).to.eq(201);
    });

    cy.url({ timeout: 15000 }).should('include', '/trademarks/');
  });
});
