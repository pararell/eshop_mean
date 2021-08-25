import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { TranslationsController } from './translations.controller';
import TranslationScheme from './schemas/translation.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Translation', schema: TranslationScheme },
    ]),
    AuthModule,
    HttpModule
  ],
  controllers: [TranslationsController],
  providers: [],
  exports: [MongooseModule],
})
export class TranslationsModule {}
