import type { LanguageCode } from '@eshop/shared';

/**
 * Texts of the transactional emails, per language. Built in (not in the translations table) so an
 * email is always complete in the customer's language; the shop name still comes from the
 * shop's `ESHOP_TITLE` translation.
 */
export interface EmailCopy {
  // Order, customer
  orderSubject: (shop: string, number: string) => string;
  orderPreheader: (total: string) => string;
  orderTitle: string;
  greeting: (name?: string) => string;
  orderIntroCard: string;
  orderIntroDelivery: string;
  viewOrder: string;
  // Order, admin
  adminOrderSubject: (number: string, total: string) => string;
  adminOrderTitle: string;
  adminOrderIntro: (customer: string) => string;
  openInDashboard: string;
  customer: string;
  // Shared order parts
  orderNumber: string;
  orderDate: string;
  items: string;
  quantity: string;
  subtotal: string;
  shipping: string;
  shippingFree: string;
  total: string;
  payment: string;
  paidByCard: string;
  cashOnDelivery: string;
  shippingAddress: string;
  notes: string;
  // Contact form
  contactSubject: (shop: string) => string;
  contactTitle: string;
  contactIntro: string;
  adminContactSubject: (name: string) => string;
  adminContactTitle: string;
  yourMessage: string;
  message: string;
  replyTo: string;
  // Footer
  questions: (email: string) => string;
  footer: (shop: string) => string;
}

const en: EmailCopy = {
  orderSubject: (shop, number) => `Your order ${number} at ${shop}`,
  orderPreheader: (total) => `Thank you for your order. Total ${total}.`,
  orderTitle: 'Thank you for your order',
  greeting: (name) => (name ? `Hi ${name},` : 'Hi,'),
  orderIntroCard: 'we have received your payment and are preparing your order. We will let you know when it ships.',
  orderIntroDelivery: 'we have received your order and are preparing it. You pay on delivery. We will let you know when it ships.',
  viewOrder: 'View your order',
  adminOrderSubject: (number, total) => `New order ${number} · ${total}`,
  adminOrderTitle: 'New order',
  adminOrderIntro: (customer) => `${customer} placed an order.`,
  openInDashboard: 'Open in the dashboard',
  customer: 'Customer',
  orderNumber: 'Order number',
  orderDate: 'Date',
  items: 'Items',
  quantity: 'Qty',
  subtotal: 'Subtotal',
  shipping: 'Shipping',
  shippingFree: 'Free',
  total: 'Total',
  payment: 'Payment',
  paidByCard: 'Paid by card',
  cashOnDelivery: 'Cash on delivery',
  shippingAddress: 'Shipping address',
  notes: 'Notes',
  contactSubject: (shop) => `We received your message · ${shop}`,
  contactTitle: 'Thank you for your message',
  contactIntro: 'we have received your message and will get back to you soon.',
  adminContactSubject: (name) => `New message from ${name}`,
  adminContactTitle: 'New message from the contact form',
  yourMessage: 'Your message',
  message: 'Message',
  replyTo: 'Reply to',
  questions: (email) => `Questions? Write to <a href="mailto:${email}">${email}</a>.`,
  footer: (shop) => `You are receiving this email because of your activity at ${shop}.`,
};

