import './commands';

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
    }
  }
}

// Advanced Logging Architecture
const LOG_DIR = '@test_logs';

Cypress.on('window:before:load', (win) => {
  const testName = Cypress.currentTest.titlePath.join(' - ');
  const logs: any[] = [];

  // Intercept Console
  const methods: (keyof Console)[] = ['log', 'info', 'warn', 'error'];
  methods.forEach((method) => {
    const original = win.console[method] as Function;
    win.console[method] = (...args: any[]) => {
      logs.push({
        type: 'console',
        method,
        timestamp: new Date().toISOString(),
        content: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
      });
      original.apply(win.console, args);
    };
  });

  // Attach logs to the window for collection at end of test
  (win as any)._test_logs = logs;
});

afterEach(() => {
  const testName = Cypress.currentTest.titlePath.join(' - ').replace(/[^a-z0-9]/gi, '_');
  const win = cy.state('window') as any;
  const logs = win?._test_logs || [];

  // Create directory if it doesn't exist (handled by cy.writeFile if path has folders)
  if (logs.length > 0) {
    // Increase timeout for writing large logs
    cy.writeFile(`${LOG_DIR}/${testName}_console.json`, JSON.stringify(logs, null, 2), { timeout: 10000 });
  }
});
