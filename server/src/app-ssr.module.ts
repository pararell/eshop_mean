import { Module } from '@nestjs/common';
import { AngularUniversalModule } from '@nestjs/ng-universal';
import { join } from 'path';
import { AppServerModule } from '../../client/src/main.server';
import { AppModule } from './app.module';

@Module({
  imports: [
    AppModule,
    AngularUniversalModule.forRoot({
      bootstrap: AppServerModule,
      viewsPath: join(process.cwd(), 'dist/eshop/browser'),
    }),
  ],
})
export class AppSSRModule {}
