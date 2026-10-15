import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { firstValueFrom } from 'rxjs';
import type { PublicConfigResponse, SessionCart, ShopConfig, Theme as ThemeData } from '@eshop/shared';

import { sendMsg } from '../shared/utils/email/mailer';
import { ContactDto } from './dto/contact.dto';
import { PageDto } from './dto/page.dto';
import { Cart } from '../cart/utils/cart';
import { Page } from './models/page.model';
import { Theme } from './models/theme.model';
import { Config } from './models/config.model';
import { Translation } from '../translations/translation.model';
import type { ContactEmail } from '../shared/utils/email/email.types';
import { ShopSession } from '../shared/types/session';
import { Database, DRIZZLE } from '../db/database.module';
import { configShipping, configs, pages, pageTranslations, themes } from '../db/schema';
import { configShippingValues, pageTranslationValues, toConfigDoc, toPageDoc, toThemeDoc } from '../db/mappers';
import { isLanguage } from '../db/catalog';
import { findTranslation } from '../translations/translation.queries';

/** What MongoDB's updateOne() answered; the API returned it for edits (the client ignores it) */
export interface UpdateResult {
  acknowledged: boolean;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  upsertedId: null;
}
const UPDATED: UpdateResult = { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null };

/** New document on create; the update result on edit */
export type UpsertResult<T> = T | UpdateResult | undefined;

@Injectable()
export class EshopService {
  constructor(
    @Inject(DRIZZLE) private db: Database,
    private httpService: HttpService,
  ) {}

