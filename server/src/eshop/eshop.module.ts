import { Module } from '@nestjs/common';
import { EshopController } from './eshop.controller';
import { EshopService } from './eshop.service';


@Module({
  imports       : [],
  controllers   : [EshopController],
  providers     : [EshopService]
})
export class EshopModule {}
