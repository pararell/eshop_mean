import * as sgMail from '@sendgrid/mail';

import { getContent } from './email-utils';

sgMail.setApiKey(process.env.SENDGRID_KEY);

export const sendMsg = async (email: string, emailType, translations) => {
  const msg = {
    to: email,
    from: 'no-reply@smrtic.eu',
    subject: emailType.subject,
    html: getContent(emailType, translations),
  };

  const response = await sgMail.send(msg);
  return response;
};
