import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { TransferState, makeStateKey, StateKey } from '@angular/platform-browser';


@Injectable()
export class ServerHttpInterceptor implements HttpInterceptor {
  key  : StateKey<string>;

  constructor(private _transferState: TransferState) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const accessToken = localStorage.getItem('accessToken');
    const clonedRequest = accessToken
      ? request.clone({ 
          headers: request.headers.set('Authorization', 'Bearer ' + accessToken),
          withCredentials: true
        })
      : request.clone({ withCredentials: true })
    return next.handle(clonedRequest).pipe(tap(event => {
    if (event instanceof HttpResponse && (clonedRequest.method === 'GET' && !clonedRequest.url.includes('api/cart') && !clonedRequest.url.includes('auth'))) {
      this.key = makeStateKey<HttpResponse<object>>(clonedRequest.url);
      this._transferState.set(this.key, event.body);
      }
    }));
  }

}
