import { PipeModule } from './../pipes/pipe.module';
import { NgModule } from '@angular/core';
import { Routes , RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SharedModule } from './../shared/shared.module';
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
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    PipeModule,
    RouterModule.forChild(AUTH_ROUTER),
  ],
  declarations: [SignInComponent, SignUpComponent]
})
export class AuthModule { }
