import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Playwright globalTeardown: fail the run if the app logged uncaught or Angular runtime errors
// (collected by start-server.mjs), e.g. an SSR error that still returned a page.
export default function checkServerErrors() {
  const file = resolve(import.meta.dirname, '../../test-results/e2e-server-errors.log');
  const errors = existsSync(file) ? readFileSync(file, 'utf8').trim() : '';
  if (errors) {
    throw new Error(`The server logged errors during the e2e run:\n${errors}`);
  }
}
