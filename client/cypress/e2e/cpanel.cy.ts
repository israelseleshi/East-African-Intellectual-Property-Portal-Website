/// <reference types="cypress" />

describe('cPanel External Login', () => {
  it('should successfully login to A2 Hosting cPanel', () => {
    // 1. Visit the external cPanel login URL
    // We use chromeWebSecurity: false if this was in config, but here we just try
    cy.visit('https://wwwmi3-ss30.a2hosting.com:2083/');

    // 2. Fill the cPanel login form
    // Note: cPanel usually uses #user and #pass IDs
    cy.get('#user').type('falolega');
    cy.get('#pass').type('3v[5\\6tW>-vUff');
    cy.get('#login_submit').click();

    // 3. Verify successful login by checking for a common cPanel element
    cy.url().should('include', 'cpsess');
    cy.get('body').should('contain', 'cPanel');
  });
});
