import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { AuthModule } from '../auth/auth.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports     : [
    ConfigModule.forRoot(),
    AuthModule, 
    ProductsModule
  ],
  controllers : [AdminController],
  providers   : [AdminService]
})
export class AdminModule {}
