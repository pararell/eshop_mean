import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { SignalStoreSelectors } from '../store/signal.store.selectors';


export const AuthGuard: CanActivateFn = (_route: ActivatedRouteSnapshot): boolean => {

  const router = inject(Router);
  const selectors = inject(SignalStoreSelectors);


  if (!selectors.user()) {
    router.navigate(['/']);
  }

  return true;
};



export const AdminGuard: CanActivateFn = (_route: ActivatedRouteSnapshot): boolean => {

  const router = inject(Router);
  const selectors = inject(SignalStoreSelectors);


  if (!selectors.user()?.roles.includes('admin')) {
    router.navigate(['/']);
  }

  return true;
};
