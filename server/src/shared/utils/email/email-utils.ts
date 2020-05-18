import emailTemplates from './emailTemplates';

export function getContent(emailType) {
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
