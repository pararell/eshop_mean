import { APP_BASE_HREF } from '@angular/common';
import { DynamicModule, Module, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { dirname, join, resolve } from 'path';
import 'reflect-metadata';
import { Provider } from '@nestjs/common';
import * as express from 'express';
import { CommonEngine } from '@angular/ssr';
import { fileURLToPath } from 'url';
import AppServerModule from '../../client/src/main.server';

export function setupUniversal(app: any) {
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  app.engine('html', (_, options, callback) => {
    const commonEngine = new CommonEngine();
    commonEngine
      .render({
        bootstrap: AppServerModule,
        documentFilePath: indexHtml,
        url: `${options.req.protocol}://${options.req.get('host')}${options.req.originalUrl}`,
        publicPath: browserDistFolder,
        providers: [
          {
            provide: 'serverUrl',
            useValue: `${options.req.protocol}://${options.req.get('host')}`,
          },
        ],
      })
      .then((html) => callback(null, html))
      .catch((err) => callback(err));
  });

  app.set('view engine', 'html');
  app.set('views', browserDistFolder);

  const rootStaticPath = '*.*';
  // Serve static files
  app.get(
    rootStaticPath,
    express.static(browserDistFolder, {
      maxAge: 600,
    }),
  );
}

export const angularUniversalProviders: Provider[] = [
  {
    provide: 'UNIVERSAL_INITIALIZER',
    useFactory: (host: HttpAdapterHost & { template: string }) => host && host.httpAdapter && setupUniversal(host.httpAdapter.getInstance()),
    inject: [HttpAdapterHost],
  },
];

@Module({
  providers: [...angularUniversalProviders],
})
export class AngularUniversalModule implements OnModuleInit {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  static forRoot(): DynamicModule {
    return {
      module: AngularUniversalModule,
    };
  }

  async onModuleInit() {
    if (!this.httpAdapterHost) {
      return;
    }
    const httpAdapter = this.httpAdapterHost.httpAdapter;
    if (!httpAdapter) {
      return;
    }
    const app = httpAdapter.getInstance();
    const serverDistFolder = dirname(fileURLToPath(import.meta.url));
    const templatePath = join(serverDistFolder, 'index.server.html');
    const renderPath = '*';
    app.get(renderPath, (req, res) =>
      res.render(templatePath, {
        req,
        res,
        providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }],
      }),
    );
  }
}
