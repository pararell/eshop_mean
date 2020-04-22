import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { TranslationsModule } from './translations/translations.module';
import { ConfigModule } from '@nestjs/config';
import { AngularUniversalModule } from '@nestjs/ng-universal';
import { join } from 'path';
import { AppServerModule } from '../../client/main.server';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AdminModule } from './admin/admin.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    ProductsModule,
    CartModule,
    OrdersModule,
    TranslationsModule,
    AuthModule,
    AdminModule,
    AngularUniversalModule.forRoot({
      bootstrap: AppServerModule,
      viewsPath : join(process.cwd(), 'dist/eshop/browser'),
      templatePath: join(process.cwd(), 'dist/eshop/browser/index.html')
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'dist/eshop/browser'),
      exclude: ['/api', '/auth']
    }),
  ],
  exports: [],
  controllers: [],
  providers: [],
})
export class AppSSRModule {}
