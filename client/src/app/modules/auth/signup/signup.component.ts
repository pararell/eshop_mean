import { take } from 'rxjs/operators';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';

import * as actions from './../../../store/actions'
import * as fromRoot from '../../../store/reducers';
import { TranslateService } from '../../../services/translate.service';


@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignUpComponent  {

  signUpForm: FormGroup;
  lang$ : Observable<string>;

  constructor(
    private translate: TranslateService,
    private _fb: FormBuilder,
    private store: Store<fromRoot.State>,
    private router: Router) {

    this.lang$ = this.translate.getLang$();

    this.signUpForm = this._fb.group({
      email     : ['', Validators.required ],
      name      : ['' ],
      password  : ['', Validators.required ]
    });
  }


  submit() {
    this.lang$.pipe(take(1))
      .subscribe(lang => {
        this.store.dispatch(new actions.SignUp(this.signUpForm.value));
        this.signUpForm.reset();
        this.router.navigate([lang + '/authorize/signin']);
      });
  }

}
