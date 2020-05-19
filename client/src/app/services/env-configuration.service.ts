import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { shareReplay, map, filter, take } from 'rxjs/operators';

import { ApiService } from './api.service';


export interface Config {
  FE_STRIPE_PUBLISHABLE_KEY: string;
  FE_TINYMCE_API_KEY: string;
  FE_RECAPTCHA_CLIENT_KEY: string;
  [name: string]: string;
}


@Injectable({
  providedIn: 'root'
})
export class EnvConfigurationService {
  public configuration$: Observable<Config>;
  public config: Config;

  constructor(
    private apiService: ApiService,
    @Inject(PLATFORM_ID)
    private platformId : Object) {
      }

      getConfigType$(type: string): Observable<string> {
        return this.configuration$.pipe(map((configuration: Config) => configuration[type]));
      }

      load(): Observable<Config> {
        if (!this.configuration$) {
          this.configuration$ = this.apiService.getConfig()
            .pipe(filter(() => isPlatformBrowser(this.platformId)), map((response: {config: string}) => JSON.parse(atob(response.config))), shareReplay(1));
          this.configuration$.pipe(take(1), filter(conf => !!conf)).subscribe(conf => { this.config = conf });
        }
        return this.configuration$;
      }
}
