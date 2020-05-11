import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EshopController } from './eshop.controller';
import { EshopService } from './eshop.service';



@Module({
  imports       : [ConfigModule.forRoot()],
  controllers   : [EshopController],
  providers     : [EshopService]
})
export class EshopModule {}
