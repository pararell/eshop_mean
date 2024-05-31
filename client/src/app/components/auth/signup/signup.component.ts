import { take } from 'rxjs/operators';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';


import { TranslateService } from '../../../services/translate.service';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { RouterLink } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { SignalStore } from '../../../store/signal.store';


@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
  standalone: true,
  imports : [CommonModule, TranslatePipe, RouterLink, MatInputModule, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignUpComponent  {

  signUpForm: FormGroup;
  lang$ : Observable<string>;

  constructor(
    private translate: TranslateService,
    private _fb: FormBuilder,
    private store: SignalStore,
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
        this.store.signUp(this.signUpForm.value);
        this.signUpForm.reset();
        this.router.navigate([lang + '/authorize/signin']);
      });
  }

}
