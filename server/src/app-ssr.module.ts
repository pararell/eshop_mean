import { Module } from '@nestjs/common';
import { AngularUniversalModule } from '@nestjs/ng-universal';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppServerModule } from '../../client/main.server';
import { AppModule } from './app.module';


@Module({
  imports: [
    AppModule,
    AngularUniversalModule.forRoot({
      bootstrap: AppServerModule,
      viewsPath : join(process.cwd(), 'dist/client'),
      templatePath: join(process.cwd(), 'dist/client/index.html')
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'dist/client'),
      exclude: ['/api', '/auth']
    })
  ]
})
export class AppSSRModule {}
