import { Module } from '@nestjs/common';
import { AngularUniversalModule } from '@nestjs/ng-universal';
import { join } from 'path';
import { AppServerModule } from '../../client/src/main.server';
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
  ]
})
export class AppSSRModule {}
