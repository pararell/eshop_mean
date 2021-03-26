import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WindowService {
  self        : Window;
  location    : { href: string, origin: string };
  document    : Document;
  dataLayer   : any[];

  constructor() {
    this.location = {
      href: null,
      origin : ''
    };
  }
}
