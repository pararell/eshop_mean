/**
 * Server tests: unit specs next to the code (src/**\/*.spec.ts) and API specs in test/api.
 * Run with `npm run test:server`. See docs/testing.md.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    // SWC instead of ts-jest: fast, and emits the decorator metadata Nest DI relies on
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: 'es2022',
        },
        module: { type: 'commonjs' },
      },
    ],
  },
  // External services are always mocked: tests must never send email or charge cards
  moduleNameMapper: {
    '^@sendgrid/mail$': '<rootDir>/test/mocks/sendgrid.ts',
    '^stripe$': '<rootDir>/test/mocks/stripe.ts',
  },
  setupFiles: ['<rootDir>/test/setup/env.ts'],
  globalSetup: '<rootDir>/test/setup/global-setup.cjs',
  globalTeardown: '<rootDir>/test/setup/global-teardown.cjs',
  testTimeout: 30000,
};
