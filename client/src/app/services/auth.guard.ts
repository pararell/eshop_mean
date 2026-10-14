import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { SignalStoreSelectors } from '../store/signal.store.selectors';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Known issue (docs/audit.md BUG-12): the guards emit the user / an optional boolean and rely on
// the router treating falsy values as "deny". Kept as-is; the casts only make that explicit.

export const AuthGuard: CanActivateFn = (_route: ActivatedRouteSnapshot) => {
  const selectors = inject(SignalStoreSelectors);
  return toObservable(selectors.user) as unknown as Observable<boolean>;
};

export const AdminGuard: CanActivateFn = (_route: ActivatedRouteSnapshot) => {
  const selectors = inject(SignalStoreSelectors);
  const admin = toObservable(selectors.user).pipe(map((user) => user?.roles!.includes('admin')));
  return admin as Observable<boolean>;
};
