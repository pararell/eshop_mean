import { filter } from 'rxjs/operators';
import { Component } from '@angular/core';
import { TranslateService } from '../../../services/translate.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import * as actions from '../../../store/actions'
import * as fromRoot from '../../../store/reducers';

@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss']
})
export class SignInComponent  {

  signInForm: FormGroup;
  lang: string;

  constructor(
      private translate: TranslateService,
      private _fb: FormBuilder,
      private store: Store<fromRoot.State>) {
    this.translate.translationsSub$
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.lang = translate.lang;
      });

    this.signInForm = this._fb.group({
      email     : ['', Validators.required ],
      password  : ['', Validators.required ]
    });
  }

  submit() {
    this.store.dispatch(new actions.SignIn(this.signInForm.value));
    this.signInForm.reset();
  }

}
