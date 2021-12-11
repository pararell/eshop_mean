import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class JsonLDService {
  scriptType = 'application/ld+json';
  websiteSchema = {
      '@context': 'http://schema.org',
      '@type': 'WebSite',
      'url': 'https://smrtic.eu',
      'name': 'Eshop MEAN',
      'description': 'Angular - Node.js - Eshop application - MEAN Eshop with dashboard',
      'image': 'https://res.cloudinary.com/dnpgh1vhi/image/upload/v1615640124/logo1_gvrmpd.svg',
      'keywords': 'MEAN, Angular, Node, MongoDB, Express, Nest.js, Cart, Google login, Dashboard'
  };

  orgSchema = {
    "@context": "https://schema.org/",
    "@type": "Organization",
    "name": "Miroslav Smrtic",
    "url": "https://smrtic.eu",
    "logo": "https://res.cloudinary.com/dnpgh1vhi/image/upload/v1615640124/logo1_gvrmpd.svg",
    "email": "miro218@gmail.com",
    "description": "Developer",
    "contactPoint": {
      "contactType": "PR",
      "@type": "ContactPoint",
      "email": "miro218@gmail.com"
    },
  }

  constructor(@Inject(DOCUMENT) private _document: Document) {}

  removeStructuredData(className?: string): void {
    const els = [];
    ['structured-data', 'structured-data-org', className]
    .filter(Boolean)
    .forEach((c) => {
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
