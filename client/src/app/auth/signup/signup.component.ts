import { filter } from 'rxjs/operators';
import { Component } from '@angular/core';
import { TranslateService } from '../../services/translate.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import * as actions from './../../store/actions'
import * as fromRoot from '../../store/reducers';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignUpComponent  {

  signUpForm: FormGroup;
  lang: string;

  constructor(      
    private translate: TranslateService,
    private _fb: FormBuilder, 
    private store: Store<fromRoot.State>,
    private router: Router) {
    this.translate.translationsSub$
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.lang = translate.lang;
      });

    this.signUpForm = this._fb.group({
      email     : ['', Validators.required ],
      name      : ['' ],
      password  : ['', Validators.required ]
    });
  }


  submit() {
    this.store.dispatch(new actions.SignUp(this.signUpForm.value));
    this.router.navigate([this.lang + '/authorize/signin']);
    this.signUpForm.reset();
  }

}
