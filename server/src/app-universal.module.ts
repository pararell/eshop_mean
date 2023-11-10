import { APP_BASE_HREF } from '@angular/common';
import { DynamicModule, Inject, Module, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import 'reflect-metadata';
import { Provider } from '@nestjs/common';
import * as express from 'express';
import { CommonEngine } from '@angular/ssr';
import { fileURLToPath } from 'url';
import AppServerModule from '../../client/src/main.server';

export const ANGULAR_UNIVERSAL_OPTIONS = 'ANGULAR_UNIVERSAL_OPTIONS';

export interface AngularUniversalOptions {
  /**
   * The directory where the module should look for client bundle (Angular app).
   */
  viewsPath: string;
  /**
   * Path to index file.
   * Default: {viewsPaths}/index.html
   */
  templatePath?: string;
  /**
   * Static files root directory.
   * Default: *.*
   */
  rootStaticPath?: string | RegExp;
  /**
   * Path to render Angular app.
   * Default: * (wildcard - all paths)
   */
  renderPath?: string;
  /**
   * The platform level providers for the current render request.
   */
  extraProviders?: any[];
   /**
   * Reduce render blocking requests by inlining critical CSS.
   * Default: true.
   */
  inlineCriticalCss?: boolean;
  /**
   * Callback to be called in case of a rendering error.
   */
  errorHandler?: (params: {
    err?: Error;
    html?: string;
    renderCallback: (err: any, content: string) => void;
  }) => void;
  /**
   * Module to bootstrap
   */
  bootstrap: any;
}

export function setupUniversal(app: any, ngOptions: AngularUniversalOptions) {
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
            useValue: `${options.req.protocol}://${options.req.get('host')}`
          },
          ...(ngOptions.extraProviders || [])
        ]
      })
      .then((html) => callback(null, html))
      .catch((err) => callback(err));
  });

  app.set('view engine', 'html');
  app.set('views', browserDistFolder);

  // Serve static files
  app.get(
    ngOptions.rootStaticPath,
    express.static(browserDistFolder, {
      maxAge: 600
    })
  );
}

export const angularUniversalProviders: Provider[] = [
  {
    provide: 'UNIVERSAL_INITIALIZER',
    useFactory: (
      host: HttpAdapterHost,
      options: AngularUniversalOptions & { template: string }
    ) =>
      host &&
      host.httpAdapter &&
      setupUniversal(host.httpAdapter.getInstance(), options),
    inject: [HttpAdapterHost, ANGULAR_UNIVERSAL_OPTIONS]
  }
];

@Module({
  providers: [...angularUniversalProviders]
})
export class AngularUniversalModule implements OnModuleInit {
  constructor(
    @Inject(ANGULAR_UNIVERSAL_OPTIONS)
    private readonly ngOptions: AngularUniversalOptions,
    private readonly httpAdapterHost: HttpAdapterHost
  ) {}

  static forRoot(options: AngularUniversalOptions): DynamicModule {


      const serverDistFolder = dirname(fileURLToPath(import.meta.url));
      const indexHtml = join(serverDistFolder, 'index.server.html');
      const browserDistFolder = resolve(serverDistFolder, '../browser');

    options = {
      templatePath: indexHtml,
      rootStaticPath: '*.*',
      renderPath: '*',
      viewsPath: browserDistFolder,
      ...options
    };

    return {
      module: AngularUniversalModule,
      providers: [
        {
          provide: ANGULAR_UNIVERSAL_OPTIONS,
          useValue: options
        }
      ]
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
    app.get(this.ngOptions.renderPath, (req, res) =>
      res.render(this.ngOptions.templatePath, {
        req,
        res,
        providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }]
      })
    );
  }
}
