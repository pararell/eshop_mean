import emailTemplates from './emailTemplates';
import type { EmailTranslations, EmailType } from './email.types';

export function getContent(emailType: EmailType, translations: EmailTranslations): string | undefined {
  if (emailType.subject === 'Order') {
    const cart = emailType.cart;

    return emailTemplates(cart, emailType, translations);
  } else if (emailType.subject === 'Contact') {
    const keys = translations ? translations['keys'] : {};

    return `<html>
              <body>
                <div style='text-align:center;'>
                  <h3> ${keys.Email_contact_header || 'Thank you, We will let you know soon about your requirement'}  </h3>
                  <p> Name: ${emailType.contact.name} </p>
                  <p> Email: ${emailType.contact.email} </p>
                  <p> Notes: ${emailType.contact.notes} </p>
                  <div>
                  </div>
                  <a href='https://smrtic.eu'> ${keys.ESHOP_TITLE || 'Eshop'} </a>
                </div>
              </body>
            </html>
        `;
  }
}
