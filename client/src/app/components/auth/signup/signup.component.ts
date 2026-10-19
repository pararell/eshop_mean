import { take } from 'rxjs/operators';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  imports: [CommonModule, TranslatePipe, RouterLink, MatInputModule, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpComponent {
  private translate = inject(TranslateService);
  private _fb = inject(FormBuilder);
  private store = inject(SignalStore);
  private router = inject(Router);

  signUpForm: FormGroup;
  lang$: Observable<string>;

  constructor() {
    this.lang$ = this.translate.getLang$();

    this.signUpForm = this._fb.group({
      email: ['', Validators.required],
      name: [''],
      // Same rule as the server (PASSWORD_RULE in server/src/auth/dto/auth-credential.dto.ts)
      password: ['', [Validators.required, Validators.pattern(/^(?=.*\d).{5,20}$/)]],
    });
  }

  submit() {
    if (this.signUpForm.invalid) return;
    this.lang$.pipe(take(1)).subscribe((lang) => {
      this.store.signUp(this.signUpForm.value);
      this.signUpForm.reset();
      this.router.navigate([lang + '/authorize/signin']);
    });
  }
}
