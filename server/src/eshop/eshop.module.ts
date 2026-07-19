import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { EshopController } from './eshop.controller';
import { EshopService } from './eshop.service';
import { Page } from '../entities/page.entity';
import { Theme } from '../entities/theme.entity';
import { Config } from '../entities/config.entity';
import { Translation } from '../entities/translation.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([Page, Theme, Config, Translation]),
    HttpModule,
  ],
  controllers: [EshopController],
  providers: [EshopService],
})
export class EshopModule {}