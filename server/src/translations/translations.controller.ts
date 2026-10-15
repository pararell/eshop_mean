import { firstValueFrom } from 'rxjs';
import { Controller, Get, Query, UseGuards, Patch, Body, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AuthGuard } from '@nestjs/passport';
import { eq } from 'drizzle-orm';
import type { Translation as TranslationData } from '@eshop/shared';

import { Translation } from './translation.model';
import { RolesGuard } from '../auth/roles.guard';
import { countryLang, languages } from '../shared/constans';
import { Database, DRIZZLE } from '../db/database.module';
import { translations } from '../db/schema';
import { toTranslationDoc } from '../db/mappers';
import { isLanguage } from '../db/catalog';
import type { UpdateResult } from '../eshop/eshop.service';
import { findTranslation } from './translation.queries';

@Controller('api/translations')
export class TranslationsController {
  constructor(
    @Inject(DRIZZLE) private db: Database,
    private httpService: HttpService,
  ) {}

  @Get()
  async getTranslations(@Query('lang') lang: string): Promise<Translation | null> {
    if (!lang) {
      const url = `https://geolocation-db.com/json/${process.env.GEO_LOCATION_API_KEY}`;
      try {
        const result = await firstValueFrom(this.httpService.post(url));
        const country = result.data.country_code ? result.data.country_code.toLowerCase() : '';
        const langCode = countryLang[country] || country['default'];

        return await findTranslation(this.db, langCode);
      } catch {
        return await findTranslation(this.db, languages[0]);
      }
    }

    return await findTranslation(this.db, lang);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('all')
  async getAllTranslations(): Promise<Translation[]> {
    const rows = await this.db.select().from(translations);
    return rows.map(toTranslationDoc);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('all')
  async updateTranslations(@Body() updates: TranslationData[]): Promise<UpdateResult[]> {
    const results: UpdateResult[] = [];
    for (const translation of updates) {
      // Unknown languages are skipped (MongoDB stored them, but no client reads them)
      if (!isLanguage(translation.lang)) continue;
      await this.db
        .insert(translations)
        .values({ lang: translation.lang, keys: translation.keys ?? {} })
        .onConflictDoUpdate({ target: translations.lang, set: { keys: translation.keys ?? {} } });
      results.push({ acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null });
    }
    return results;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch()
  async updateTranslation(@Query('lang') lang: string, @Body() translation: Partial<TranslationData>): Promise<Translation | null> {
    if (!isLanguage(lang)) return null;
    const [row] = await this.db
      .update(translations)
      .set({ keys: translation.keys ?? {} })
      .where(eq(translations.lang, lang))
      .returning();
    return row ? toTranslationDoc(row) : null;
  }
}
