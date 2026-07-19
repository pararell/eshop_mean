import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { sendMsg } from '../shared/utils/email/mailer';
import { ContactDto } from './dto/contact.dto';
import { PageDto } from './dto/page.dto';
import { Cart } from '../cart/utils/cart';
import { Page } from '../entities/page.entity';
import { Theme } from '../entities/theme.entity';
import { Config } from '../entities/config.entity';
import { Translation } from '../entities/translation.entity';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EshopService {
  constructor(
    @InjectRepository(Page) private pageRepository: Repository<Page>,
    @InjectRepository(Theme) private themeRepository: Repository<Theme>,
    @InjectRepository(Config) private configRepository: Repository<Config>,
    @InjectRepository(Translation) private translationRepository: Repository<Translation>,
    private httpService: HttpService,
  ) {}

  async getConfig(session): Promise<{ config: any }> {
    const activeConfig = await this.configRepository.findOne({ where: { active: true } });

    if (activeConfig) {
      session.config = activeConfig;
    }
    try {
      const theme = await this.themeRepository.findOne({ where: { active: true } });
      const configFomEnvToFE = Object.keys(process.env)
        .filter((key) => key.includes('FE_'))
        .reduce((prev, curr) => ({ ...prev, [curr]: process.env[curr] }), {});
      const themeStyles =
        theme && Object.keys(theme.styles).length
          ? { styles: theme.styles }
          : {};

      return {
        config: Buffer.from(
          JSON.stringify({ ...configFomEnvToFE, ...themeStyles }),
        ).toString('base64'),
      };
    } catch {
      return { config: '' };
    }
  }

  async sendContact(
    contactDto: ContactDto,
    cart: Cart,
    lang: string,
  ): Promise<void> {
    const { token } = contactDto;
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SERVER_KEY}&response=${token}`;

    const result = await firstValueFrom(this.httpService.post(url));
    if (result.data.success) {
      try {
        const translations = await this.translationRepository.findOne({ where: { lang } });
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
    const pages = await this.pageRepository.find({});
    return pages;
  }

  async getPage(titleUrl: string, lang: string): Promise<Page> {
    const found = await this.pageRepository.findOne({ where: { titleUrl } });

    if (!found) {
      throw new NotFoundException(`Product with title ${titleUrl} not found`);
    }

    return found;
  }

  async addOrEditPage(pageDto: PageDto): Promise<Page> {
    const { titleUrl } = pageDto;
    const found = await this.pageRepository.findOne({ where: { titleUrl } });

    if (!found) {
      const newPage = new Page();
      Object.assign(newPage, pageDto, { dateAdded: new Date() });
      try {
        return await this.pageRepository.save(newPage);
      } catch {
        throw new BadRequestException();
      }
    }

    try {
      await this.pageRepository.update({ titleUrl }, pageDto);
      return this.pageRepository.findOne({ where: { titleUrl } });
    } catch {
      throw new BadRequestException();
    }
  }

  async deletePage(titleUrl: string): Promise<void> {
    const found = await this.pageRepository.findOne({ where: { titleUrl } });

    if (!found) {
      throw new NotFoundException(`Page with title ${titleUrl} not found`);
    }

    await this.pageRepository.delete({ titleUrl });
  }

  async getThemes(): Promise<Theme[]> {
    const themes = await this.themeRepository.find({});
    return themes;
  }

  async addOrEditTheme(themeDto: any): Promise<Theme> {
    const { titleUrl } = themeDto;
    const found = await this.themeRepository.findOne({ where: { titleUrl } });

    if (!found) {
      const newTheme = new Theme();
      Object.assign(newTheme, themeDto, { dateAdded: new Date() });
      try {
        return await this.themeRepository.save(newTheme);
      } catch {
        throw new BadRequestException();
      }
    }

    try {
      await this.themeRepository.update({ titleUrl }, themeDto);
      return this.themeRepository.findOne({ where: { titleUrl } });
    } catch {
      throw new BadRequestException();
    }
  }

  async deleteTheme(titleUrl: string): Promise<void> {
    const found = await this.themeRepository.findOne({ where: { titleUrl } });

    if (!found) {
      throw new NotFoundException(`Theme with title ${titleUrl} not found`);
    }

    await this.themeRepository.delete({ titleUrl });
  }

  async getConfigs(): Promise<Config[]> {
    const configs = await this.configRepository.find({});
    return configs;
  }

  async addOrEditConfig(configDto: any): Promise<Config> {
    const { titleUrl } = configDto;
    const found = await this.configRepository.findOne({ where: { titleUrl } });

    if (!found) {
      const newConfig = new Config();
      Object.assign(newConfig, configDto, { dateAdded: new Date() });
      try {
        return await this.configRepository.save(newConfig);
      } catch {
        throw new BadRequestException();
      }
    }

    try {
      await this.configRepository.update({ titleUrl }, configDto);
      return this.configRepository.findOne({ where: { titleUrl } });
    } catch {
      throw new BadRequestException();
    }
  }

  async deleteConfig(titleUrl: string): Promise<void> {
    const found = await this.configRepository.findOne({ where: { titleUrl } });

    if (!found) {
      throw new NotFoundException(`Config with title ${titleUrl} not found`);
    }

    await this.configRepository.delete({ titleUrl });
  }

  private sendmail = async (
    email: string,
    contactDto: ContactDto,
    cart: Cart,
    translations,
  ) => {
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