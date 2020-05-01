import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Inject, Injectable, Optional } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { TransferState, makeStateKey, StateKey } from '@angular/platform-browser';


@Injectable()
export class ServerHttpInterceptor implements HttpInterceptor {
  key  : StateKey<string>;

  constructor(
    @Optional() @Inject('serverUrl') protected serverUrl: string,
    private _transferState: TransferState) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const serverReq = !this.serverUrl
    ? request
    : request.clone({
        url: `${this.serverUrl}${request.url}`
      });
    return next.handle(serverReq).pipe(tap(event => {
    if (event instanceof HttpResponse && (request.method === 'GET' && !request.url.includes('api/cart') && !request.url.includes('api/auth'))) {
      this.key = makeStateKey<HttpResponse<object>>(request.url);
      this._transferState.set(this.key, event.body);
      }
    }));
  }

}
