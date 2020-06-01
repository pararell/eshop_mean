import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Inject, Injectable, Optional } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { TransferState, makeStateKey, StateKey } from '@angular/platform-browser';


@Injectable()
export class ServerHttpInterceptor implements HttpInterceptor {
  key  : StateKey<string>;
  apiToTransfer = ['api/eshop', 'api/products'];

  constructor(
    @Optional() @Inject('serverUrl') protected serverUrl: string,
    private transferState: TransferState) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(tap(event => {
    if (event instanceof HttpResponse && (request.method === 'GET' 
      && this.apiToTransfer.find(api => request.url.includes(api)))
      ) {
      this.key = makeStateKey<HttpResponse<object>>(request.url);
      this.transferState.set(this.key, event.body);
      }
    }));
  }

}
