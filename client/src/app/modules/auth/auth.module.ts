import { NgModule } from '@angular/core';
import { Routes , RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

import { PipeModule } from '../../pipes/pipe.module';
import { SharedModule } from '../../shared/shared.module';
import { SignInComponent } from './signin/signin.component';
import { SignUpComponent } from './signup/signup.component';

const AUTH_ROUTER: Routes = [
  {
    path: '',
    component: SignInComponent
  },
  {
    path: 'signin',
    component: SignInComponent
  },
  {
    path: 'signup',
    component: SignUpComponent
  }
]

@NgModule({
  declarations: [SignInComponent, SignUpComponent],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    PipeModule,
    MatButtonModule,
    MatInputModule,
    RouterModule.forChild(AUTH_ROUTER),
  ]
})
export class AuthModule { }
