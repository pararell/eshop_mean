import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, BehaviorSubject } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import * as actions from '../../../store/actions'
import * as fromRoot from '../../../store/reducers';
import { TranslateService } from '../../../services/translate.service';
import { User } from '../../../shared/models';


@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss']
})
export class SignInComponent  {

  signInForm: FormGroup;
  lang$ : Observable<string>;
  loading$: Observable<boolean>;
  sendRequestSub$ = new BehaviorSubject(false);
  user$ : Observable<User>;

  constructor(
    private translate: TranslateService,
    private fb: FormBuilder,
    private store: Store<fromRoot.State>) {

    this.lang$ = this.translate.getLang$();
    this.loading$ = this.store.select(fromRoot.getAuthLoading);
    this.user$ = this.store.select(fromRoot.getUser);

    this.signInForm = this.fb.group({
      email     : ['', Validators.required ],
      password  : ['', Validators.required ]
    });
  }

  submit() {
    this.store.dispatch(new actions.SignIn(this.signInForm.value));
    this.signInForm.reset();
    this.loading$.pipe(filter(loading => !loading), take(1)).subscribe(() => { this.sendRequestSub$.next(true); })
  }

}
