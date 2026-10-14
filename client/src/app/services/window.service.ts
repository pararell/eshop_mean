import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WindowService {
  self!: Window;
  location: { href: string | null; origin: string };
  document!: Document;
  dataLayer!: unknown[];

  constructor() {
    this.location = {
      href: null,
      origin: '',
    };
  }
}
