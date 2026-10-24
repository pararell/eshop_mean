import type { Address, LanguageCode, LocalizedCart } from '@eshop/shared';

import { emailCopy } from './email-copy';
import {
  button,
  C,
  emailImageUrl,
  EmailShop,
  escapeHtml,
  FONT,
  formatDate,
  formatMoney,
  heading,
  infoBlock,
  layout,
  paragraph,
  RenderedEmail,
} from './email-layout';

export interface OrderEmailData {
  orderId: string;
  date: Date;
  lang: LanguageCode;
  currency: string;
  /** Cart in the order's language; `totalPrice` includes shipping */
  cart: LocalizedCart;
  /** 'WITH_PAYMENT' (card) or 'PAYMENT_ON_DELIVERY' */
  type?: string;
  customerEmail: string;
  address?: Address;
  notes?: string;
}

export type OrderEmailAudience = 'customer' | 'admin';

const addressLines = (address?: Address): string[] =>
  address
    ? [address.name, address.line1, address.line2, [address.zip, address.city].filter(Boolean).join(' '), address.region, address.country]
        .map((line) => (line ?? '').trim())
        .filter(Boolean)
    : [];

/**
 * Order confirmation (customer) or new-order notice (admins), as HTML and plain text.
 * Every value from the customer or the catalog is escaped.
 */
