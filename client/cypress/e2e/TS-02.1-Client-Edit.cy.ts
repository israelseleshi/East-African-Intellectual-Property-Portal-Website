/// <reference types="cypress" />

describe('TS-02.1: Client Edit Management', () => {
  const loginEmail = 'israelseleshi09@gmail.com';
  const loginPassword = '1q2w3e4r5t';

  // Search for the client we created in TS-02
  const targetClientName = "Abebe Balcha";
  
  const updatedClientData = {
    name: "Abebe Balcha Updated",
    localName: "አበበ ባልቻ (የተሻሻለ)",
    type: 'COMPANY', // Change from INDIVIDUAL to COMPANY
    nationality: 'Kenya',
    residenceCountry: 'Kenya',
    email: `abebe.updated@eastafricanip.com`,
    telephone: '+254711123456',
    fax: '+254111654321',
    street: 'Mombasa Road, Gateway Mall, 2nd Floor',
    zone: 'Nairobi South',
    wereda: 'Westlands',
    city: 'Nairobi',
    cityCode: 'NBO-001',
    state: 'Nairobi County',
    stateCode: 'KE-47',
    houseNo: 'Suite 204',
    poBox: 'PO 9876',
    zipCode: '00100'
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    // Login
    cy.visit('/login');
    cy.get('input[id="email"]').type(loginEmail);
    cy.get('input[id="password"]').type(loginPassword);
    cy.get('button[type="submit"]').contains('Sign in').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });

  it('TS-02.1: Edits an existing client with full field updates', () => {
    cy.intercept('PATCH', '**/api/clients/*').as('updateClientReq');
    cy.intercept('GET', '**/api/clients?*').as('getClientsReq');

    // 1. Navigate to Clients List
    cy.get('[data-sidebar="sidebar"]').should('be.visible');
    cy.get('[data-sidebar="menu-button"]').contains('Clients').click({ force: true });
    cy.url().should('include', '/clients');
    cy.wait('@getClientsReq');

    // 2. Search for the client and click to view details
    cy.get('input[placeholder*="Search clients"]').type(targetClientName);
    cy.wait('@getClientsReq');
    cy.contains('div', targetClientName).should('be.visible').click();
    
    // 3. Enter Edit Mode
    cy.contains('button', 'Edit Client').click();
    cy.contains('h1', 'Edit Client').should('be.visible');

    // 4. Update Identity & Type
    cy.get('label').contains('Client Name').next('input').clear().type(updatedClientData.name);
    cy.get('label').contains('Local Name').next('input').clear().type(updatedClientData.localName);
    
    // Change Type to COMPANY
    cy.get('label').contains('Client Type').next().click(); // Click SelectTrigger
    cy.get('[role="listbox"]').contains('Company').click();

    // 5. Update Contact Information
    cy.get('label').contains('Email Address').next('input').clear().type(updatedClientData.email);
    cy.get('label').contains('Telephone').next('input').clear().type(updatedClientData.telephone);
    cy.get('label').contains('Fax').next('input').clear().type(updatedClientData.fax);

    // 6. Update Address & Location
    // Nationality
    cy.get('label').contains('Nationality').next().click();
    cy.get('input[placeholder="Search countries..."]').type(updatedClientData.nationality);
    cy.contains('button', updatedClientData.nationality).click({ force: true });

    // Residence
    cy.get('label').contains('Residence Country').next().click();
    cy.get('input[placeholder="Search countries..."]').type(updatedClientData.residenceCountry);
    cy.contains('button', updatedClientData.residenceCountry).click({ force: true });

    // Other Address Fields
    cy.get('label').contains('Street Address').next('input').clear().type(updatedClientData.street);
    cy.get('label').contains('Zone / Subcity').next('input').clear().type(updatedClientData.zone);
    cy.get('label').contains('Wereda').next('input').clear().type(updatedClientData.wereda);
    cy.get('label').contains('City').next('input').clear().type(updatedClientData.city);
    cy.get('label').contains('City Code').next('input').clear().type(updatedClientData.cityCode);
    cy.get('label').contains('State / Region').next('input').clear().type(updatedClientData.state);
    cy.get('label').contains('State Code').next('input').clear().type(updatedClientData.stateCode);
    cy.get('label').contains('ZIP / Postal Code').next('input').clear().type(updatedClientData.zipCode);
    cy.get('label').contains('House No.').next('input').clear().type(updatedClientData.houseNo);
    cy.get('label').contains('P.O. Box').next('input').clear().type(updatedClientData.poBox);

    // 7. Save Changes
    cy.contains('button', 'Save Changes').click();
    cy.wait('@updateClientReq').its('response.statusCode').should('eq', 200);

    // 8. Verify the updates in Read-Only view
    cy.contains('h1', updatedClientData.name).should('be.visible');
    cy.contains('div', updatedClientData.email).should('be.visible');
    
    // Verify specific newly added fields are rendering correctly
    cy.get('label').contains('City Code').next('div').should('contain', updatedClientData.cityCode);
    cy.get('label').contains('State Code').next('div').should('contain', updatedClientData.stateCode);
    cy.get('label').contains('State').next('div').should('contain', updatedClientData.state);
  });
});
