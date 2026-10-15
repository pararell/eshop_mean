import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const port = 4600;
const root = resolve(__dirname, '..');

/**
 * Browser tests against the production build + a seeded, disposable PostgreSQL 18.
 * Run with `npm run test:e2e` (builds first). See docs/testing.md.
 */
export default defineConfig({
  testDir: './tests',
  // Specs share one server and database, so run them one at a time
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: resolve(root, 'test-results/e2e'),
  reporter: [['list'], ['html', { open: 'never', outputFolder: resolve(root, 'playwright-report') }]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalTeardown: resolve(__dirname, 'support/check-server-errors.mjs'),
  webServer: {
    command: 'node e2e/support/start-server.mjs',
    cwd: root,
    url: `http://localhost:${port}/api/products/categories`,
    env: { E2E_PORT: String(port) },
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
