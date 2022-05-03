import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

import { EshopController } from './eshop.controller';
import { EshopService } from './eshop.service';
import PageSchema from './schemas/page.schema';
import ThemeSchema from './schemas/theme.schema';
import ConfigSchema from './schemas/config.schema';
import TranslationScheme from '../translations/schemas/translation.schema';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forFeature([
      { name: 'Page', schema: PageSchema },
      { name: 'Theme', schema: ThemeSchema },
      { name: 'Config', schema: ConfigSchema },
      { name: 'Translation', schema: TranslationScheme },
    ]),
    HttpModule,
  ],
  controllers: [EshopController],
  providers: [EshopService],
})
export class EshopModule {}
