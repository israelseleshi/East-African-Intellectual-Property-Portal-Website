/// <reference types="cypress" />

describe('Client Management - Tanzania', () => {
  const clientData = {
    name: 'Kilimanjaro Coffee Exporters Ltd',
    type: 'COMPANY',
    nationality: 'Tanzania',
    city: 'Dar es Salaam',
    email: 'logistics@kilimanjarocoffee.co.tz',
    telephone: '+255222123456',
    address_street: 'Samora Avenue',
    address_zone: 'Ilala',
    zip_code: '11101',
    po_box: '9112'
  };

  beforeEach(() => {
    cy.login('israelseleshi09@gmail.com', '1q2w3e4r5t');
    cy.visit('/clients/new');
  });

  it('adds a new Tanzanian company client with realistic data', () => {
    // 1. Fill basic information
    cy.get('input[placeholder="Enter full legal name"]').type(clientData.name);
    
    // Select Company type
    cy.contains('button', 'Company').click();

    // Nationality (CountrySelector)
    // Looking for the first CountrySelector in the form
    cy.get('label').contains('Nationality').parent().find('button').click();
    cy.get('input[placeholder="Search countries..."]').should('be.visible').type('Tanzania');
    cy.contains('button', 'Tanzania').should('be.visible').click();

    // Email & Contact
    cy.get('input[type="email"]').type(clientData.email);
    cy.get('input[placeholder="+251..."]').type(clientData.telephone);

    // Address Details
    cy.get('input[placeholder="Street Address"]').type(clientData.address_street);
    cy.get('input[placeholder="Zone / Subcity"]').type(clientData.address_zone);
    
    // City / Country of Residence (Second CountrySelector)
    cy.get('label').contains('Country of Residence').parent().find('button').click();
    cy.get('input[placeholder="Search countries..."]').should('be.visible').type('Tanzania');
    cy.contains('button', 'Tanzania').should('be.visible').last().click();

    // Extra address fields
    cy.get('input[placeholder="City"]').type(clientData.city);
    cy.get('input[placeholder="ZIP / Postal Code"]').type(clientData.zip_code);
    cy.get('input[placeholder="P.O. Box"]').type(clientData.po_box);

    // 2. Submit
    cy.contains('button', 'Create Client').click();

    // 3. Assertions
    cy.contains('Client Created').should('be.visible');
    cy.contains(`${clientData.name} has been created successfully`).should('be.visible');

    // Should redirect to client detail page
    cy.url().should('match', /\/clients\/[a-z0-9-]+/);
    
    // Verify data on detail page
    cy.contains('h1', clientData.name).should('be.visible');
    cy.contains(clientData.email).should('be.visible');
    cy.contains(clientData.telephone).should('be.visible');
    cy.contains(clientData.city).should('be.visible');
  });
});
