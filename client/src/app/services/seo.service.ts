import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';

import { JsonLDService } from './jsonLD.service';
import { ThemeService } from './theme.service';
import { TranslateService } from './translate.service';

/** What a page tells search engines and link previews; anything left out comes from the shop */
export interface PageSeo {
  title?: string;
  /** Use the title as it is, without " | <shop name>" (the admin's own SEO title of a product) */
  exactTitle?: boolean;
  description?: string;
  /** Preview image; default: the theme logo */
  image?: string;
}

/**
 * Page title, meta description, Open Graph tags, the canonical URL and the shop's structured data
 * (WebSite, Organization), in SSR and in the browser. The shop name comes from the theme (or the
 * ESHOP_TITLE translation), the default description from the ESHOP_DESCRIPTION translation, so both
 * follow the language. Pages call setPage(); a page that doesn't gets the shop's own title.
 */
@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private document = inject<Document>(DOCUMENT);
  private title = inject(Title);
  private meta = inject(Meta);
  private router = inject(Router);
  private theme = inject(ThemeService);
  private jsonLD = inject(JsonLDService);
  private translations = toSignal(inject(TranslateService).getTranslations$(), { initialValue: null });

  readonly shopName = computed(() => this.theme.shopName() || this.translations()?.['ESHOP_TITLE'] || 'Eshop');
  private readonly shopDescription = computed(() => this.translations()?.['ESHOP_DESCRIPTION'] ?? '');
  private readonly page = signal<PageSeo>({});
  /** The current path, after redirects (the canonical URL has no query) */
  private readonly path = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    // A page without its own data shows the shop's
    this.router.events.pipe(filter((event) => event instanceof NavigationStart)).subscribe(() => this.page.set({}));
    effect(() => this.apply(this.page(), this.shopName(), this.shopDescription(), this.path()));
  }

  setPage(page: PageSeo): void {
    this.page.set(page);
  }

  private apply(page: PageSeo, shopName: string, shopDescription: string, path: string): void {
    const origin = this.document.location?.origin ?? '';
    const url = origin + path.split(/[?#]/)[0];
    const title = !page.title ? shopName : page.exactTitle ? page.title : `${page.title} | ${shopName}`;
    const description = page.description?.trim() || shopDescription;
    const image = page.image || this.theme.logo();

    this.title.setTitle(title);
    this.setTag('name', 'description', description);
    this.setTag('property', 'og:title', title);
    this.setTag('property', 'og:description', description);
    this.setTag('property', 'og:site_name', shopName);
    this.setTag('property', 'og:url', url);
    this.setTag('property', 'og:image', image);
    this.setCanonical(url);

    // The shop itself, never a person: name, address and logo only
    const logo = this.theme.logo();
    this.jsonLD.insertSchema({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: shopName,
      url: origin,
      ...(shopDescription ? { description: shopDescription } : {}),
    });
    this.jsonLD.insertSchema(
      { '@context': 'https://schema.org', '@type': 'Organization', name: shopName, url: origin, ...(logo ? { logo } : {}) },
      'structured-data-org',
    );
  }

  /** Sets a meta tag, or removes it when there is no value */
  private setTag(attribute: 'name' | 'property', key: string, content: string): void {
    if (content) this.meta.updateTag({ [attribute]: key, content });
    else this.meta.removeTag(`${attribute}="${key}"`);
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }
}
