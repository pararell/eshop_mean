import { MatInputModule } from '@angular/material/input';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, Signal } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import { ReCaptchaV3Service } from '../../../services/recaptcha.service';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { MatProgressBar } from '@angular/material/progress-bar';

@Component({
    selector: 'app-contact',
    templateUrl: './contact.component.html',
    styleUrls: ['./contact.component.scss'],
    imports: [CommonModule, TranslatePipe, MatButtonModule, MatIconModule, MatProgressBar, MatInputModule, FormsModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactComponent {
  contactForm: FormGroup;
  loading$: Observable<boolean>;
  error$: Signal<string>;
  sendRequestSub$ = new BehaviorSubject(false);

  constructor(
    private fb: FormBuilder,
    private store: SignalStore,
    private selectors: SignalStoreSelectors,
    private recaptchaV3Service: ReCaptchaV3Service
  ) {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: [
        '',
        Validators.compose([Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,4}$')]),
      ],
      notes: ['', Validators.required],
    });

    this.loading$ = toObservable(this.selectors.eshopLoading);
    this.error$ = this.selectors.eshopError;
  }

  submit(): void {
    const formValues = this.contactForm.value;
    this.contactForm.reset();
    this.recaptchaV3Service.execute('contact').subscribe((token: string) => {
      this.store.sendContact({ ...formValues, token });
      this.loading$
        .pipe(
          filter((loading) => !loading),
          take(1)
        )
        .subscribe(() => {
          this.sendRequestSub$.next(true);
        });
    });
  }
}
