import { APP_BASE_HREF } from '@angular/common';
import { DynamicModule, Inject, Module, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { existsSync } from 'fs';
import { join } from 'path';
import 'reflect-metadata';
import { Provider } from '@nestjs/common';
import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';

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

  app.engine('html', (_, options, callback) => {

    ngExpressEngine({
      bootstrap: ngOptions.bootstrap,
      inlineCriticalCss: ngOptions.inlineCriticalCss,
      providers: [
        {
          provide: 'serverUrl',
          useValue: `${options.req.protocol}://${options.req.get('host')}`
        },
        ...(ngOptions.extraProviders || [])
      ]
    })(_, options, (err, html) => {
      if (err && ngOptions.errorHandler) {
        return ngOptions.errorHandler({ err, html, renderCallback: callback });
      }

      if (err) {
        return callback(err);
      }

      callback(null, html);
    });
  });

  app.set('view engine', 'html');
  app.set('views', ngOptions.viewsPath);

  // Serve static files
  app.get(
    ngOptions.rootStaticPath,
    express.static(ngOptions.viewsPath, {
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
    const indexHtml = existsSync(join(options.viewsPath, 'index.original.html'))
      ? 'index.original.html'
      : 'index';

    options = {
      templatePath: indexHtml,
      rootStaticPath: '*.*',
      renderPath: '*',
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
