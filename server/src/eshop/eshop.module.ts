import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { EshopController } from './eshop.controller';
import { EshopService } from './eshop.service';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule],
  controllers: [EshopController],
  providers: [EshopService],
})
export class EshopModule {}
