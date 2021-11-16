import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';
import { AppBrowserModule } from './app/app.browser.module';
import { platformBrowser } from '@angular/platform-browser';

if (environment.production) {
  enableProdMode();
}

document.addEventListener('DOMContentLoaded', () => {
  platformBrowser()
    .bootstrapModule(AppBrowserModule)
    .catch(err => console.error(err));
});
