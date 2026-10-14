// Flat-config port of the former client/.eslintrc.json (required by angular-eslint 22).
// Rule set is intentionally unchanged; unifying client and server linting is a separate step.
import { defineConfig } from 'eslint/config';
import angular from 'angular-eslint';

export default defineConfig(
  {
    ignores: ['**/*typings.d.ts', '**/environment*'],
  },
  {
    files: ['**/*.ts'],
    extends: [angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/no-input-rename': 'off',
      '@angular-eslint/no-inputs-metadata-property': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended],
    rules: {
      '@angular-eslint/template/no-negated-async': 'off',
      '@angular-eslint/template/eqeqeq': 'off',
    },
  },
);
