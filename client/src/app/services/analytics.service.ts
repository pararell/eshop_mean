import { WindowService } from './window.service';
import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

declare const dataLayer: unknown[];

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private _document = inject<Document>(DOCUMENT);
  private window = inject(WindowService);
  private _platformId = inject(PLATFORM_ID);

  initial(config: { FE_ANALYTICS_TOKEN?: string }) {
    if (!isPlatformServer(this._platformId) && config.FE_ANALYTICS_TOKEN) {
      const parentElement: HTMLElement = this._document.querySelector('head') as HTMLElement;
      const scriptEl = this._document.createElement('script');
      scriptEl.setAttribute('type', 'text/javascript');
      scriptEl.setAttribute('async', '');
      scriptEl.setAttribute('src', 'https://www.googletagmanager.com/gtag/js?id=' + config.FE_ANALYTICS_TOKEN);
      parentElement.appendChild(scriptEl);
      scriptEl.onload = (_event: Event) => {
        this.window.dataLayer = this.window.dataLayer || [];

        function gtag(..._args: unknown[]) {
          // gtag.js requires the `arguments` object itself, not an array
          // eslint-disable-next-line prefer-rest-params
          dataLayer.push(arguments);
        }
        gtag('js', new Date());
        gtag('config', config.FE_ANALYTICS_TOKEN);
      };
    }
  }
}
