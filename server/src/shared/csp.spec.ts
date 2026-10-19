import { withCspNonce } from './csp';

describe('withCspNonce', () => {
  const template = [
    '<html><head><script>(function(){})()</script>',
    '<script type="text/javascript" id="ng-event-dispatch-contract">x()</script></head>',
    '<body><eshop-mean-app></eshop-mean-app><script src="main.js" type="module"></script>',
    '<script nonce="kept">y()</script></body></html>',
  ].join('');

  it('puts the nonce on every script tag and the root element', () => {
    const html = withCspNonce(template, 'abc123');

    expect(html.match(/<script nonce="abc123"/g)).toHaveLength(3);
    expect(html).toContain('<script nonce="kept">');
    expect(html).toContain('<eshop-mean-app ngCspNonce="abc123">');
  });

  it('does not touch tags that merely start with "script"', () => {
    expect(withCspNonce('<scripts></scripts>', 'n')).toBe('<scripts></scripts>');
  });
});
