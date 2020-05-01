import { Module } from '@nestjs/common';
import { AngularUniversalModule } from '@nestjs/ng-universal';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppServerModule } from '../../client/main.server';
import { AppModule } from './app.module';
import * as domino from 'domino';
import { readFileSync } from 'fs';

const template = readFileSync(join(process.cwd(), 'dist/eshop/browser/index.html')).toString();
const window = domino.createWindow(template);
global['window'] = window;
global['document'] = window.document;

@Module({
  imports: [
    AppModule,
    AngularUniversalModule.forRoot({
      bootstrap: AppServerModule,
      viewsPath : join(process.cwd(), 'dist/eshop/browser')
    })
    // ServeStaticModule.forRoot({
    //   rootPath: join(process.cwd(), 'dist/eshop/browser'),
    //   exclude: ['/api', '/auth']
    // })
  ]
})
export class AppSSRModule {}
