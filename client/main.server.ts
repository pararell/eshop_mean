import { enableProdMode } from '@angular/core';
import { environment } from './src/environments/environment';

if (environment.production) {
  enableProdMode();
}

export { renderModule, renderModuleFactory } from '@angular/platform-server';
export { AppServerModule } from './src/app/app.server.module';