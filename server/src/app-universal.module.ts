import { DynamicModule, Module, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { dirname, resolve } from 'path';
import 'reflect-metadata';
import * as express from 'express';
import { AngularNodeAppEngine, writeResponseToNodeResponse } from '@angular/ssr/node';
import { ɵsetAngularAppEngineManifest } from '@angular/ssr';
import { fileURLToPath } from 'url';

export async function setupUniversal(app: any) {
  // Set the Angular app engine manifest, which maps URL entry points to the
  // compiled server application bundles. This is normally done automatically
  // by the Angular CLI when the SSR entry directly uses AngularNodeAppEngine,
  // but with NestJS bootstrapping the app, we must set it explicitly.
  try {
    const { default: engineManifest } = await import(
      new URL('./angular-app-engine-manifest.mjs', import.meta.url).href
    );
    ɵsetAngularAppEngineManifest(engineManifest);
  } catch (err) {
    // The manifest is only available when running through the Angular CLI
    // server bundle (serve:ssr / build:ssr). Fall back to allowing Angular
    // SSR to skip hostname validation in other contexts.
    console.warn(
      'Angular app engine manifest not found. SSR rendering via AngularNodeAppEngine will not be available.',
    );
  }

  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');

  // Instantiate the Angular Node.js app engine as a singleton.
  const angularAppEngine = new AngularNodeAppEngine({ allowedHosts: ['localhost'] });

  // Serve static files from /browser
  app.use(express.static(browserDistFolder, {
    maxAge: 600,
  }));

  // Handle Angular SSR rendering using the Angular Node.js app engine.
  // The engine returns `null` for non-Angular routes (e.g. /api/*), in
  // which case we delegate to the next middleware/handler via `next()`.
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    angularAppEngine
      .handle(req)
      .then((response) => {
        if (response) {
          return writeResponseToNodeResponse(response, res);
        }
        next();
      })
      .catch((err) => next(err));
  });
}

@Module({})
export class AngularUniversalModule implements OnModuleInit {
  private setupDone = false;

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  static forRoot(): DynamicModule {
    return {
      module: AngularUniversalModule,
    };
  }

  async onModuleInit() {
    if (this.setupDone) {
      return;
    }
    this.setupDone = true;

    if (!this.httpAdapterHost || !this.httpAdapterHost.httpAdapter) {
      return;
    }

    // Register the Angular SSR engine AFTER NestJS has registered its routes.
    // If the engine middleware were added any earlier (e.g. from a provider
    // factory, which runs before the routes are registered), it would intercept
    // /api/* requests before NestJS can handle them. During route discovery the
    // SSR bootstrap calls /api/eshop/config, which would then re-enter the same
    // pending engine request -> circular wait and the app never responds.
    await setupUniversal(this.httpAdapterHost.httpAdapter.getInstance());
  }
}