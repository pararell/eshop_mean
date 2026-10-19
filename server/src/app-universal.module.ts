import { APP_BASE_HREF } from '@angular/common';
import { DynamicModule, Module, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { dirname, join, resolve } from 'path';
import 'reflect-metadata';
import { Provider } from '@nestjs/common';
import * as express from 'express';
import { CommonEngine } from '@angular/ssr/node';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import compression from 'compression';
import { withCspNonce } from './shared/csp';

const STATIC_ASSET = /\.(?:js|mjs|css|svg|json|webmanifest|txt|ico|map)$/;
const HASHED_ASSET = /-[A-Za-z0-9_]{8}\.(?:js|css|woff2?|ttf|svg|png|jpe?g|webp)$/;
import bootstrap from '../../client/src/main.server';

// Hosts SSR may render for (CommonEngine rejects others to prevent SSRF via the Host header).
// The NG_ALLOWED_HOSTS env var, if set, takes precedence inside CommonEngine.
function getAllowedHosts(): string[] {
  const hosts = new Set(['localhost', '127.0.0.1']);
  for (const url of [process.env.ORIGIN, process.env.SERVER_URL]) {
    try {
      if (url) {
        hosts.add(new URL(url).hostname);
      }
    } catch {
      // ignore malformed URLs
    }
  }
  return [...hosts];
}

export function setupUniversal(app: express.Express) {
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');
  const allowedHosts = getAllowedHosts();
  const template = readFileSync(indexHtml, 'utf-8');

  app.engine('html', (_: string, renderOptions: object, callback: (err: unknown, html?: string) => void) => {
    // res.render() below passes { req, res, providers }
    const options = renderOptions as { req: express.Request; res: express.Response };
    const nonce = String(options.res.locals['cspNonce'] ?? '');
    const commonEngine = new CommonEngine({ allowedHosts });
    commonEngine
      .render({
        bootstrap,
        document: nonce ? withCspNonce(template, nonce) : template,
        url: `${options.req.protocol}://${options.req.get('host')}${options.req.originalUrl}`,
        publicPath: browserDistFolder,
        providers: [
          {
            provide: 'serverUrl',
            useValue: `${options.req.protocol}://${options.req.get('host')}`,
          },
          // Lets a page set the HTTP status (e.g. 404 on the not-found page); see client/src/app/services/ssr-response.ts
          { provide: 'ssrResponse', useValue: options.res },
        ],
      })
      .then((html) => callback(null, html))
      .catch((err) => callback(err));
  });

  app.set('view engine', 'html');
  app.set('views', browserDistFolder);

  // This runs while Nest creates the modules, before setAppDB() adds compression(): static files
  // need their own. Only asset types; anything else passes through to the shared middleware.
  app.use(compression({ filter: (req, res) => STATIC_ASSET.test(req.path) && compression.filter(req, res) }));
  app.use(
    express.static(browserDistFolder, {
      // Milliseconds: 10 minutes for files without a hash (favicon, fonts in assets/, manifest)
      maxAge: 600_000,
      // Build output with a content hash in the name (main-AB12CD34.js) never changes: cache it for a year
      setHeaders: (res, filePath) => {
        if (HASHED_ASSET.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
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
    app.get(/(.*)/, (req: express.Request, res: express.Response) =>
      res.render(templatePath, {
        req,
        res,
        providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }],
      }),
    );
  }
}
