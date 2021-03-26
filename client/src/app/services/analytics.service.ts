import { WindowService } from './window.service';
import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';

declare const dataLayer: any;

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  constructor(
    @Inject(DOCUMENT)
    private _document: Document,
    private window: WindowService,
    @Inject(PLATFORM_ID)
    private _platformId: Object
  ) {}

  initial(config) {
    if (!isPlatformServer(this._platformId) && config.FE_ANALYTICS_TOKEN) {
      const parentElement: HTMLElement = this._document.querySelector('head') as HTMLElement;
      const scriptEl: any = this._document.createElement('script') as HTMLElement;
      scriptEl.setAttribute('type', 'text/javascript');
      scriptEl.setAttribute('async', '');
      scriptEl.setAttribute('src', 'https://www.googletagmanager.com/gtag/js?id=' + config.FE_ANALYTICS_TOKEN);
      parentElement.appendChild(scriptEl);
      scriptEl.onload = (event: Event) => {
        this.window.dataLayer = this.window.dataLayer || [];

        function gtag(...args)
          {
            dataLayer.push(arguments);
          }
        gtag('js', new Date());
        gtag('config', config.FE_ANALYTICS_TOKEN);
      };
    }
  }
}
