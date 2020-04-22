import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { AuthModule } from '../auth/auth.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';


@Module({
  imports     : [
        AuthModule, 
        ProductsModule
  ],
  controllers : [AdminController],
  providers   : [AdminService]
})
export class AdminModule {}
