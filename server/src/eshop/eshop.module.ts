import { Module, HttpModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { EshopController } from './eshop.controller';
import { EshopService } from './eshop.service';
import PageSchema from './schemas/page.schema';
import ThemeSchema from './schemas/theme.schema';
import ConfigSchema from './schemas/config.schema';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forFeature([
      { name: 'Page', schema: PageSchema },
      { name: 'Theme', schema: ThemeSchema },
      { name: 'Config', schema: ConfigSchema }
    ]),
    HttpModule,
  ],
  controllers: [EshopController],
  providers: [EshopService],
})
export class EshopModule {}
