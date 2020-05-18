import { catchError } from 'rxjs/operators';
import { Observable, of, throwError } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { TransferState, makeStateKey, StateKey } from '@angular/platform-browser';

@Injectable()
export class BrowserHttpInterceptor implements HttpInterceptor {
  key  : StateKey<string>;

  constructor(
      private transferState: TransferState) {
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (request.method !== 'GET') {
      return next.handle(request).pipe(
        catchError((error: HttpResponse<any>) => {
          this._handleError(error.url, error.status);
          return throwError(error);
        }));
    }

    this.key = makeStateKey<HttpResponse<object>>(request.url);
    const storedResponse: any = this.transferState.get(this.key, null);

    if (storedResponse) {
      const response = new HttpResponse({ body: storedResponse, status: 200 });
      return of(response);
    }

    return next.handle(request).pipe(
      catchError((error: HttpResponse<any>) => {
        this._handleError(error.url, error.status);
        return throwError(error);
      }));
  }


  private _handleError(url: string, statusCode: number): void {
    switch (statusCode) {
      case 404:
        console.warn('HTTP status code: 404: ', url, statusCode); // tslint:disable-line no-console
        break;
      case 410:
        console.warn('HTTP status code: 410: ', url, statusCode); // tslint:disable-line no-console
        break;
      case 500:
      console.warn('HTTP status code: 500: ', url, statusCode); // tslint:disable-line no-console
        break;
      case 503:
      console.warn('HTTP status code: 503: ', url, statusCode); // tslint:disable-line no-console
        break;
      default:
        console.warn('HTTP status code: Unhandled ', url, statusCode); // tslint:disable-line no-console
        break;
    }
  }

}