const sk: EmailCopy = {
  orderSubject: (shop, number) => `Vaša objednávka ${number} v ${shop}`,
  orderPreheader: (total) => `Ďakujeme za objednávku. Spolu ${total}.`,
  orderTitle: 'Ďakujeme za objednávku',
  greeting: (name) => (name ? `Dobrý deň, ${name},` : 'Dobrý deň,'),
  orderIntroCard: 'platbu sme prijali a vašu objednávku pripravujeme. Keď ju odošleme, dáme vám vedieť.',
  orderIntroDelivery: 'vašu objednávku sme prijali a pripravujeme ju. Platíte pri doručení. Keď ju odošleme, dáme vám vedieť.',
  viewOrder: 'Zobraziť objednávku',
  adminOrderSubject: (number, total) => `Nová objednávka ${number} · ${total}`,
  adminOrderTitle: 'Nová objednávka',
  adminOrderIntro: (customer) => `${customer} vytvoril(a) objednávku.`,
  openInDashboard: 'Otvoriť v administrácii',
  customer: 'Zákazník',
  orderNumber: 'Číslo objednávky',
  orderDate: 'Dátum',
  items: 'Položky',
  quantity: 'Ks',
  subtotal: 'Medzisúčet',
  shipping: 'Doprava',
  shippingFree: 'Zadarmo',
  total: 'Spolu',
  payment: 'Platba',
  paidByCard: 'Zaplatené kartou',
  cashOnDelivery: 'Dobierka',
  shippingAddress: 'Adresa doručenia',
  notes: 'Poznámka',
  contactSubject: (shop) => `Vašu správu sme prijali · ${shop}`,
  contactTitle: 'Ďakujeme za správu',
  contactIntro: 'vašu správu sme prijali a čoskoro sa vám ozveme.',
  adminContactSubject: (name) => `Nová správa od ${name}`,
  adminContactTitle: 'Nová správa z kontaktného formulára',
  yourMessage: 'Vaša správa',
  message: 'Správa',
  replyTo: 'Odpovedať na',
  questions: (email) => `Máte otázku? Napíšte na <a href="mailto:${email}">${email}</a>.`,
  footer: (shop) => `Tento e-mail dostávate na základe vašej aktivity v obchode ${shop}.`,
};

const cs: EmailCopy = {
  orderSubject: (shop, number) => `Vaše objednávka ${number} v ${shop}`,
  orderPreheader: (total) => `Děkujeme za objednávku. Celkem ${total}.`,
  orderTitle: 'Děkujeme za objednávku',
  greeting: (name) => (name ? `Dobrý den, ${name},` : 'Dobrý den,'),
  orderIntroCard: 'platbu jsme přijali a vaši objednávku připravujeme. Až ji odešleme, dáme vám vědět.',
  orderIntroDelivery: 'vaši objednávku jsme přijali a připravujeme ji. Platíte při doručení. Až ji odešleme, dáme vám vědět.',
  viewOrder: 'Zobrazit objednávku',
  adminOrderSubject: (number, total) => `Nová objednávka ${number} · ${total}`,
  adminOrderTitle: 'Nová objednávka',
  adminOrderIntro: (customer) => `${customer} vytvořil(a) objednávku.`,
  openInDashboard: 'Otevřít v administraci',
  customer: 'Zákazník',
  orderNumber: 'Číslo objednávky',
  orderDate: 'Datum',
  items: 'Položky',
  quantity: 'Ks',
  subtotal: 'Mezisoučet',
  shipping: 'Doprava',
  shippingFree: 'Zdarma',
  total: 'Celkem',
  payment: 'Platba',
  paidByCard: 'Zaplaceno kartou',
  cashOnDelivery: 'Dobírka',
  shippingAddress: 'Doručovací adresa',
  notes: 'Poznámka',
  contactSubject: (shop) => `Vaši zprávu jsme přijali · ${shop}`,
  contactTitle: 'Děkujeme za zprávu',
  contactIntro: 'vaši zprávu jsme přijali a brzy se vám ozveme.',
  adminContactSubject: (name) => `Nová zpráva od ${name}`,
  adminContactTitle: 'Nová zpráva z kontaktního formuláře',
  yourMessage: 'Vaše zpráva',
  message: 'Zpráva',
  replyTo: 'Odpovědět na',
  questions: (email) => `Máte dotaz? Napište na <a href="mailto:${email}">${email}</a>.`,
  footer: (shop) => `Tento e-mail dostáváte na základě vaší aktivity v obchodě ${shop}.`,
};

const COPY: Record<LanguageCode, EmailCopy> = { en, sk, cs };

export const emailCopy = (lang: LanguageCode): EmailCopy => COPY[lang] ?? en;
