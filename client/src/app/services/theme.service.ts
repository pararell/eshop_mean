import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import type { ThemeStyles } from '@eshop/shared';
import tinycolor from 'tinycolor2';

export type ColorMode = 'system' | 'light' | 'dark';

const MODE_COOKIE = 'eshop_theme';
/** Surfaces the brand color is checked against (see client/src/styles/_tokens.scss) */
const LIGHT = { bg: '#ffffff', onPrimary: '#ffffff' };
const DARK = { surface: '#0f0f0f', onPrimary: '#111111' };
/** WCAG AA for normal text */
const MIN_CONTRAST = 4.5;
/** The CSS variables setBrandColor writes */
const BRAND_VARIABLES = ['primary', 'primary-hover', 'on-primary', 'primary-soft'].flatMap((name) => [`brand-${name}-light`, `brand-${name}-dark`]);

/**
 * Light/dark mode and the shop's brand color (docs/design-system.md).
 *
 * - The mode is stored in the `eshop_theme` cookie; index.html applies it before first paint.
 *   'system' removes the attribute, so `prefers-color-scheme` decides.
 * - A theme's primary color becomes `--brand-*` variables: for light mode it is darkened until white
 *   text on it and it on the page background reach 4.5:1; for dark mode it is lightened until it
 *   reaches 4.5:1 on dark surfaces. Any admin color stays readable in both modes.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private document = inject<Document>(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  /** The active theme's settings (see applyStyles); the theme editor previews into it */
  readonly styles = signal<ThemeStyles>({});
  /** Home banner media from the active theme: a video (promoSlideVideo) wins over an image (promoSlideBackground) */
  readonly video = computed(() => this.styles().promoSlideVideo ?? '');
  readonly heroImage = computed(() => this.styles().promoSlideBackground ?? '');
  readonly heroImagePosition = computed(() => this.styles().promoSlideBackgroundPosition || 'center');
  /** Logo URL of the active shop theme; empty = the built-in mark */
  readonly logo = computed(() => this.styles().logo ?? '');
  /** The shop name from the theme; empty = the ESHOP_TITLE translation */
  readonly shopName = computed(() => this.styles().shopName?.trim() ?? '');
  /** 'warm': the hero photo gets a warm tint; otherwise it is shown in its own colors */
  readonly heroTint = computed(() => (this.styles().heroTint === 'warm' ? 'warm' : 'none'));

  readonly mode = signal<ColorMode>(this.readMode());
  private readonly systemDark = signal(this.prefersDark());
  readonly isDark = computed(() => (this.mode() === 'system' ? this.systemDark() : this.mode() === 'dark'));

  constructor() {
    if (isPlatformBrowser(this.platformId) && typeof matchMedia === 'function') {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => this.systemDark.set(event.matches));
    }
  }

  setMode(mode: ColorMode): void {
    this.mode.set(mode);
    const root = this.document.documentElement;
    if (mode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
    if (isPlatformBrowser(this.platformId)) {
      this.document.cookie =
        mode === 'system' ? `${MODE_COOKIE}=; path=/; max-age=0; samesite=lax` : `${MODE_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
    }
  }

  /** Cycles system → light → dark (the header toggle) */
  toggleMode(): void {
    this.setMode(this.isDark() ? 'light' : 'dark');
  }

  /**
   * Applies a theme: its settings (read through the signals above) and its primary color as the brand
   * accent, or the default ink when it has none. Applying another theme fully replaces the previous one.
   */
  applyStyles(styles: ThemeStyles): void {
    this.styles.set(styles);
    if (styles.primaryColor && tinycolor(styles.primaryColor).isValid()) this.setBrandColor(styles.primaryColor);
    else this.clearBrandColor();
  }

  /** Applies a theme's primary color as accessible light/dark brand variants */
  setBrandColor(color: string): void {
    const base = tinycolor(color);
    if (!base.isValid()) return;

    let light = base.clone();
    for (
      let i = 0;
      i < 40 && (tinycolor.readability(light, LIGHT.onPrimary) < MIN_CONTRAST || tinycolor.readability(light, LIGHT.bg) < MIN_CONTRAST);
      i++
    ) {
      light = light.darken(2);
    }
    let dark = base.clone();
    for (let i = 0; i < 40 && tinycolor.readability(dark, DARK.surface) < MIN_CONTRAST; i++) {
      dark = dark.lighten(3);
    }
    const onDark = tinycolor.readability(dark, DARK.onPrimary) >= MIN_CONTRAST ? DARK.onPrimary : '#000000';

    this.setCSSVariable(light.toHexString(), 'brand-primary-light');
    this.setCSSVariable(light.clone().darken(6).toHexString(), 'brand-primary-hover-light');
    this.setCSSVariable(LIGHT.onPrimary, 'brand-on-primary-light');
    this.setCSSVariable(tinycolor.mix(light, '#ffffff', 88).toHexString(), 'brand-primary-soft-light');
    this.setCSSVariable(dark.toHexString(), 'brand-primary-dark');
    this.setCSSVariable(dark.clone().lighten(6).toHexString(), 'brand-primary-hover-dark');
    this.setCSSVariable(onDark, 'brand-on-primary-dark');
    this.setCSSVariable(tinycolor.mix(dark, DARK.surface, 82).toHexString(), 'brand-primary-soft-dark');
  }

  /** Back to the default ink (the token fallbacks in _tokens.scss) */
  clearBrandColor(): void {
    for (const name of BRAND_VARIABLES) this.document.documentElement.style.removeProperty(`--${name}`);
  }

  setCSSVariable(value: string, name: string): void {
    this.document.documentElement.style.setProperty(`--${name}`, value);
  }

  private readMode(): ColorMode {
    // The server-side DOM has no document.cookie; index.html applies the stored mode in the browser
    if (!isPlatformBrowser(this.platformId)) return 'system';
    const match = /(?:^|; )eshop_theme=(light|dark)/.exec(this.document.cookie ?? '');
    return (match?.[1] as ColorMode) ?? 'system';
  }

  private prefersDark(): boolean {
    return isPlatformBrowser(this.platformId) && typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
