import sgMail from '@sendgrid/mail';

import { getContent } from './email-utils';

sgMail.setApiKey(process.env.SENDGRID_KEY);

export const sendMsg = async (email: string, emailType, translations) => {
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM,
    subject: emailType.subject,
    html: getContent(emailType, translations),
  };
  try {
    return await sgMail.send(msg);
  } catch (error) {
    console.error(error);

    if (error.response) {
      console.error(error.response.body)
    }
  }
};
