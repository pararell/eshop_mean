import * as sgMail from '@sendgrid/mail';

import { getContent } from './email-utils';

sgMail.setApiKey(process.env.SENDGRID_KEY);

export const sendMsg = async (email: string, emailType) => {
  const msg = {
    to: email,
    from: 'no-reply@eshop.sk',
    subject: emailType.subject,
    html: getContent(emailType),
  };

  const response = await sgMail.send(msg);
  return response;
};
