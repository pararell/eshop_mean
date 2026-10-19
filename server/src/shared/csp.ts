/**
 * The page template for one request: every inline `<script>` gets the request's CSP nonce, and
 * `ngCspNonce` on the root element makes Angular put it on the scripts and styles it adds
 * (event replay, critical CSS). See the CSP in server/src/setAppDB.ts.
 */
export function withCspNonce(template: string, nonce: string): string {
  return template
    .replace(/<script\b(?![^>]*\bnonce=)/g, `<script nonce="${nonce}"`)
    .replace(/<eshop-mean-app\b/, `<eshop-mean-app ngCspNonce="${nonce}"`);
}
