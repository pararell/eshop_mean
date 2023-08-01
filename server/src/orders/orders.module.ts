import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import OrderSchema from './schemas/order.schema';
import { AuthModule } from '../auth/auth.module';
import { OrdersService } from './orders.service';
import { ConfigModule } from '@nestjs/config';
import TranslationScheme from '../translations/schemas/translation.schema';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'Translation', schema: TranslationScheme },
    ]),
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
