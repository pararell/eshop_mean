import { ChangeDetectionStrategy, Component, Signal, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { TranslateService } from '../../../services/translate.service';
import { User } from '../../../shared/models';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { RouterLink } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { environment } from '../../../../environments/environment';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';

@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss'],
  imports: [CommonModule, TranslatePipe, RouterLink, MatInputModule, FormsModule, ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent {
  private translate = inject(TranslateService);
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private fb = inject(FormBuilder);

  signInForm: FormGroup;
  lang$: Observable<string>;
  readonly loading = this.selectors.authLoading;
  readonly failed = this.selectors.authError;
  sendRequest$ = signal(false);
  user$: Signal<User | null>;
  readonly googleAuthUrl = environment.apiUrl + '/api/auth/google';

  constructor() {
    this.lang$ = this.translate.getLang$();
    this.user$ = this.selectors.user;

    this.signInForm = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  submit() {
    if (this.signInForm.invalid) return;
    this.store.signIn(this.signInForm.value);
    this.signInForm.reset();
    this.sendRequest$.set(true);
  }
}
