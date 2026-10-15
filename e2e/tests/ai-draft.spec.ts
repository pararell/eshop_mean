import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { E2E, isolateExternalServices, signIn } from './helpers';

// The server talks to a local Gemini + Cloudinary stub (support/ai-stub.mjs); see what it received
const aiStubUrl = () => JSON.parse(readFileSync(resolve(__dirname, '../../test-results/e2e-state.json'), 'utf8')).aiStubUrl as string;
const stubRequests = async (): Promise<{ method: string; url: string; headers: Record<string, string>; body?: any }[]> =>
  (await fetch(`${aiStubUrl()}/__requests`)).json();

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

test.beforeEach(async ({ page }) => {
  await isolateExternalServices(page);
  await signIn(page, E2E.admin.email, E2E.admin.password);
  await expect(page.getByText('SIGNIN_SUCCESS')).toBeVisible();
});

test('admin creates a complete multi-language product from a photo and a few words', async ({ page, request }) => {
  const before = (await stubRequests()).length;
  await page.goto('/en/dashboard/products/new');
  const editor = page.locator('app-product-editor');
  const ai = editor.locator('app-ai-assistant');

  // 1. Photo: uploaded once (to the Cloudinary stub) and reused for the AI and the product
  await editor.getByTestId('image-file-input').setInputFiles({ name: 'jacket.png', mimeType: 'image/png', buffer: PNG });
  await expect(editor.getByRole('img', { name: 'Product photo 1' })).toBeVisible();
  await expect(ai.getByText('The AI looks at the uploaded photo.')).toBeVisible();

  // 2. A few words, then Fill with AI
  await ai.getByLabel('Describe the product').fill("men's winter jacket, black, down, L-XXL");
  await ai.getByRole('button', { name: 'Fill with AI', exact: true }).click();
  await expect(ai.getByText('16 fields were filled by AI')).toBeVisible();
  await expect(ai.getByText(E2E.ai.warning)).toBeVisible();
  // focus moves to the result summary
  await expect(ai.getByLabel('AI result')).toBeFocused();

  // 3. Review: AI texts in every language, marked; price and stock left to the admin
  // The AI's slug, made unique by the server (reruns get -2, -3, ...)
  await expect(editor.getByLabel('Product URL')).toHaveValue(new RegExp(`^${E2E.ai.titleUrl}(-\\d+)?$`));
  const titleUrl = await editor.getByLabel('Product URL').inputValue();
  await expect(editor.getByLabel('Title', { exact: true })).toHaveValue(E2E.ai.titles.en);
  await expect(editor.getByLabel('SEO title', { exact: true })).toHaveValue(`${E2E.ai.titles.en} | E2E shop`);
  await expect(editor.getByLabel('Sale price')).toHaveValue('');
  await expect(editor.getByRole('tab', { name: /^EN 5 AI suggestions/ })).toBeVisible();
  await expect(editor.locator('mat-chip-row', { hasText: E2E.ai.category })).toBeVisible();

  // editing a field clears its AI mark
  await editor.getByLabel('Title', { exact: true }).fill('E2E Down Jacket Black');
  await expect(editor.getByRole('tab', { name: /^EN 4 AI suggestions/ })).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Accept AI title' })).toHaveCount(0);

  await editor.getByRole('tab', { name: /SK/ }).click();
  await expect(editor.getByLabel('Title', { exact: true })).toHaveValue(E2E.ai.titles.sk);
  await editor.getByRole('button', { name: 'Accept Slovak texts' }).click();
  await expect(editor.getByRole('tab', { name: /SK.*AI/ })).toHaveCount(0);

  // suggested new category, added only when clicked
  const suggestion = ai.getByRole('option', { name: new RegExp(E2E.ai.suggestedCategory) });
  const suggestedSlug = (await suggestion.innerText())
    .replace(/^add\s*/, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();
  await suggestion.click();
  await expect(editor.locator('mat-chip-row', { hasText: suggestedSlug })).toBeVisible();

  // 4. Price, stock and visibility (EN)
  await editor.getByRole('tab', { name: /EN/ }).click();
  // wait until the EN tab content replaced the SK one
  await expect(editor.getByLabel('Title', { exact: true })).toHaveValue('E2E Down Jacket Black');
  await editor.getByLabel('Sale price').fill('149.90');
  await editor.getByRole('switch', { name: 'Visible in the shop (EN)' }).click();

  // 5. Save: unreviewed AI texts (EN, CS) need a confirmation
  const saved = page.waitForResponse((r) => r.url().includes('/api/products/add'));
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(editor.getByText(/AI suggestions are not reviewed yet/)).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Save anyway' })).toBeFocused();
  await editor.getByRole('button', { name: 'Save anyway' }).click();
  expect((await saved).status()).toBe(201);
  await expect(page).toHaveURL(`/en/dashboard/products/${titleUrl}`);

  // Stored as reviewed: all languages, the uploaded image, no AI-invented price or stock
  const product = await (await request.get(`/api/products/${titleUrl}`)).json();
  expect(product.images).toHaveLength(1);
  expect(product.images[0]).toMatch(/\/e2e\/image\/upload\/v1\/products\/e2e-upload-\d+\.png$/);
  expect(product.mainImage.url).toBe(product.images[0]);
  expect(product.tags).toEqual([E2E.ai.category, suggestedSlug]);
  expect(product.en).toMatchObject({
    title: 'E2E Down Jacket Black',
    salePrice: 149.9,
    visibility: true,
    seoTitle: `${E2E.ai.titles.en} | E2E shop`,
  });
  expect(product.sk).toMatchObject({ title: E2E.ai.titles.sk, salePrice: null, visibility: false, stock: 'onStock' });
  expect(product.cs.title).toBe(E2E.ai.titles.cs);
  expect(product.en.descriptionFull[0]).toContain('<li><strong>Colour:</strong> black</li>');

  // The shop page uses the SEO title
  await page.goto(`/en/product/${titleUrl}`);
  await expect(page).toHaveTitle(`${E2E.ai.titles.en} | E2E shop`);

  // What the AI received: the resized uploaded photo and the admin's words; the key in a header
  const received = (await stubRequests()).slice(before);
  const gemini = received.find((r) => r.url.includes(':generateContent'))!;
  expect(gemini.headers['x-goog-api-key']).toBe('e2e-gemini-key');
  expect(gemini.body.contents[0].parts[0].inlineData.mimeType).toBe('image/png');
  expect(JSON.stringify(gemini.body.contents)).toContain("men's winter jacket");
  expect(received.some((r) => r.method === 'GET' && r.url.includes('/image/upload/c_limit,w_1024,h_1024,f_jpg,q_80/'))).toBe(true);
  expect(received.filter((r) => r.url.includes('/upload') && r.method === 'POST')).toHaveLength(1);
});

test('shows a clear error when the AI fails and keeps the form usable', async ({ page }) => {
  await page.goto('/en/dashboard/products/new');
  const editor = page.locator('app-product-editor');
  const ai = editor.locator('app-ai-assistant');

  await ai.getByLabel('Describe the product').fill(`jacket ${E2E.ai.failWord}`);
  await ai.getByRole('button', { name: 'Fill with AI', exact: true }).click();

  await expect(ai.getByRole('alert')).toContainText('The AI provider failed');
  await expect(editor.getByLabel('Title', { exact: true })).toBeEditable();
  await expect(editor.getByLabel('Title', { exact: true })).toHaveValue('');
  await expect(ai.getByRole('button', { name: 'Fill with AI', exact: true })).toBeEnabled();
});
