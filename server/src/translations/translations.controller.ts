import { firstValueFrom } from 'rxjs';
import { Controller, Get, Query, UseGuards, Patch, Body } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';

import { Translation } from '../entities/translation.entity';
import { RolesGuard } from '../auth/roles.guard';
import { countryLang, languages } from '../shared/constans';

@Controller('api/translations')
export class TranslationsController {
  constructor(
    @InjectRepository(Translation) private translationRepository: Repository<Translation>,
    private httpService: HttpService,
  ) {}

  @Get()
  async getTranslations(@Query('lang') lang: string): Promise<Translation> {
    if (!lang) {
      const url = `https://geolocation-db.com/json/${process.env.GEO_LOCATION_API_KEY}`;
      try {
        const result = await firstValueFrom(this.httpService.post(url));
        const country = result.data.country_code
          ? result.data.country_code.toLowerCase()
          : '';
        const langCode = countryLang[country] || country['default'];

        return await this.translationRepository.findOne({ where: { lang: langCode } });
      } catch {
        return await this.translationRepository.findOne({ where: { lang: languages[0] } });
      }
    }

    return await this.translationRepository.findOne({ where: { lang } });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('all')
  async getAllTranslations(): Promise<Translation[]> {
    return await this.translationRepository.find({});
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('all')
  async updateTranslations(@Body() translations): Promise<Translation[]> {
    const updateTranslations = translations.map(async (translation) => {
      const langTranslation = await this.translationRepository.findOne({
        where: { lang: translation.lang },
      });
      if (!langTranslation) {
        const newTranslation = new Translation();
        newTranslation.lang = translation.lang;
        newTranslation.keys = translation.keys;
        await this.translationRepository.save(newTranslation);
      }
      await this.translationRepository.update(
        { lang: translation.lang },
        { keys: translation.keys },
      );
    });
    return Promise.all(updateTranslations);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch()
  async updateTranslation(
    @Query('lang') lang: string,
    @Body() translation,
  ): Promise<Translation> {
    await this.translationRepository.update({ lang }, translation);
    return this.translationRepository.findOne({ where: { lang } });
  }
}