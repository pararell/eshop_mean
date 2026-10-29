import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/** Writes JSON-LD structured data into <head> (the shop's own: SeoService; products: the product page) */
@Injectable({
  providedIn: 'root',
})
export class JsonLDService {
  private _document = inject<Document>(DOCUMENT);

  scriptType = 'application/ld+json';

  removeStructuredData(className?: string): void {
    const els: Element[] = [];
    ['structured-data', 'structured-data-org', className]
      .filter((c): c is string => Boolean(c))
      .forEach((c) => {
        els.push(...Array.from(this._document.head.getElementsByClassName(c)));
      });
    els.forEach((el) => this._document.head.removeChild(el));
  }

  insertSchema(schema: object, className = 'structured-data'): void {
    let script: HTMLScriptElement;
    let shouldAppend = false;
    if (this._document.head.getElementsByClassName(className).length) {
      script = this._document.head.getElementsByClassName(className)[0] as HTMLScriptElement;
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
