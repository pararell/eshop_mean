import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * Regenerates the README / docs screenshots and demo GIF (`npm run docs:media`).
 * Same seeded server with stubbed AI and Cloudinary as the e2e tests; not part of `test:e2e`.
 */
export default defineConfig({
  ...base,
  testDir: './docs-media',
  reporter: 'list',
  globalTeardown: undefined,
});
