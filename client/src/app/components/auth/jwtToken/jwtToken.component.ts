import { Component, Inject, PLATFORM_ID, OnInit, Signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { map, take, filter } from 'rxjs/operators';


import { accessTokenKey } from '../../../shared/constants';
import { SignalStore } from '../../../store/signal.store';

@Component({
  standalone: true,
  templateUrl: './jwtToken.component.html',
  styleUrls: ['./jwtToken.component.scss'],
})
export class JwtTokenComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private store:SignalStore,
    private router: Router,
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
        this.store.storeUser({ accessToken: accessToken });
        this.store.getUser();
        this.router.navigate(['']);
      });
  }
}
