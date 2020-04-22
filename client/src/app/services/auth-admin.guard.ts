import { map } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { CanLoad, CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class AuthGuardAdmin implements CanLoad, CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canLoad(): Observable<boolean> {
    return this.authService.isAdmin.pipe(map(user => {
      if (user) {
      return user;
      } else {
        this.router.navigate(['']);
        return user;
      }
    }));
  }

  canActivate(): Observable<boolean> {
    return this.authService.isAdmin.pipe(map(user => {
      if (user) {
      return user;
      } else {
        this.router.navigate(['']);
        return user;
      }
    }));
 }

}
