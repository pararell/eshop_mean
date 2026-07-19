import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { TranslationsModule } from './translations/translations.module';
import { AdminModule } from './admin/admin.module';
import { EshopModule } from './eshop/eshop.module';
import { ConfigModule } from '@nestjs/config';
import { User, Product, Category, Order, Translation, Page, Theme, Config } from './entities';
// import { join } from 'path';
// import { ServeStaticModule } from '@nestjs/serve-static';
// import { existsSync } from 'fs';

// const staticFile = existsSync(join(process.cwd(), 'dist/eshop/browser'))
//   ? join(process.cwd(), '/dist/eshop/browser')
//   : join(process.cwd(), 'public');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.SQLITE_PATH || './data/shop.db',
      entities: [User, Product, Category, Order, Translation, Page, Theme, Config],
      synchronize: true,
    }),
    ProductsModule,
    CartModule,
    OrdersModule,
    TranslationsModule,
    AuthModule,
    AdminModule,
    EshopModule,
    // ServeStaticModule.forRoot({
    //   rootPath: staticFile,
    //   exclude: ['/api'],
    // }),
  ],
  exports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}