import { toObservable } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, Signal, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { filter, take } from 'rxjs/operators';


import { TranslateService } from '../../../services/translate.service';
import { User } from '../../../shared/models';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { RouterLink } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';


@Component({
    selector: 'app-signin',
    templateUrl: './signin.component.html',
    styleUrls: ['./signin.component.scss'],
    imports: [CommonModule, TranslatePipe, RouterLink, MatInputModule, FormsModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignInComponent  {

  signInForm: FormGroup;
  lang$ : Observable<string>;
  loading$: Observable<boolean>;
  sendRequest$ = signal(false);
  user$ : Signal<User>;

  constructor(
    private translate: TranslateService,
    private store: SignalStore,
    private selectors: SignalStoreSelectors,
    private fb: FormBuilder) {

    this.lang$ = this.translate.getLang$();
    this.loading$ = toObservable(this.selectors.authLoading);
    this.user$ = this.selectors.user;

    this.signInForm = this.fb.group({
      email     : ['', Validators.required ],
      password  : ['', Validators.required ]
    });
  }

  submit() {
    this.store.signIn(this.signInForm.value);
    this.signInForm.reset();
    this.loading$.pipe(filter(loading => !loading), take(1)).subscribe(() => { this.sendRequest$.set(true); })
  }

}
