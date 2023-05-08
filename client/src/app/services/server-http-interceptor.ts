import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Inject, Injectable, Optional } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { TransferState, makeStateKey, StateKey } from '@angular/core';


@Injectable()
export class ServerHttpInterceptor implements HttpInterceptor {
  key: StateKey<any>;
  apiToTransfer = ['api/eshop', 'api/products', 'api/translations', 'api/orders'];

  constructor(
    @Optional() @Inject('serverUrl') protected serverUrl: string,
    private transferState: TransferState) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(tap(event => {
      if (event instanceof HttpResponse && (request.method === 'GET'
        && this.apiToTransfer.find(api => request.url.includes(api)))
      ) {
        const requestUrl = request.url ? request.url.replace(/^https?:\/\//, '') : request.url;
        this.key = makeStateKey<HttpResponse<object>>(requestUrl);
        this.transferState.set(this.key, event.body);
      }
    }));
  }

}
