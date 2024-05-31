import { Routes } from "@angular/router";
import { SignInComponent } from "./signin/signin.component";
import { SignUpComponent } from "./signup/signup.component";

export const AUTH_ROUTER: Routes = [
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
