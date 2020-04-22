import { Injectable } from '@angular/core';



@Injectable({
  providedIn: 'root'
})
export class WindowService {
  self        : Window;
  location    : { href: string, origin: string };
  document    : Document;

  constructor() {
    this.location = {
      href: null,
      origin : ''
    };
  }
}