  async getConfig(session: ShopSession): Promise<PublicConfigResponse> {
    const activeConfig = await this.findConfig({ active: true });

    if (activeConfig) {
      session.config = activeConfig as unknown as ShopConfig;
    }
    try {
      const [themeRow] = await this.db.select().from(themes).where(eq(themes.active, true)).limit(1);
      const theme = themeRow ? toThemeDoc(themeRow) : null;
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

  async sendContact(contactDto: ContactDto, cart: Cart | SessionCart | undefined, lang: string): Promise<void> {
    const { token } = contactDto;
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SERVER_KEY}&response=${token}`;

    const result = await firstValueFrom(this.httpService.post(url));
    if (result.data.success) {
      try {
        const translations = await findTranslation(this.db, lang);
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

  // Pages ----------------------------------------------------------------------------------------

  async getPages(lang: string, titles?: boolean): Promise<Page[]> {
    const docs = await this.loadPages();
    if (!titles) return docs;
    // Titles only: { _id, titleUrl, <lang>: { title } } (MongoDB projection)
    return docs.map((doc) => {
      const langInfo = isLanguage(lang) ? doc[lang] : undefined;
      return { _id: doc._id, titleUrl: doc.titleUrl, ...(langInfo ? { [lang]: { title: langInfo.title } } : {}) } as Page;
    });
  }

  async getPage(titleUrl: string, lang: string): Promise<Page | null> {
    const [found] = await this.loadPages(titleUrl);

    if (!found) {
      throw new NotFoundException(`Product with title ${titleUrl} not found`);
    }

    const langInfo = isLanguage(lang) ? found[lang] : undefined;
    return { _id: found._id, titleUrl: found.titleUrl, ...(langInfo ? { [lang]: langInfo } : {}) } as Page;
  }

  async addOrEditPage(pageDto: PageDto): Promise<UpsertResult<Page>> {
    const { titleUrl } = pageDto;
    try {
      return await this.db.transaction(async (tx) => {
        const [existing] = await tx.select().from(pages).where(eq(pages.titleUrl, titleUrl));
        const pageId = existing?.id ?? (await tx.insert(pages).values({ titleUrl }).returning({ id: pages.id }))[0].id;

        for (const t of pageTranslationValues(pageId, pageDto)) {
          await tx
            .insert(pageTranslations)
            .values(t)
            .onConflictDoUpdate({ target: [pageTranslations.pageId, pageTranslations.lang], set: { title: t.title, contentHtml: t.contentHtml } });
        }
        if (existing) return UPDATED;
        const [row] = await tx.select().from(pages).where(eq(pages.id, pageId));
        return toPageDoc(row, await tx.select().from(pageTranslations).where(eq(pageTranslations.pageId, pageId)));
      });
    } catch {
      throw new BadRequestException();
    }
  }

  async deletePage(titleUrl: string): Promise<void> {
    const deleted = await this.db.delete(pages).where(eq(pages.titleUrl, titleUrl)).returning({ id: pages.id });

    if (!deleted.length) {
      throw new NotFoundException(`Page with title ${titleUrl} not found`);
    }
  }

  // Themes ---------------------------------------------------------------------------------------

  async getThemes(): Promise<Theme[]> {
    const rows = await this.db.select().from(themes);
    return rows.map(toThemeDoc);
  }

  async addOrEditTheme(themeDto: ThemeData): Promise<UpsertResult<Theme>> {
    const { titleUrl } = themeDto;
    try {
      return await this.db.transaction(async (tx) => {
        const values = {
          ...(themeDto.styles !== undefined ? { styles: themeDto.styles } : {}),
          ...(themeDto.active !== undefined ? { active: themeDto.active === true || String(themeDto.active) === 'true' } : {}),
        };
        // At most one active theme (decision D8): activating one deactivates the others
        if (values.active) {
          await tx
            .update(themes)
            .set({ active: false })
            .where(and(eq(themes.active, true), ne(themes.titleUrl, titleUrl)));
        }

        const [existing] = await tx.select().from(themes).where(eq(themes.titleUrl, titleUrl));
        if (existing) {
          if (Object.keys(values).length) await tx.update(themes).set(values).where(eq(themes.id, existing.id));
          return UPDATED;
        }
        const [row] = await tx
          .insert(themes)
          .values({ titleUrl, ...values })
          .returning();
        return toThemeDoc(row);
      });
    } catch {
      throw new BadRequestException();
    }
  }

  async deleteTheme(titleUrl: string): Promise<void> {
    const deleted = await this.db.delete(themes).where(eq(themes.titleUrl, titleUrl)).returning({ id: themes.id });

    if (!deleted.length) {
      throw new NotFoundException(`Theme with title ${titleUrl} not found`);
    }
  }

  // Shop configs ---------------------------------------------------------------------------------

  async getConfigs(): Promise<Config[]> {
    return this.loadConfigs();
  }

  async addOrEditConfig(configDto: ShopConfig): Promise<UpsertResult<Config>> {
    const { titleUrl } = configDto;
    try {
      return await this.db.transaction(async (tx) => {
        const active = configDto.active === undefined ? undefined : configDto.active === true || String(configDto.active) === 'true';
        // At most one active shop config (decision D8): activating one deactivates the others
        if (active) {
          await tx
            .update(configs)
            .set({ active: false })
            .where(and(eq(configs.active, true), ne(configs.titleUrl, titleUrl)));
        }

        const [existing] = await tx.select().from(configs).where(eq(configs.titleUrl, titleUrl));
        let configId = existing?.id;
        if (existing) {
          if (active !== undefined) await tx.update(configs).set({ active }).where(eq(configs.id, existing.id));
        } else {
          [{ id: configId }] = await tx
            .insert(configs)
            .values({ titleUrl, ...(active !== undefined ? { active } : {}) })
            .returning({ id: configs.id });
        }

        for (const s of configShippingValues(configId!, configDto as unknown as Record<string, unknown>)) {
          const { configId: _configId, lang: _lang, ...rest } = s;
          await tx
            .insert(configShipping)
            .values(s)
            .onConflictDoUpdate({ target: [configShipping.configId, configShipping.lang], set: rest });
        }
        if (existing) return UPDATED;
        const [row] = await tx.select().from(configs).where(eq(configs.id, configId!));
        return toConfigDoc(row, await tx.select().from(configShipping).where(eq(configShipping.configId, configId!)));
      });
    } catch {
      throw new BadRequestException();
    }
  }

  async deleteConfig(titleUrl: string): Promise<void> {
    const deleted = await this.db.delete(configs).where(eq(configs.titleUrl, titleUrl)).returning({ id: configs.id });

    if (!deleted.length) {
      throw new NotFoundException(`Config with title ${titleUrl} not found`);
    }
  }

  // Helpers --------------------------------------------------------------------------------------

  private async loadPages(titleUrl?: string): Promise<Page[]> {
    const rows = await this.db
      .select()
      .from(pages)
      .where(titleUrl === undefined ? undefined : eq(pages.titleUrl, titleUrl));
    if (!rows.length) return [];
    const langRows = await this.db
      .select()
      .from(pageTranslations)
      .where(
        inArray(
          pageTranslations.pageId,
          rows.map((r) => r.id),
        ),
      );
    return rows.map((row) =>
      toPageDoc(
        row,
        langRows.filter((t) => t.pageId === row.id),
      ),
    );
  }

  private async loadConfigs(where?: { active: boolean }): Promise<Config[]> {
    const rows = await this.db
      .select()
      .from(configs)
      .where(where ? eq(configs.active, where.active) : undefined);
    if (!rows.length) return [];
    const shippingRows = await this.db
      .select()
      .from(configShipping)
      .where(
        inArray(
          configShipping.configId,
          rows.map((r) => r.id),
        ),
      );
    return rows.map((row) =>
      toConfigDoc(
        row,
        shippingRows.filter((s) => s.configId === row.id),
      ),
    );
  }

  private async findConfig(where: { active: boolean }): Promise<Config | null> {
    return (await this.loadConfigs(where))[0] ?? null;
  }

  private sendmail = async (email: string, contactDto: ContactDto, cart: Cart | SessionCart | undefined, translations: Translation | null) => {
    const emailType: ContactEmail = {
      subject: 'Contact',
      cart,
      contact: contactDto,
      date: new Date(),
    };

    const mailSended = await sendMsg(email, emailType, translations);
    return mailSended;
  };
}
