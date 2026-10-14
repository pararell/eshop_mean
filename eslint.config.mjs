// One ESLint config for the whole repo (client, server, shared, tests, e2e).
// Formatting is Prettier's job (.prettierrc); eslint-config-prettier turns off conflicting rules.
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '.angular/**',
      'coverage/**',
      'server/coverage/**',
      'test-results/**',
      'playwright-report/**',
      'client/src/environments/**',
      '**/*typings.d.ts',
      // Generated/legacy entry, unused (see docs/audit.md TD-07)
      'server-express.ts',
    ],
  },

  // All TypeScript
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      // Lots of `function` callbacks and intentional empty handlers in existing code
      '@typescript-eslint/no-empty-function': 'off',
    },
  },

  // Server (Node)
  {
    files: ['server/**/*.ts', 'server-ssr.ts'],
    languageOptions: { globals: globals.node },
  },

  // Client (Angular)
  {
    files: ['client/**/*.ts'],
    extends: [angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    languageOptions: { globals: globals.browser },
    rules: {
      '@angular-eslint/no-input-rename': 'off',
      '@angular-eslint/no-inputs-metadata-property': 'off',
      // Migration suggestions (standalone, inject(), OnPush): tracked in docs/audit.md TD-03,
      // reported as warnings so they don't block commits
      '@angular-eslint/prefer-inject': 'warn',
      '@angular-eslint/prefer-standalone': 'warn',
      '@angular-eslint/prefer-on-push-component-change-detection': 'warn',
    },
  },
  {
    files: ['client/**/*.html'],
    extends: [angular.configs.templateRecommended],
    rules: {
      '@angular-eslint/template/no-negated-async': 'off',
      '@angular-eslint/template/eqeqeq': 'off',
    },
  },

  // Protected files (see CLAUDE.md): Mongoose schemas are frozen until the PostgreSQL migration,
  // and the email templates contain literal non-breaking spaces
  {
    files: ['server/src/**/schemas/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-empty-object-type': 'off' },
  },
  {
    files: ['server/src/shared/utils/email/emailTemplates.ts'],
    rules: { 'no-irregular-whitespace': 'off' },
  },

  // Tests: mocks and fixtures may use loose types
  {
    files: ['**/*.spec.ts', 'server/test/**/*.ts', 'e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  prettier,
);
