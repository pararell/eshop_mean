declare global {
  interface Window {
    ng2recaptchaloaded: () => void;
  }
}
import type { ReCaptchaV3 } from '../utils/recaptcha.types';

declare const grecaptcha: ReCaptchaV3;

import { isPlatformBrowser } from '@angular/common';
import { Injectable, InjectionToken, NgZone, PLATFORM_ID, inject } from '@angular/core';
import { Observable, Subject, filter, take } from 'rxjs';

import { loader } from '../utils/loadRecaptchaScript';
import { EnvConfigurationService } from './env-configuration.service';
const RECAPTCHA_LANGUAGE = new InjectionToken<string>('recaptcha-language');
const RECAPTCHA_BASE_URL = new InjectionToken<string>('recaptcha-base-url');
const RECAPTCHA_NONCE = new InjectionToken<string>('recaptcha-nonce-tag');

export interface OnExecuteData {
  /**
   * The name of the action that has been executed.
   */
  action: string;
  /**
   * The token that reCAPTCHA v3 provided when executing the action.
   */
  token: string;
}

export interface OnExecuteErrorData {
  /**
   * The name of the action that has been executed.
   */
  action: string;
  /**
   * The error which was encountered
   */
  error: unknown;
}

type ActionBacklogEntry = [string, Subject<string>];

/**
 * The main service for working with reCAPTCHA v3 APIs.
 *
 * Use the `execute` method for executing a single action, and
 * `onExecute` observable for listening to all actions at once.
 */
@Injectable({
  providedIn: 'root',
})
export class ReCaptchaV3Service {
  private readonly envConfigurationService = inject(EnvConfigurationService);

  /** @internal */
  private readonly isBrowser: boolean;
  /** @internal */
  private readonly siteKey!: string;
  /** @internal */
  private readonly zone: NgZone;
  /** @internal */
  private actionBacklog: ActionBacklogEntry[] | undefined;
  /** @internal */
  private nonce?: string | null;
  /** @internal */
  private language?: string | null;
  /** @internal */
  private baseUrl?: string | null;
  /** @internal */
  private grecaptcha?: ReCaptchaV3;

  /** @internal */
  private onExecuteSubject!: Subject<OnExecuteData>;
  /** @internal */
  private onExecuteErrorSubject!: Subject<OnExecuteErrorData>;
  /** @internal */
  private onExecuteObservable!: Observable<OnExecuteData>;
  /** @internal */
  private onExecuteErrorObservable!: Observable<OnExecuteErrorData>;

  constructor() {
    const zone = inject(NgZone);
    const platformId = inject(PLATFORM_ID);
    const baseUrl = inject(RECAPTCHA_BASE_URL, { optional: true });
    const nonce = inject(RECAPTCHA_NONCE, { optional: true });
    const language = inject(RECAPTCHA_LANGUAGE, { optional: true });

    this.zone = zone;
    this.isBrowser = isPlatformBrowser(platformId);
    this.nonce = nonce;
    this.language = language;
    this.baseUrl = baseUrl;

    this.init();
  }

  public get onExecute(): Observable<OnExecuteData> {
    if (!this.onExecuteSubject) {
      this.onExecuteSubject = new Subject<OnExecuteData>();
      this.onExecuteObservable = this.onExecuteSubject.asObservable();
    }

    return this.onExecuteObservable;
  }

  public get onExecuteError(): Observable<OnExecuteErrorData> {
    if (!this.onExecuteErrorSubject) {
      this.onExecuteErrorSubject = new Subject<OnExecuteErrorData>();
      this.onExecuteErrorObservable = this.onExecuteErrorSubject.asObservable();
    }

    return this.onExecuteErrorObservable;
  }

  /**
   * Executes the provided `action` with reCAPTCHA v3 API.
   * Use the emitted token value for verification purposes on the backend.
   *
   * For more information about reCAPTCHA v3 actions and tokens refer to the official documentation at
   * https://developers.google.com/recaptcha/docs/v3.
   *
   * @param {string} action the action to execute
   * @returns {Observable<string>} an `Observable` that will emit the reCAPTCHA v3 string `token` value whenever ready.
   * The returned `Observable` completes immediately after emitting a value.
   */
  public execute(action: string): Observable<string> {
    const subject = new Subject<string>();
    if (this.isBrowser) {
      if (!this.grecaptcha) {
        if (!this.actionBacklog) {
          this.actionBacklog = [];
        }

        this.actionBacklog.push([action, subject]);
      } else {
        this.executeActionWithSubject(action, subject);
      }
    }

    return subject.asObservable();
  }

  /** @internal */
  private executeActionWithSubject(action: string, subject: Subject<string>): void {
    const onError = (error: unknown) => {
      this.zone.run(() => {
        subject.error(error);
        if (this.onExecuteErrorSubject) {
          // We don't know any better at this point, unfortunately, so have to resort to `any`
          this.onExecuteErrorSubject.next({ action, error });
        }
      });
    };
    this.envConfigurationService
      .getConfigType$('FE_RECAPTCHA_CLIENT_KEY')
      .pipe(filter(Boolean), take(1))
      .subscribe((siteKey) => {
        this.zone.runOutsideAngular(() => {
          try {
            this.grecaptcha!.execute(siteKey, { action }).then((token: string) => {
              this.zone.run(() => {
                subject.next(token);
                subject.complete();
                if (this.onExecuteSubject) {
                  this.onExecuteSubject.next({ action, token });
                }
              });
            }, onError);
          } catch (e) {
            onError(e);
          }
        });
      });
  }

  /** @internal */
  private init() {
    if (this.isBrowser) {
      if ('grecaptcha' in window) {
        this.grecaptcha = grecaptcha;
      } else {
        this.envConfigurationService
          .getConfigType$('FE_RECAPTCHA_CLIENT_KEY')
          .pipe(filter(Boolean), take(1))
          .subscribe((siteKey) => {
            const langParam = this.language ? '&hl=' + this.language : '';
            loader.loadRecaptchaScript(siteKey, this.onLoadComplete, langParam, this.baseUrl, this.nonce);
          });
      }
    }
  }

  /** @internal */
  private onLoadComplete = (grecaptcha: ReCaptchaV3) => {
    this.grecaptcha = grecaptcha;
    if (this.actionBacklog && this.actionBacklog.length > 0) {
      this.actionBacklog.forEach(([action, subject]) => this.executeActionWithSubject(action, subject));
      this.actionBacklog = undefined;
    }
  };
}
