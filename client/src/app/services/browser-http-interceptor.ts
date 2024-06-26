import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';

@Injectable()
export class BrowserHttpInterceptor implements HttpInterceptor {

  constructor() {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpResponse<any>) => {
        this._handleError(error.url, error.status);
        return throwError(() => (error));
      }));
  }


  private _handleError(url: string, statusCode: number): void {
    switch (statusCode) {
      case 404:
        console.warn('HTTP status code: 404: ', url, statusCode);
        break;
      case 410:
        console.warn('HTTP status code: 410: ', url, statusCode);
        break;
      case 500:
        console.warn('HTTP status code: 500: ', url, statusCode);
        break;
      case 503:
        console.warn('HTTP status code: 503: ', url, statusCode);
        break;
      default:
        console.warn('HTTP status code: Unhandled ', url, statusCode);
        break;
    }
  }

}