export function renderOrderEmail(data: OrderEmailData, audience: OrderEmailAudience, shop: EmailShop): RenderedEmail {
  const t = emailCopy(data.lang);
  const money = (amount: number) => formatMoney(amount, data.currency, data.lang);
  const { cart } = data;
  const total = money(cart.totalPrice);
  const subtotal = money(cart.totalPrice - (cart.shippingCost || 0));
  const shipping = cart.shippingCost ? money(cart.shippingCost) : t.shippingFree;
  const paidByCard = data.type === 'WITH_PAYMENT';
  const payment = paidByCard ? t.paidByCard : t.cashOnDelivery;
  const date = formatDate(data.date, data.lang);
  const address = addressLines(data.address);
  const name = data.address?.name?.trim();
  const customerLabel = name ? `${name} <${data.customerEmail}>` : data.customerEmail;
  const orderUrl =
    audience === 'admin'
      ? `${shop.url}/${data.lang}/dashboard/orders/${encodeURIComponent(data.orderId)}`
      : `${shop.url}/${data.lang}/orders/${encodeURIComponent(data.orderId)}`;

  const subject = audience === 'admin' ? t.adminOrderSubject(data.orderId, total) : t.orderSubject(shop.name, data.orderId);

  // ---- HTML ------------------------------------------------------------------------------------
  const intro =
    audience === 'admin'
      ? heading(t.adminOrderTitle) + paragraph(escapeHtml(t.adminOrderIntro(customerLabel)))
      : heading(t.orderTitle) + paragraph(escapeHtml(t.greeting(name))) + paragraph(escapeHtml(paidByCard ? t.orderIntroCard : t.orderIntroDelivery));

  const meta = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-soft" style="background:${C.soft};margin:8px 0 28px">
  <tr>
    <td style="padding:14px 16px;font-family:${FONT};font-size:14px;color:${C.text}">
      <span class="muted" style="color:${C.muted}">${escapeHtml(t.orderNumber)}</span><br><strong>${escapeHtml(data.orderId)}</strong>
    </td>
    <td style="padding:14px 16px;font-family:${FONT};font-size:14px;color:${C.text}">
      <span class="muted" style="color:${C.muted}">${escapeHtml(t.orderDate)}</span><br><strong>${escapeHtml(date)}</strong>
    </td>
  </tr>
</table>`;

  const rows = cart.items
    .map((line) => {
      const img = emailImageUrl(line.item?.mainImage?.url);
      return `
  <tr>
    <td class="item-img line" width="72" style="padding:12px 12px 12px 0;border-bottom:1px solid ${C.border};vertical-align:top">
      ${img ? `<img src="${escapeHtml(img)}" width="72" height="72" alt="" style="width:72px;height:72px;object-fit:contain;background:#ffffff;border:1px solid ${C.border}">` : ''}
    </td>
    <td class="line" style="padding:12px 8px 12px 0;border-bottom:1px solid ${C.border};vertical-align:top;font-family:${FONT};font-size:15px;line-height:1.4;color:${C.text}">
      <strong>${escapeHtml(line.item?.title)}</strong><br>
      <span class="muted" style="color:${C.muted};font-size:14px">${escapeHtml(t.quantity)} ${line.qty} × ${escapeHtml(money(line.price))}</span>
    </td>
    <td class="line" align="right" style="padding:12px 0;border-bottom:1px solid ${C.border};vertical-align:top;white-space:nowrap;font-family:${FONT};font-size:15px;color:${C.text}">
      ${escapeHtml(money(line.price * line.qty))}
    </td>
  </tr>`;
    })
    .join('');

  const sumRow = (label: string, value: string, strong = false) => `
  <tr>
    <td style="padding:${strong ? '12px' : '4px'} 0 0;font-family:${FONT};font-size:${strong ? '18px' : '15px'};${strong ? 'font-weight:600;' : ''}color:${C.text}">${escapeHtml(label)}</td>
    <td align="right" style="padding:${strong ? '12px' : '4px'} 0 0;white-space:nowrap;font-family:${FONT};font-size:${strong ? '18px' : '15px'};${strong ? 'font-weight:600;' : ''}color:${C.text}">${escapeHtml(value)}</td>
  </tr>`;

  const items = `
<p class="muted" style="margin:0 0 4px;font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${C.muted}">${escapeHtml(t.items)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 28px">
  ${sumRow(t.subtotal, subtotal)}
  ${sumRow(t.shipping, shipping)}
  ${sumRow(t.total, total, true)}
</table>`;

  const details =
    (audience === 'admin'
      ? infoBlock(
          t.customer,
          `${escapeHtml(name ?? '')}${name ? '<br>' : ''}<a href="mailto:${escapeHtml(data.customerEmail)}">${escapeHtml(data.customerEmail)}</a>`,
        )
      : '') +
    infoBlock(t.payment, escapeHtml(payment)) +
    (address.length ? infoBlock(t.shippingAddress, address.map(escapeHtml).join('<br>')) : '') +
    (data.notes?.trim() ? infoBlock(t.notes, escapeHtml(data.notes.trim()).replace(/\n/g, '<br>')) : '');

  const content = intro + meta + items + details + button(orderUrl, audience === 'admin' ? t.openInDashboard : t.viewOrder, shop);

  const footer =
    (audience === 'customer' && shop.contactEmail ? `${t.questions(escapeHtml(shop.contactEmail))}<br>` : '') +
    `${escapeHtml(t.footer(shop.name))}<br><a href="${escapeHtml(shop.url)}" style="color:${C.muted}">${escapeHtml(shop.url.replace(/^https?:\/\//, ''))}</a>`;

  const html = layout({ lang: data.lang, title: subject, preheader: t.orderPreheader(total), content, footer, shop });

  // ---- Plain text ------------------------------------------------------------------------------
  const text = [
    audience === 'admin' ? t.adminOrderTitle : t.orderTitle,
    '',
    ...(audience === 'admin' ? [t.adminOrderIntro(customerLabel)] : [t.greeting(name), paidByCard ? t.orderIntroCard : t.orderIntroDelivery]),
    '',
    `${t.orderNumber}: ${data.orderId}`,
    `${t.orderDate}: ${date}`,
    '',
    `${t.items}:`,
    ...cart.items.map((line) => `- ${line.item?.title ?? ''}: ${line.qty} × ${money(line.price)} = ${money(line.price * line.qty)}`),
    '',
    `${t.subtotal}: ${subtotal}`,
    `${t.shipping}: ${shipping}`,
    `${t.total}: ${total}`,
    '',
    ...(audience === 'admin' ? [`${t.customer}: ${customerLabel}`] : []),
    `${t.payment}: ${payment}`,
    ...(address.length ? ['', `${t.shippingAddress}:`, ...address] : []),
    ...(data.notes?.trim() ? ['', `${t.notes}:`, data.notes.trim()] : []),
    '',
    `${audience === 'admin' ? t.openInDashboard : t.viewOrder}: ${orderUrl}`,
    '',
    '--',
    ...(audience === 'customer' && shop.contactEmail ? [t.questions(shop.contactEmail).replace(/<[^>]+>/g, '')] : []),
    `${shop.name} · ${shop.url}`,
  ].join('\n');

  return { subject, html, text };
}
