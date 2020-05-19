import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { map, take, filter } from 'rxjs/operators';
import * as actions from '../../../store/actions';
import { Store } from '@ngrx/store';
import * as fromRoot from '../../../store/reducers';
import { isPlatformBrowser } from '@angular/common';
import { accessTokenKey } from '../../../shared/constants';

@Component({
  templateUrl: './jwtToken.component.html',
  styleUrls: ['./jwtToken.component.scss']
})
export class JwtTokenComponent  {


  constructor(
      private _route  : ActivatedRoute,
      private router  : Router,
      private store: Store<fromRoot.State>,
      @Inject(PLATFORM_ID)
      private platformId : Object) {

    this._route.params.pipe(
        map(params => params['accessToken']),
        take(1),
        filter(() => isPlatformBrowser(this.platformId)))
    .subscribe(accessToken => {
      localStorage.setItem(accessTokenKey, accessToken);
      this.store.dispatch(new actions.GetUser());
      this.router.navigate(['/']);
    })
  }



}
