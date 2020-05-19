import { Injectable, NotFoundException, BadRequestException, HttpService} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { sendMsg } from '../shared/utils/email/mailer';
import { ContactDto } from './dto/contact.dto';
import { PageDto } from './dto/page.dto';
import { Cart } from '../cart/utils/cart';
import { Page } from './models/page.model';


@Injectable()
export class EshopService {
  constructor(@InjectModel('Page') private pageModel: Model<Page>, private httpService: HttpService) {}

  async sendContact(contactDto: ContactDto, cart: Cart): Promise<void> {
    const { token } = contactDto;
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SERVER_KEY}&response=${token}`;

   const result = await this.httpService.post(url).toPromise();
   if (result.data.success) {
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
        throw new BadRequestException();
      }
   } else {
    throw new BadRequestException();
   }

  }

  async getPages(): Promise<Page[]> {
    const pages = await this.pageModel.find({ });
    return pages;
  }

  async getPage(titleUrl: string): Promise<Page> {
    const found = await this.pageModel.findOne({ titleUrl });

    if (!found) {
      throw new NotFoundException(`Product with title ${titleUrl} not found`);
    }

    return found;
  }

  async addOrEditPage(pageDto: PageDto): Promise<Page> {
    const {titleUrl} = pageDto;
    const found = await this.pageModel.findOne({ titleUrl });

    if (!found) {
      const newPage = Object.assign(pageDto, {
        dateAdded : Date.now()
      });

      try {
        const page = await new this.pageModel(newPage);
        page.save();
        return page;
      } catch {
        throw new BadRequestException();
      }
    }

    if (found) {
      try {
        const page = await found.updateOne(pageDto, {upsert: true});
        return page;
      } catch {
        throw new BadRequestException();
      }
    }
  }

  async deletePage(titleUrl: string) {
    const found = await this.pageModel.findOneAndRemove({ titleUrl });

      if (!found) {
        throw new NotFoundException(`Product with title ${titleUrl} not found`);
      }
  }

  private sendmail = async (email: string, contactDto: ContactDto, cart: Cart) => {
      const emailType = {
        subject: 'Contact',
        cart,
        contact: contactDto,
        date   : new Date()
      };

      const mailSended = await sendMsg(email, emailType);
      return mailSended;
  }


}
