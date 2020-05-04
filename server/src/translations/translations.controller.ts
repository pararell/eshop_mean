import {
    Controller,
    Get,
    Query,
    UseGuards,
    Patch,
    Body
  } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Translation } from './translation.model';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';


  @Controller('api/translations')
  export class TranslationsController {
    constructor(@InjectModel('Translation') private translationModel: Model<Translation>) {}

    @Get()
    async getTranslations(@Query('lang') lang: string): Promise<Translation> {
      return await this.translationModel.findOne({ lang });
    }

    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Get('all')
    async getAllTranslations(): Promise<Translation[]> {
      return await this.translationModel.find({ });
    }

    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Patch('all')
    async updateTranslations(@Body() translations): Promise<Translation[]> {
      const updateTranslations = translations.map(translation => {
        return this.translationModel.update({'lang': translation.lang}, {'$set': {'keys': translation.keys }});
    });
      return Promise.all(updateTranslations);
    }

    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Patch()
    async updateTranslation(@Query('lang') lang: string, @Body() translation): Promise<Translation> {
      return await this.translationModel.findOneAndUpdate({lang}, translation, {new: true});
    }

  }
