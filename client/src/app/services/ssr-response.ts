import { InjectionToken } from '@angular/core';

/** The minimal part of the Express response that SSR pages may use */
export interface SsrResponse {
  status(code: number): unknown;
}

/**
 * The Express response of the page being rendered on the server (provided in
 * server/src/app-universal.module.ts as 'ssrResponse'); null in the browser.
 */
export const SSR_RESPONSE = 'ssrResponse' as unknown as InjectionToken<SsrResponse>;
