import { AngularNodeAppEngine, writeResponseToNodeResponse } from '@angular/ssr/node';
import { ɵsetAngularAppEngineManifest } from '@angular/ssr';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

async function setupAngularEngine() {
  // Set the Angular app engine manifest, which maps URL entry points to the
  // compiled server application bundles. This is normally done automatically
  // by the Angular CLI when the SSR entry directly uses AngularNodeAppEngine,
  // but when using a custom Express server, we must set it explicitly.
  try {
    const { default: engineManifest } = await import(
      new URL('./angular-app-engine-manifest.mjs', import.meta.url).href
    );
    ɵsetAngularAppEngineManifest(engineManifest);
  } catch (err) {
    console.warn(
      'Angular app engine manifest not found. SSR rendering via AngularNodeAppEngine will not be available.',
      err,
    );
  }
}

// The Express app is exported so that it can be used by serverless Functions.
export async function app(): Promise<express.Express> {
  await setupAngularEngine();

  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');

  // Instantiate the Angular Node.js app engine as a singleton.
  const angularAppEngine = new AngularNodeAppEngine({ allowedHosts: ['localhost'] });

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.use(express.static(browserDistFolder, {
    maxAge: '1y',
  }));

  // Handle Angular SSR rendering using the Angular Node.js app engine.
  // The engine returns `null` for non-Angular routes (e.g. /api/*), in
  // which case we delegate to the next middleware/handler via `next()`.
  server.use((req, res, next) => {
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

  return server;
}

async function run(): Promise<void> {
  const port = process.env['PORT'] || 3000;

  // Start up the Node server
  const server = await app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();