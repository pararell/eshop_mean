import { Controller, Get, Query, UseGuards, Patch, Body, HttpService } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthGuard } from '@nestjs/passport';

import { Translation } from './translation.model';
import { RolesGuard } from '../auth/roles.guard';
import { countryLang, languages } from '../shared/constans';

@Controller('api/translations')
export class TranslationsController {
  constructor(
    @InjectModel('Translation') private translationModel: Model<Translation>,
    private httpService: HttpService
  ) {}

  @Get()
  async getTranslations(@Query('lang') lang: string): Promise<Translation> {
    if (!lang) {
      const url = `https://geolocation-db.com/json/${process.env.GEO_LOCATION_API_KEY}`;
      try {
      const result = await this.httpService.get(url).toPromise();
      const country = result.data.country_code ? result.data.country_code.toLowerCase() : '';
      const langCode = countryLang[country] || country['default'];

      return await this.translationModel.findOne({ lang: langCode });
      } catch {
        return await this.translationModel.findOne({ lang: languages[0] });
      }
    }

    return await this.translationModel.findOne({ lang });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('all')
  async getAllTranslations(): Promise<Translation[]> {
    return await this.translationModel.find({});
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('all')
  async updateTranslations(@Body() translations): Promise<Translation[]> {
    const updateTranslations = translations.map((translation) => {
      return this.translationModel.update(
        { lang: translation.lang },
        { $set: { keys: translation.keys } },
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
    return await this.translationModel.findOneAndUpdate({ lang }, translation, {
      new: true,
    });
  }
}
