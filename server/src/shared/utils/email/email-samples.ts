// Sample data for the email preview (npm run email:preview) and the snapshot tests.
import type { LanguageCode, LocalizedCart } from '@eshop/shared';

import type { ContactEmailData } from './contact-email';
import type { EmailShop } from './email-layout';
import type { OrderEmailData } from './order-email';

export const sampleShop: EmailShop = {
  name: 'Eshop',
  url: 'https://eshop.example.com',
  accent: '#111111',
  onAccent: '#ffffff',
  contactEmail: 'shop@example.com',
};

const item = (title: string, price: number, qty: number, image: string) =>
  ({
    id: title,
    qty,
    price,
    shipingCostType: 'basic',
    item: { titleUrl: title.toLowerCase().replace(/\W+/g, '-'), title, mainImage: { url: image, name: title } },
  }) as unknown as LocalizedCart['items'][number];

const cart: LocalizedCart = {
  items: [
    item('MSR Tent, Green with Red Accents', 300, 1, 'https://res.cloudinary.com/dnpgh1vhi/image/upload/v1792489574/file_hdt4kv.jpg'),
    item('Trekking Poles <Carbon>', 42.5, 2, 'https://res.cloudinary.com/demo/image/upload/sample.jpg'),
  ],
  totalQty: 3,
  totalPrice: 389.9,
  shippingCost: 4.9,
  shippingLimit: 500,
  shippingType: 'basic',
};

export const sampleOrder = (lang: LanguageCode, type: 'WITH_PAYMENT' | 'PAYMENT_ON_DELIVERY' = 'WITH_PAYMENT'): OrderEmailData => ({
  orderId: 'order1792489574t42',
  date: new Date('2026-10-24T10:00:00Z'),
  lang,
  currency: lang === 'cs' ? 'CZK' : 'EUR',
  cart,
  type,
  customerEmail: 'jana@example.com',
  address: { name: 'Jana Nováková', line1: 'Hlavná 12', city: 'Bratislava', zip: '811 01', country: 'Slovakia' },
  notes: 'Please call before delivery.\nThe bell does not work.',
});

export const sampleContact = (lang: LanguageCode): ContactEmailData => ({
  lang,
  name: 'Jana Nováková',
  email: 'jana@example.com',
  message: 'Do you have the MSR tent in blue?\nThanks!',
});
