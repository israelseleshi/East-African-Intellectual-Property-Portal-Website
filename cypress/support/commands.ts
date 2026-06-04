/// <reference types="cypress" />

Cypress.Commands.add('loginAs', (email: string, password: string, sessionKey: string = 'e2e-user') => {
  cy.session(
    sessionKey,
    () => {
      cy.visit('/login');
      cy.get('#email').clear().type(email);
      cy.get('#password').clear().type(password, { log: false });
      cy.get('button[type="submit"]').contains(/sign in/i).click();
      cy.url({ timeout: 15000 }).should('not.include', '/login');
    },
    {
      validate() {
        cy.getAllCookies().then((cookies) => {
          const hasAuth = cookies.some((c) => c.name === 'access_token');
          expect(hasAuth, 'access_token cookie present').to.be.true;
        });
      },
      cacheAcrossSpecs: true,
    }
  );
});

Cypress.Commands.add('logout', () => {
  cy.clearCookies({ domain: undefined });
  cy.clearLocalStorage();
  cy.window().then((win) => {
    try { win.sessionStorage.clear(); } catch { /* noop */ }
  });
});

Cypress.Commands.add('getByLabel', (label: string | RegExp) => {
  const re = typeof label === 'string' ? new RegExp(label, 'i') : label;
  return cy.get('body').then(($body) => {
    const $label = $body.find('label, legend, [role="label"]').filter((_i, el) =>
      re.test((el.textContent || '').trim())
    );
    if ($label.length > 0) {
      const htmlFor = $label.first().attr('for');
      if (htmlFor) {
        return cy.get(`#${htmlFor}`);
      }
      const $nested = $label.first().find('input, textarea, select');
      if ($nested.length > 0) {
        return cy.wrap($nested.first());
      }
    }
    return cy.get(`input[placeholder], textarea[placeholder]`).filter((_i, el) =>
      re.test((el.getAttribute('placeholder') || '').toString())
    ).first();
  });
});

Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-cy="${value}"]`);
});
