import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { version } = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')) as { version: string };

test('the production build reports its version in the console and at /api/version', async ({ page, request }) => {
  const res = await request.get('/api/version');
  expect(res.ok()).toBeTruthy();
  const info = (await res.json()) as { version: string; sha: string; buildDate: string };
  expect(info.version).toBe(version);
  expect(info.sha).toMatch(/^([0-9a-f]{7,12}|dev)$/);
  expect(info.buildDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  const lines: string[] = [];
  page.on('console', (message) => {
    if (message.text().includes('Eshop')) lines.push(message.text());
  });
  await page.goto('/en/product/all');
  await page.locator('html[data-app-ready]').waitFor({ state: 'attached' });

  // One line per page load, with the same build as the API
  expect(lines).toHaveLength(1);
  expect(lines[0]).toContain(`v${info.version} · ${info.sha} · ${info.buildDate}`);
});
