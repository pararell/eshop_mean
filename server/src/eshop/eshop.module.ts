import { Module } from '@nestjs/common';
import { EshopController } from './eshop.controller';


@Module({
  imports       : [],
  controllers   : [EshopController],
  providers     : []
})
export class EshopModule {}
