import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { sendMsg } from '../shared/utils/email/mailer';
import { ContactDto } from './dto/contact.dto';
import { PageDto } from './dto/page.dto';
import { Cart } from '../cart/utils/cart';
import { Page } from './models/page.model';
import { Theme } from './models/theme.model';
import { Config } from './models/config.model';
import { Translation } from '../translations/translation.model';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EshopService {
  constructor(
    @InjectModel('Page') private pageModel: Model<Page>,
    @InjectModel('Theme') private themeModel: Model<Theme>,
    @InjectModel('Config') private configModel: Model<Config>,
    @InjectModel('Translation') private translationModel: Model<Translation>,
    private httpService: HttpService,
  ) {}

  async getConfig(session): Promise<{ config: any }> {
    const activeConfig = await this.configModel.findOne({ active: true });

    if (activeConfig) {
      session.config = activeConfig;
    }
    try {
      const theme = await this.themeModel.findOne({ active: true });
      const configFomEnvToFE = Object.keys(process.env)
        .filter((key) => key.includes('FE_'))
        .reduce((prev, curr) => ({ ...prev, [curr]: process.env[curr] }), {});
      const themeStyles = theme && Object.keys(theme.styles).length ? { styles: theme.styles } : {};

      return {
        config: Buffer.from(JSON.stringify({ ...configFomEnvToFE, ...themeStyles })).toString('base64'),
      };
    } catch {
      return { config: '' };
    }
  }

  async sendContact(contactDto: ContactDto, cart: Cart, lang: string): Promise<void> {
    const { token } = contactDto;
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SERVER_KEY}&response=${token}`;

    const result = await firstValueFrom(this.httpService.post(url));
    if (result.data.success) {
      try {
        const translations = await this.translationModel.findOne({ lang });
        this.sendmail(contactDto.email, contactDto, cart, translations);

        if (process.env.ADMIN_EMAILS) {
          process.env.ADMIN_EMAILS.split(',')
            .filter(Boolean)
            .forEach((email) => {
              this.sendmail(email, contactDto, cart, translations);
            });
        }
      } catch {
        throw new BadRequestException();
      }
    } else {
      throw new BadRequestException();
    }
  }

  async getPages(lang: string, titles?: boolean): Promise<Page[]> {
    const selectQuery = titles ? { titleUrl: 1, [`${lang}.title`]: 1 } : {};
    const pages = await this.pageModel.find({}, selectQuery);
    return pages;
  }

  async getPage(titleUrl: string, lang: string): Promise<Page> {
    const found = await this.pageModel.findOne({ titleUrl }, { titleUrl: 1, [lang]: 1 });

    if (!found) {
      throw new NotFoundException(`Product with title ${titleUrl} not found`);
    }

    return found;
  }

  async addOrEditPage(pageDto: PageDto): Promise<Page> {
    const { titleUrl } = pageDto;
    const found = await this.pageModel.findOne({ titleUrl });

    if (!found) {
      const newPage = Object.assign(pageDto, {
        dateAdded: Date.now(),
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
        const page = await found.updateOne(pageDto, { upsert: true });
        return page;
      } catch {
        throw new BadRequestException();
      }
    }
  }

  async deletePage(titleUrl: string): Promise<void> {
    const found = await this.pageModel.findOneAndRemove({ titleUrl });

    if (!found) {
      throw new NotFoundException(`Page with title ${titleUrl} not found`);
    }
  }

  async getThemes(): Promise<Theme[]> {
    const themes = await this.themeModel.find({});
    return themes;
  }

  async addOrEditTheme(themeDto: any): Promise<Theme> {
    const { titleUrl } = themeDto;
    const found = await this.themeModel.findOne({ titleUrl });

    if (!found) {
      const newTheme = Object.assign(themeDto, {
        dateAdded: Date.now(),
      });

      try {
        const theme = await new this.themeModel(newTheme);
        theme.save();
        return theme;
      } catch {
        throw new BadRequestException();
      }
    }

    if (found) {
      try {
        const theme = await found.updateOne(themeDto, { upsert: true });
        return theme;
      } catch {
        throw new BadRequestException();
      }
    }
  }

  async deleteTheme(titleUrl: string): Promise<void> {
    const found = await this.themeModel.findOneAndRemove({ titleUrl });

    if (!found) {
      throw new NotFoundException(`Theme with title ${titleUrl} not found`);
    }
  }

  async getConfigs(): Promise<Config[]> {
    const configs = await this.configModel.find({});
    return configs;
  }

  async addOrEditConfig(configDto: any): Promise<Config> {
    const { titleUrl } = configDto;
    const found = await this.configModel.findOne({ titleUrl });

    if (!found) {
      const newConfig = Object.assign(configDto, {
        dateAdded: Date.now(),
      });

      try {
        const config = await new this.configModel(newConfig);
        config.save();
        return config;
      } catch {
        throw new BadRequestException();
      }
    }

    if (found) {
      try {
        const config = await found.updateOne(configDto, { upsert: true });
        return config;
      } catch {
        throw new BadRequestException();
      }
    }
  }

  async deleteConfig(titleUrl: string): Promise<void> {
    const found = await this.configModel.findOneAndRemove({ titleUrl });

    if (!found) {
      throw new NotFoundException(`Config with title ${titleUrl} not found`);
    }
  }

  private sendmail = async (email: string, contactDto: ContactDto, cart: Cart, translations) => {
    const emailType = {
      subject: 'Contact',
      cart,
      contact: contactDto,
      date: new Date(),
    };

    const mailSended = await sendMsg(email, emailType, translations);
    return mailSended;
  };
}
