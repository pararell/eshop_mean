import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, take, withLatestFrom, filter } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import * as fromRoot from '../store/reducers';
import { User } from '../shared/models';
import * as actions from '../store/actions';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private store : Store<fromRoot.State>) {
    this.store.select(fromRoot.getUser).pipe(take(1))
      .subscribe((user) => {
        if (!user) {
          this.store.dispatch(new actions.GetUser());
        }
      })
  }

  get isLoggedIn(): Observable<boolean> {
    return this.store.select(fromRoot.getAuthLoading).pipe(
      filter(loading => !loading),
      withLatestFrom(this.store.select(fromRoot.getUser)),
      take(1),
      map(([_loading, user]: [boolean, User]) => !!(user && user.email))
    );
  }

  get isAdmin(): Observable<boolean> {
    return this.store.select(fromRoot.getAuthLoading).pipe(
      filter(loading => !loading),
      withLatestFrom(this.store.select(fromRoot.getUser)),
      take(1),
      map(([_loading, user]: [boolean, User]) => !!(user && user.roles.includes('admin')))
    );
  }

}
