import { languages } from '../../constans';
import { renderContactEmail } from './contact-email';
import { emailImageUrl, escapeHtml, readableOn } from './email-layout';
import { sampleContact, sampleOrder, sampleShop } from './email-samples';
import { renderOrderEmail } from './order-email';

describe('transactional emails', () => {
  describe.each(languages)('%s', (lang) => {
    it('order confirmation (customer, card) matches the snapshot', () => {
      const email = renderOrderEmail(sampleOrder(lang), 'customer', sampleShop);
      expect(email.subject).toMatchSnapshot('subject');
      expect(email.html).toMatchSnapshot('html');
      expect(email.text).toMatchSnapshot('text');
    });

    it('new-order email (admin) matches the snapshot', () => {
      const email = renderOrderEmail(sampleOrder(lang, 'PAYMENT_ON_DELIVERY'), 'admin', sampleShop);
      expect(email.subject).toMatchSnapshot('subject');
      expect(email.html).toMatchSnapshot('html');
      expect(email.text).toMatchSnapshot('text');
    });

    it('contact emails match the snapshot', () => {
      for (const audience of ['customer', 'admin'] as const) {
        const email = renderContactEmail(sampleContact(lang), audience, sampleShop);
        expect(email.html).toMatchSnapshot(`${audience} html`);
        expect(email.text).toMatchSnapshot(`${audience} text`);
      }
    });
  });

  it('writes the email in the order language, with its currency format', () => {
    expect(renderOrderEmail(sampleOrder('sk'), 'customer', sampleShop).html).toContain('Ďakujeme za objednávku');
    expect(renderOrderEmail(sampleOrder('cs'), 'customer', sampleShop).text).toMatch(/Celkem: 389,90\sKč/);
    expect(renderOrderEmail(sampleOrder('en'), 'customer', sampleShop).html).toContain('<html lang="en"');
  });

  it('names the payment method and links the order for the audience', () => {
    const card = renderOrderEmail(sampleOrder('en', 'WITH_PAYMENT'), 'customer', sampleShop);
    const cod = renderOrderEmail(sampleOrder('en', 'PAYMENT_ON_DELIVERY'), 'customer', sampleShop);
    const admin = renderOrderEmail(sampleOrder('en'), 'admin', sampleShop);
    expect(card.text).toContain('Payment: Paid by card');
    expect(cod.text).toContain('Payment: Cash on delivery');
    expect(card.html).toContain('href="https://eshop.example.com/en/orders/order1792489574t42"');
    expect(admin.html).toContain('href="https://eshop.example.com/en/dashboard/orders/order1792489574t42"');
    // Admins get the customer's contact, customers don't get the admin footer line
    expect(admin.text).toContain('Customer: Jana Nováková <jana@example.com>');
    expect(card.text).toContain('Questions? Write to shop@example.com.');
  });

  it('escapes everything that comes from customers or the catalog', () => {
    const order = sampleOrder('en');
    order.notes = '<script>alert(1)</script>';
    order.address = { ...order.address!, name: '"><img src=x onerror=alert(1)>' };
    const { html } = renderOrderEmail(order, 'admin', sampleShop);
    expect(html).not.toMatch(/<script>|<img src=x/);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Trekking Poles &lt;Carbon&gt;');

    const contact = renderContactEmail({ lang: 'en', email: 'a@b.c', name: '<b>x</b>', message: '<a href="evil">' }, 'admin', sampleShop).html;
    expect(contact).not.toMatch(/<b>x<\/b>|<a href="evil">/);
  });

  it('helpers: escaping, readable accent text, email-safe Cloudinary images', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    expect(readableOn('#111111')).toBe('#ffffff');
    expect(readableOn('#f2c200')).toBe('#111111');
    expect(emailImageUrl('https://res.cloudinary.com/shop/image/upload/v1/a.webp')).toBe(
      'https://res.cloudinary.com/shop/image/upload/c_pad,b_white,w_160,h_160,f_jpg,q_80/v1/a.webp',
    );
    expect(emailImageUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
  });
});
