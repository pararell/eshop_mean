import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes, RenderMode } from '@angular/ssr';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(
      withRoutes([
        {
          path: '**',
          renderMode: RenderMode.Server,
        },
      ]),
    ),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

