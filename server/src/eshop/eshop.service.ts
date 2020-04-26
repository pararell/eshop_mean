import { Injectable } from '@nestjs/common';
import Mailer from '../shared/utils/mailer';
import { ContactDto } from './dto/contact.dto';


@Injectable()
export class EshopService {
  constructor() {}

  async sendContact(contactDto: ContactDto, cart): Promise<void> {
      console.log(contactDto, 'contact')
    try {
    this.sendmail(contactDto.email, contactDto, cart);

    if (process.env.ADMIN_EMAILS) {
      process.env.ADMIN_EMAILS
        .split(',')
        .filter(Boolean)
        .forEach(email => {
          this.sendmail(email, contactDto, cart);
        });
     }
    } catch {
      console.log('Email send error')
    }
  }

  private sendmail = (email, contactDto: ContactDto, cart) => {
      const emailType = {
        subject: 'Contact',
        cart,
        contact: contactDto,
        date   : new Date()
      };
    
      const mailer = new Mailer(email, emailType);
    
      mailer.send();
  }

  
}
