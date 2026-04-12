/// <reference types="cypress" />

describe('TS-04: EIPA App Automation', () => {
  const loginEmail = 'israelseleshi09@gmail.com';
  const loginPassword = '1q2w3e4r5t';

  // The client we updated in TS-02.1
  const targetClientName = "Abebe Balcha Updated";
  
  const testMarkData = {
    markName: "SILVER LION",
    amharicName: "የብር አንበሳ",
    description: "A stylized silver lion head facing right with blue accents.",
    translation: "Silver Lion",
    transliteration: "Ye Birr Anbessa",
    colorIndication: "Silver, Royal Blue",
    goodsServicesLines: [
      "Coffee and coffee substitutes",
      "Tea, cocoa and artificial coffee",
      "Rice, tapioca and sago",
      "Flour and preparations made from cereals",
      "Bread, pastries and confectionery",
      "Edible ices, sugar, honey, treacle"
    ]
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

  it('TS-04: Full EIPA Application Form Automation with Logo and Client Auto-fill', () => {
    cy.intercept('GET', '**/api/clients*').as('getClients');
    
    // 1. Navigate to Application Form
    cy.get('[data-sidebar="sidebar"]').should('be.visible');
    cy.get('a').contains('Application Form').click({ force: true });
    cy.url().should('include', '/eipa-forms/application-form');
    cy.wait('@getClients');

    // 2. Select the "Master" Client from the Quick Load dropdown
    cy.get('#quick-client-select', { timeout: 10000 }).should('be.visible').within(() => {
      cy.get('button').click();
    });
    // Find the client in the dropdown listbox
    cy.get('[role="listbox"]').contains(targetClientName).click();

    // 3. Verify Auto-fill (Applicant Section)
    cy.get('input[placeholder="Enter full legal name in English"]').should('have.value', targetClientName);
    cy.get('input[placeholder="ሙሉ ስም እዚህ ያስገቡ"]').should('have.value', 'አበበ ባልቻ (የተሻሻለ)');
    
    // Verify Address auto-fill (Address Section)
    cy.get('input[placeholder="Enter street address"]').should('have.value', 'Mombasa Road, Gateway Mall, 2nd Floor');
    cy.get('input[placeholder="Enter city name"]').should('have.value', 'Nairobi');
    cy.get('input[placeholder="City code"]').should('have.value', 'NBO-001');
    cy.get('input[placeholder="State code"]').should('have.value', 'KE-47');
    cy.get('input[placeholder="Enter ZIP code"]').should('have.value', '00100');
    cy.get('input[placeholder="Enter P.O. Box"]').should('have.value', 'PO 9876');

    // 4. Mark Specification Section (Logo Upload)
    cy.get('#mark-specification-section').scrollIntoView();
    
    // Select Mark Types and Form
    cy.contains('label', 'Goods mark').click();
    cy.contains('label', 'Service mark').click();
    cy.contains('label', 'Mixed mark').click();
    cy.contains('label', 'Word mark').click();

    // Upload Logo using fixture
    cy.get('input[type="file"]').selectFile('cypress/fixtures/eaip-logo.png', { force: true });
    cy.get('img[alt="Mark preview"]').should('be.visible');

    // Fill Mark Details
    cy.contains('label', 'Mark description').parent().find('textarea').type("Abebe PLC");
    
    // Fill specific grid fields by exact label and input interaction
    cy.get('#mark-specification-section').within(() => {
        cy.contains('label', /^Language$/).parent().find('input').scrollIntoView().type("N/A", { force: true });
        cy.contains('label', /^Translation$/).parent().find('input').scrollIntoView().type("N/A", { force: true });
        cy.contains('label', /^Transliteration$/).parent().find('input').scrollIntoView().type("N/A", { force: true });
        cy.contains('label', /^3D features indication$/).parent().find('input').scrollIntoView().type("N/A", { force: true });
        cy.contains('label', /^Color indication$/).parent().find('input').scrollIntoView().type(testMarkData.colorIndication, { force: true });
    });

    // 5. Agent / Representative Section
    cy.get('#agent-section').scrollIntoView();
    cy.get('#agent-section').within(() => {
      // Use the button that contains 'Quick load Agent' and force click
      cy.get('button').contains('Quick load Agent').click({ force: true });
    });
    // The dropdown is rendered in a portal, so we look for the listbox globally
    cy.get('[role="listbox"], [class*="SelectContent"]').contains('Fikadu Asfaw').click();
    // Verify Agent auto-fill
    cy.get('input[placeholder="Full name of agent"]').should('have.value', 'Fikadu Asfaw');
    // Field 'Sub-City' has label 'Sub-City' and placeholder 'Sub-city'
    cy.get('input[placeholder="Sub-city"]').should('have.value', 'Bole');
    // Field 'House No.' has label 'House No.' and placeholder 'House number'
    cy.get('input[placeholder="House number"]').should('have.value', '365');

    // 6. Priority Right Declaration Section
    // ... rest of the section remains same ...
    cy.get('#priority-section').scrollIntoView();
    cy.get('#priority-section').within(() => {
        cy.get('label').contains('Priority country').next().click();
    });
    cy.get('input[placeholder="Search countries..."]').type('United States');
    cy.contains('button', 'United States').click({ force: true });
    
    cy.get('input[placeholder="Enter declaration"]').type("Convention Priority Claimed");
    cy.get('input[type="date"]').type('2024-01-15');
    cy.get('textarea[placeholder="Enter goods and services covered..."]').type("All goods in class 30.");
    cy.contains('label', 'Documents accompany form').click();

    // 7. Nice Classification Section
    cy.get('#nice-class-section').scrollIntoView();
    // The NiceClassPicker uses a custom div-based dropdown, not a standard Select
    cy.get('#nice-class-section').within(() => {
      // Use force click for the selector trigger
      cy.get('div').contains('Select Nice classes...').click({ force: true });
    });
    
    // The dropdown items are divs containing "Class X"
    cy.get('div').contains('Class 30').scrollIntoView().click({ force: true });
    cy.get('div').contains('Class 35').scrollIntoView().click({ force: true });
    
    // Close the picker by hitting ESC
    cy.get('body').type('{esc}');
    
    // Fill Goods/Services lines
    testMarkData.goodsServicesLines.forEach((line, index) => {
      // Use more robust selector and handle visibility
      cy.get(`input[placeholder="Goods/services line ${index + 1}"]`)
        .scrollIntoView()
        .type(line, { force: true });
    });

    // 8. Disclaimer Section
    cy.get('label').contains('Disclaimer (Amharic)').next('textarea').scrollIntoView().type("ምንም መብት የለም", { force: true });
    cy.get('label').contains('Disclaimer (English)').next('textarea').scrollIntoView().type("No exclusive right is claimed to the word SILVER.", { force: true });

    // 9. Signature / Checklist
    cy.get('#checklist-section').scrollIntoView();
    cy.contains('label', 'Power of attorney').click({ force: true });
    cy.contains('label', '3 identical copies of mark').click({ force: true });
    cy.contains('label', 'Proof of payment').click({ force: true });
    
    // Fill Date
    cy.get('input[placeholder="DD"]').type('12');
    cy.get('input[placeholder="MMM"]').type('APR');
    cy.get('input[placeholder="YYYY"]').type('2026');

    // 10. PDF Preview and Final check
    cy.get('button').contains('Generate PDF').scrollIntoView().click();
    
    // Verify the "Generating..." state or the completion toast/preview
    cy.get('h2').contains('PDF Preview', { timeout: 15000 }).should('be.visible');
    
    // Final check: Look for the success toast
    cy.contains('Success').should('be.visible');
  });
});
