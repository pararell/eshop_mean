import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import * as actions from './../../store/actions';
import { Store } from '@ngrx/store';
import * as fromRoot from '../../store/reducers';

@Component({
  templateUrl: './jwtToken.component.html',
  styleUrls: ['./jwtToken.component.scss']
})
export class JwtTokenComponent  {


  constructor(private _route  : ActivatedRoute, private router    : Router, private store: Store<fromRoot.State>) {

    this._route.params.pipe(map(params => params['accessToken']), take(1))
    .subscribe(accessToken => {
      localStorage.setItem('accessToken', accessToken);
      this.store.dispatch(new actions.LoadUserAction());
      this.router.navigate(['/']);
    })
  }



}
