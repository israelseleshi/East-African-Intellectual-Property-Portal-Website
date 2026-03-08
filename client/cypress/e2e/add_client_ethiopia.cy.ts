/// <reference types="cypress" />

describe('Client Management - Ethiopia', () => {
  const clientData = {
    name: 'Ethio Telecom Corporation',
    localName: 'የኢትዮጵያ ቴሌኮሙኒኬሽን ኮርፖሬሽን',
    type: 'COMPANY',
    nationality: 'Ethiopia',
    city: 'Addis Ababa',
    email: 'info@ethiotelecom.et',
    telephone: '+251111234567',
    fax: '+251111234568',
    address_street: 'Churchill Road',
    address_zone: 'Arada',
    wereda: '01',
    house_no: '456',
    zip_code: '1000',
    po_box: '1047',
    residenceCountry: 'Ethiopia'
  };

  beforeEach(() => {
    cy.login('israelseleshi09@gmail.com', '1q2w3e4r5t');
    cy.visit('/clients/new');
  });

  it('adds a new Ethiopian company client with Amharic name and local address details', () => {
    // 1. Fill basic information
    cy.get('input[placeholder="Enter full legal name"]').type(clientData.name);
    
    // Select Company type
    cy.contains('button', 'Company').click();

    // Amharic Name
    cy.get('input[placeholder="ሙሉ ስም እዚህ ያስገቡ"]').type(clientData.localName);

    // Nationality
    cy.get('label').contains('Nationality').parent().find('button').click();
    cy.get('input[placeholder="Search countries..."]').should('be.visible').type(clientData.nationality);
    // Be specific to the list item to avoid clicking the trigger button
    cy.get('div[role="dialog"], .absolute').contains('button', clientData.nationality).should('be.visible').click();

    // Email & Contact
    cy.get('input[type="email"]').type(clientData.email);
    cy.get('input[placeholder="+251..."]').type(clientData.telephone);
    cy.get('input[placeholder="Fax number"]').type(clientData.fax);

    // Address Details
    cy.get('input[placeholder="Street Address"]').type(clientData.address_street);
    cy.get('input[placeholder="Zone / Subcity"]').type(clientData.address_zone);
    cy.get('input[placeholder="Wereda"]').type(clientData.wereda);
    
    // City & Country of Residence
    cy.get('input[placeholder="City"]').type(clientData.city);
    
    cy.get('label').contains('Country of Residence').parent().find('button').click();
    cy.get('input[placeholder="Search countries..."]').should('be.visible').type(clientData.residenceCountry);
    // Be specific to the list item to avoid clicking the trigger button
    cy.get('div[role="dialog"], .absolute').contains('button', clientData.residenceCountry).should('be.visible').click();

    cy.get('input[placeholder="House No."]').type(clientData.house_no);
    cy.get('input[placeholder="ZIP / Postal Code"]').type(clientData.zip_code);
    cy.get('input[placeholder="P.O. Box"]').type(clientData.po_box);

    // 2. Submit
    cy.contains('button', 'Create Client').click();

    // 3. Assertions
    // Should show success toast
    cy.contains('Client Created').should('be.visible');
    cy.contains(`${clientData.name} has been created successfully`).should('be.visible');

    // Should redirect to client detail page
    cy.url().should('match', /\/clients\/[a-z0-9-]+/);
    
    // Verify data on detail page
    cy.contains('h1', clientData.name).should('be.visible');
    cy.contains(clientData.localName).should('be.visible');
    cy.get('div').contains('Company').should('be.visible');
    cy.contains(clientData.email).should('be.visible');
    cy.contains(clientData.telephone).should('be.visible');
    cy.contains(clientData.fax).should('be.visible');
    cy.contains(clientData.address_street).should('be.visible');
    cy.contains(clientData.address_zone).should('be.visible');
    cy.contains(clientData.wereda).should('be.visible');
    cy.contains(clientData.city).should('be.visible');
    cy.contains(clientData.house_no).should('be.visible');
    cy.contains(clientData.zip_code).should('be.visible');
    cy.contains(clientData.po_box).should('be.visible');
    cy.contains(clientData.residenceCountry).should('be.visible');
  });
});
