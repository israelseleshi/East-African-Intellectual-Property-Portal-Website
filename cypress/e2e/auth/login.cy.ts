describe('Auth - Login', () => {
  const email = Cypress.env('TEST_USER_EMAIL');
  const password = Cypress.env('TEST_USER_PASSWORD');

  before(() => {
    if (!email || !password) {
      throw new Error('Missing TEST_USER_EMAIL / TEST_USER_PASSWORD in cypress.env.json');
    }
  });

  beforeEach(() => {
    cy.logout();
  });

  it('redirects unauthenticated users from / to /login', () => {
    cy.visit('/');
    cy.url({ timeout: 10000 }).should('include', '/login');
  });

  it('logs in successfully and lands off /login', () => {
    cy.visit('/login');
    cy.get('#email').clear().type(email);
    cy.get('#password').clear().type(password, { log: false });
    cy.get('button[type="submit"]').contains(/sign in/i).click();
    cy.url({ timeout: 15000 }).should('not.include', '/login');
    cy.getCookie('access_token').should('exist');
  });

  it('rejects an invalid password and stays on /login', () => {
    cy.visit('/login');
    cy.get('#email').clear().type(email);
    cy.get('#password').clear().type('definitely-wrong-password', { log: false });
    cy.get('button[type="submit"]').contains(/sign in/i).click();
    cy.url({ timeout: 10000 }).should('include', '/login');
    cy.getCookie('access_token').should('not.exist');
  });

  it('rejects an unknown email and stays on /login', () => {
    cy.visit('/login');
    cy.get('#email').clear().type('nobody-here@nowhere.test');
    cy.get('#password').clear().type(password, { log: false });
    cy.get('button[type="submit"]').contains(/sign in/i).click();
    cy.url({ timeout: 10000 }).should('include', '/login');
    cy.getCookie('access_token').should('not.exist');
  });
});
