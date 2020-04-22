import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { first, map } from 'rxjs/operators';



@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(public apiService: ApiService) { }

  get isLoggedIn(): Observable<boolean> {
    return this.apiService.getUser().pipe(
     first(),
      map((user: any) => {
      return (user && user.email) ? true : false;
    }));
  }

  get isAdmin(): Observable<boolean> {
    return this.apiService.getUser().pipe(
      first(),
      map((user: any) => {
      return (user && user.roles.includes('admin')) ? true : false;
    }));

  }

}
