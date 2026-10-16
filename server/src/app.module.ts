import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { TranslationsModule } from './translations/translations.module';
import { AdminModule } from './admin/admin.module';
import { EshopModule } from './eshop/eshop.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './db/database.module';
import { AiModule } from './ai/ai.module';
import { RateLimitModule } from './shared/rate-limit/rate-limit';
// import { join } from 'path';
// import { ServeStaticModule } from '@nestjs/serve-static';
// import { existsSync } from 'fs';

// const staticFile = existsSync(join(process.cwd(), 'dist/eshop/browser'))
//   ? join(process.cwd(), '/dist/eshop/browser')
//   : join(process.cwd(), 'public');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // PostgreSQL (docs/postgres-migration.md)
    DatabaseModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    TranslationsModule,
    AuthModule,
    AdminModule,
    EshopModule,
    AiModule,
    RateLimitModule,
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
