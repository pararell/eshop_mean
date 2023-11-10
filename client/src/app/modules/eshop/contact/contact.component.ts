import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, BehaviorSubject } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import * as actions from '../../../store/actions';
import * as fromRoot from '../../../store/reducers';
import { ReCaptchaV3Service } from '../../../services/recaptcha.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
})
export class ContactComponent {
  contactForm: FormGroup;
  loading$: Observable<boolean>;
  error$: Observable<string>;
  sendRequestSub$ = new BehaviorSubject(false);

  constructor(
    private fb: FormBuilder,
    private store: Store<fromRoot.State>,
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

    this.loading$ = this.store.select(fromRoot.getEshopLoading);
    this.error$ = this.store.select(fromRoot.getEshopError);
  }

  submit(): void {
    const formValues = this.contactForm.value;
    this.contactForm.reset();
    this.recaptchaV3Service.execute('contact').subscribe((token: string) => {
      this.store.dispatch(new actions.SendContact({ ...formValues, token }));
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
