/// <reference types="cypress" />

describe('TS-02: Client Management', () => {
  const loginEmail = 'israelseleshi09@gmail.com';
  const loginPassword = '1q2w3e4r5t';
  
  const clientData = {
    name: "Abebe Balcha",
    localName: "አበበ ባልቻ",
    type: 'INDIVIDUAL',
    gender: 'MALE',
    nationality: 'Ethiopia',
    residenceCountry: 'Ethiopia',
    email: `abebe.balcha@eastafricanip.com`,
    telephone: '+251911123456',
    fax: '+251111654321',
    street: 'Bole Road, Highrise Building, 4th Floor',
    zone: 'Bole',
    wereda: '03',
    city: 'Addis Ababa',
    state: 'Addis Ababa',
    houseNo: '789/B',
    poBox: '5678',
    zipCode: '1000'
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Login before each test in this suite
    cy.visit('/login');
    cy.get('input[id="email"]').type(loginEmail);
    cy.get('input[id="password"]').type(loginPassword);
    cy.get('button[type="submit"]').contains('Sign in').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });

  it('TS-02: Creates a new Individual Male client with detailed Ethiopian metadata', () => {
    cy.intercept('POST', '**/api/clients').as('createClientReq');
    
    // Navigate via Sidebar using data attributes from shadcn/ui sidebar
    cy.get('[data-sidebar="sidebar"]').should('be.visible');
    cy.get('[data-sidebar="menu-button"]').contains('Clients').click({ force: true });
    cy.url().should('include', '/clients');
    
    cy.contains('button', 'New Client').click();
    cy.url().should('include', '/clients/new');

    // 1. Client Type: Select 'Individual' (already selected by default, but let's be explicit)
    cy.contains('button', 'Individual').as('individualBtn').click();
    cy.get('@individualBtn').should('have.css', 'border-color').and('include', 'rgb(14, 49, 85)'); 

    // 2. Gender: Select 'Male'
    cy.contains('label', 'Male').click();

    // Ensure the input is enabled and visible before typing
    cy.get('input[id="name"]', { timeout: 10000 }).should('be.visible').and('not.be.disabled').type(clientData.name);

    
    // 3. Amharic Name (Local Name)
    cy.get('input[id="local_name"]').should('have.attr', 'placeholder', 'ሙሉ ስም እዚህ ያስገቡ').type(clientData.localName);

    // 4. Nationality (Ethiopia)
    cy.contains('label', 'Nationality').parent().within(() => {
      cy.get('button').click();
      cy.get('input[placeholder="Search countries..."]').type(clientData.nationality);
      cy.contains('button', clientData.nationality).click({ force: true });
    });

    // 5. Country of Residence (Ethiopia)
    cy.contains('label', 'Country of Residence').parent().within(() => {
      cy.get('button').click();
      cy.get('input[placeholder="Search countries..."]').type(clientData.residenceCountry);
      cy.contains('button', clientData.residenceCountry).click({ force: true });
    });

    // 6. Email Address
    cy.get('input[id="email"]').should('have.attr', 'placeholder', 'client@example.com').type(clientData.email);
    
    // 7. Telephone
    cy.get('input[id="telephone"]').should('have.attr', 'placeholder', '+251...').type(clientData.telephone);
    
    // 8. Fax
    cy.get('input[id="fax"]').should('have.attr', 'placeholder', 'Fax number').type(clientData.fax);

    // 9. Street Address
    cy.get('input[id="address_street"]').should('have.attr', 'placeholder', 'Street, Building, Floor').type(clientData.street);
    
    // 10. Zone / Subcity
    cy.get('input[id="address_zone"]').should('have.attr', 'placeholder', 'Zone / Subcity').type(clientData.zone);
    
    // 11. Wereda
    cy.get('input[id="wereda"]').should('have.attr', 'placeholder', 'Wereda').type(clientData.wereda);
    
    // 12. City
    cy.get('input[id="city"]').should('have.attr', 'placeholder', 'City').type(clientData.city);
    
    // 13. State / Region
    cy.get('input[id="state_name"]').should('have.attr', 'placeholder', 'State / Region').type(clientData.state);
    
    // 14. House No.
    cy.get('input[id="house_no"]').should('have.attr', 'placeholder', 'House No.').type(clientData.houseNo);
    
    // 15. P.O. Box
    cy.get('input[id="po_box"]').should('have.attr', 'placeholder', 'P.O. Box').type(clientData.poBox);
    
    // 16. ZIP / Postal Code
    cy.get('input[id="zip_code"]').should('have.attr', 'placeholder', 'ZIP Code').type(clientData.zipCode);

    // Submit the form
    cy.get('button[type="submit"]').contains('Create Client').click();

    // Verify API Response & Redirection to detail page
    cy.wait('@createClientReq').then((interception) => {
      expect(interception.response?.statusCode).to.eq(201);
      const clientId = interception.response?.body.id;
      cy.url().should('include', `/clients/${clientId}`);
    });

    // Final verification on detail page
    cy.contains('h1', clientData.name).should('be.visible');
    cy.contains('div', clientData.email).should('be.visible');
  });
});
