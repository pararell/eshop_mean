import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import Mailer from '../shared/utils/mailer';
import { ContactDto } from './dto/contact.dto';
import { PageDto } from './dto/page.dto';
import { Cart } from '../cart/utils/cart';
import { Page } from './models/page.model';



@Injectable()
export class EshopService {
  constructor(@InjectModel('Page') private pageModel: Model<Page>) {}

  async sendContact(contactDto: ContactDto, cart: Cart): Promise<void> {
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

  private sendmail = (email: string, contactDto: ContactDto, cart: Cart) => {
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
