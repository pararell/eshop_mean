import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { SignalStoreSelectors } from '../store/signal.store.selectors';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export const AuthGuard: CanActivateFn = (_route: ActivatedRouteSnapshot): Observable<any> => {
  const selectors = inject(SignalStoreSelectors);
  return toObservable(selectors.user);
};

export const AdminGuard: CanActivateFn = (_route: ActivatedRouteSnapshot): Observable<any> => {
  const selectors = inject(SignalStoreSelectors);
  const admin = toObservable(selectors.user).pipe(map((user) => user?.roles.includes('admin')));
  return admin;
};
