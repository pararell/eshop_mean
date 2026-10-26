import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/** Stroke icons (24×24, 1.75 stroke, currentColor), drawn inline: no icon font, crisp at any size */
const ICONS = {
  play: '<path d="M7 5v14l12-7Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  cart: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20.5" r="1.2"/><circle cx="17" cy="20.5" r="1.2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  arrowRight: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  arrowLeft: '<path d="M19 12H5m5 5-5-5 5-5"/>',
  orders: '<path d="M8 4h8l1 2h3v15H4V6h3Z"/><path d="M8 11h8M8 15h5"/>',
  dashboard:
    '<rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l5-5-5-5M15 12H3"/>',
  login: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M8 7l5 5-5 5M13 12H3"/>',
  google:
    '<path d="M20.5 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.6-3.9 2.6-6.6Z"/><path d="M12 21c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9a5.4 5.4 0 0 1-5.1-3.7H3.9v2.3A9 9 0 0 0 12 21Z"/><path d="M6.9 13.8a5.4 5.4 0 0 1 0-3.6V7.9H3.9a9 9 0 0 0 0 8.2Z"/><path d="M12 6.6c1.3 0 2.5.5 3.5 1.4L18 5.4A9 9 0 0 0 3.9 7.9l3 2.3A5.4 5.4 0 0 1 12 6.6Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  truck: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>',
  shield: '<path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6Z"/><path d="m9 12 2 2 4-4"/>',
  returnBox: '<path d="M4 8 12 4l8 4v8l-8 4-8-4Z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
  mountain: '<path d="m3 19 6.5-11 3.8 6.4L15.5 11 21 19Z"/><path d="m8 11.2 1.5 1.3 1.6-1.2"/>',
  filter: '<path d="M4 5h16l-6 7.5V19l-4 2v-8.5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  // Admin navigation
  box: '<path d="M4 8 12 4l8 4v8l-8 4-8-4Z"/><path d="M4 8l8 4 8-4M12 12v8M8 6l8 4"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8Z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  file: '<path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  palette:
    '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.4-1.7-.3-1.2.5-2.3 1.8-2.3H18a3 3 0 0 0 3-3c0-6-4.5-11-9-11Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.9 4.9 7 7m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17m10-10 2.1-2.1"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
} as const;

export type IconName = keyof typeof ICONS;

const escapeAttr = (text: string) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * `<app-icon name="cart" />`. Decorative by default (aria-hidden); pass `label` when the icon is the
 * only content of its control and the control has no other accessible name.
 * The whole <svg> is set as innerHTML of the host: the server-side DOM can't set innerHTML on SVG.
 */
@Component({
  selector: 'app-icon',
  template: '',
  host: { '[innerHTML]': 'svg()' },
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      line-height: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly label = input('');

  private sanitizer = inject(DomSanitizer);
  // The markup is built from constants in this file and an escaped label, so it is safe to trust
  protected readonly svg = computed(() => {
    const size = Number(this.size()) || 20;
    const a11y = this.label() ? `role="img" aria-label="${escapeAttr(this.label())}"` : 'aria-hidden="true"';
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false" ${a11y}>${ICONS[this.name()]}</svg>`,
    );
  });
}
