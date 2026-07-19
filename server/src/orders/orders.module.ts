import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { Order } from '../entities/order.entity';
import { AuthModule } from '../auth/auth.module';
import { OrdersService } from './orders.service';
import { ConfigModule } from '@nestjs/config';
import { Translation } from '../entities/translation.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([Order, Translation]),
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}