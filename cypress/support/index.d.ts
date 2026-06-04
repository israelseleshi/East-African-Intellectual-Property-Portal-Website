/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Logs in via the UI and caches the session under the given key.
       * Subsequent calls reuse cookies + storage.
       */
      loginAs(email: string, password: string, sessionKey?: string): Chainable<void>;

      /**
       * Logs out via the API (clears cookies + storage).
       */
      logout(): Chainable<void>;

      /**
       * Selects an element by accessible label.
       */
      getByLabel(label: string | RegExp, options?: Partial<Cypress.LoggableConfigMixin & Cypress.Timeoutable & Cypress.ActionableChainable<JQuery<HTMLElement>>>): Chainable<JQuery<HTMLElement>>;

      /**
       * Selects an element by data-cy attribute.
       */
      dataCy(value: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

export {};
