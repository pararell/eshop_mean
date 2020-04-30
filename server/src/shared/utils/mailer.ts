import * as sendgrid from 'sendgrid';
import emailTemplates from './emailTemplates';

class Mailer extends sendgrid.mail.Mail {
    sgApi;
    from_email;
    subject;
    body;
    email;

  constructor(reqEmail, emailType) {
    super();

    this.sgApi = sendgrid(process.env.SENDGRID_KEY);

    this.from_email = new sendgrid.mail.Email('no-reply@bluetooh-eshop.com');
    this.subject = emailType.subject;

    this.body = new sendgrid.mail.Content('text/html', getContent(emailType));

    this.email = new sendgrid.mail.Email(reqEmail);
    const personalize = new sendgrid.mail.Personalization();
    personalize.addTo(this.email);

    this.addContent(this.body);
    this.addPersonalization(personalize);
  }

  async send() {
    const request = this.sgApi.emptyRequest({
      method: 'POST',
      path: '/v3/mail/send',
      body: this.toJSON()
    });

    const response = await this.sgApi.API(request);
    return response;
  }
}

export default Mailer;

function getContent(emailType) {
  if (emailType.subject === 'Order') {
    const cart = emailType.cart;

    return emailTemplates(cart, emailType);

  } else if (emailType.subject === 'Contact') {
        return `<html>
            <body>
            <div style='text-align:center;'>
            <h3> Thank you for contact us! </h3>
            <p> We will let you know soon about your requirement</p>
            <p>Your requirement:</p>
            <p> Name: ${emailType.contact.name} </p>
            <p> Email: ${emailType.contact.email} </p>
            <p> Notes: ${emailType.contact.notes} </p>
            <div>
            </div>
            <div>
            </div>
            <a href='https://angular-un-ngrx-node-eshop.herokuapp.com> Bluetooth Eshop </a>
            </div>
            </body>
            </html>
        `;
  } else if (emailType.subject === 'Contact-From-Customer') {
        return `<html>
            <body>
            <div style='text-align:center;'>
            <h3> Contact from customer</h3>
            <p> Name: ${emailType.contact.name} </p>
            <p> Email: ${emailType.contact.email} </p>
            <p> Notes: ${emailType.contact.notes} </p>
            <div>
            </div>
            <div>
            </div>
            <a href='https://angular-un-ngrx-node-eshop.herokuapp.com> Bluetooth Eshop </a>
            </div>
            </body>
            </html>
        `;
  }
}
