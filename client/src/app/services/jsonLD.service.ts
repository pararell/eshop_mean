import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class JsonLDService {
  scriptType = 'application/json+ld';
  websiteSchema = {
      '@context': 'http://schema.org',
      '@type': 'WebSite',
      url: 'https://smrtic.eu',
      name: 'Eshop mean',
  };

  orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    url: 'https://smrtic.eu',
    name: 'Miroslav Smrtic',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'miro218@gmail.com',
    },
  }

  constructor(@Inject(DOCUMENT) private _document: Document) {}

  removeStructuredData(): void {
    const els = [];
    ['structured-data', 'structured-data-org'].forEach((c) => {
      els.push(...Array.from(this._document.head.getElementsByClassName(c)));
    });
    els.forEach((el) => this._document.head.removeChild(el));
  }

  insertSchema(schema, className = 'structured-data'): void {
    let script;
    let shouldAppend = false;
    if (this._document.head.getElementsByClassName(className).length) {
      script = this._document.head.getElementsByClassName(className)[0];
    } else {
      script = this._document.createElement('script');
      shouldAppend = true;
    }
    script.setAttribute('class', className);
    script.type = this.scriptType;
    script.text = JSON.stringify(schema);
    if (shouldAppend) {
      this._document.head.appendChild(script);
    }
  }
}
