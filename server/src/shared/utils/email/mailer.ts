import sgMail from '@sendgrid/mail';

import { getContent } from './email-utils';
import type { EmailTranslations, EmailType } from './email.types';

sgMail.setApiKey(process.env.SENDGRID_KEY!);

export const sendMsg = async (email: string, emailType: EmailType, translations: EmailTranslations) => {
  try {
    const msg = {
      to: email,
      from: process.env.EMAIL_FROM!,
      subject: emailType.subject,
      html: getContent(emailType, translations)!,
    };
    return await sgMail.send(msg);
  } catch (error) {
    console.error(error);

    const { response } = error as { response?: { body?: unknown } };
    if (response) {
      console.error(response.body);
    }
  }
};
