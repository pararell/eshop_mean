import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { AuthModule } from '../auth/auth.module';
import { OrdersService } from './orders.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot(), AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
