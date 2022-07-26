import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { map, take, filter } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import * as actions from '../../../store/actions';
import * as fromRoot from '../../../store/reducers';
import { accessTokenKey } from '../../../shared/constants';

@Component({
  standalone: true,
  templateUrl: './jwtToken.component.html',
  styleUrls: ['./jwtToken.component.scss'],
})
export class JwtTokenComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store<fromRoot.State>,
    @Inject(PLATFORM_ID)
    private platformId: Object
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(
        map((params) => params['accessToken']),
        take(1),
        filter(() => isPlatformBrowser(this.platformId))
      )
      .subscribe((accessToken) => {
        localStorage.setItem(accessTokenKey, accessToken);
        this.store.dispatch(new actions.StoreUser({ accessToken: accessToken }));
        this.store.dispatch(new actions.GetUser());
        this.router.navigate(['']);
      });
  }
}
