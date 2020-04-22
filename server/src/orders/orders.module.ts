import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import OrderSchema from './schemas/order.schema';
import { AuthModule } from '../auth/auth.module';
import { OrdersService } from './orders.service';


@Module({
  imports: [
      MongooseModule.forFeature([{ name: 'Order', schema: OrderSchema }]),
      AuthModule
    ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
