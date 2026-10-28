import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Layered mountain ridges (decoration): three silhouettes, the far ones tinted with the theme's primary
 * color. 'page' sits between home sections, 'footer' grows out of the footer. Fixed height, so it never
 * shifts the layout.
 */
@Component({
  selector: 'app-ridge',
  template: `
    <svg viewBox="0 0 1200 80" preserveAspectRatio="none" focusable="false">
      <path class="ridge-far" d="M0 80V30l90-12 80 16 90-24 100 18 90-14 110 22 90-28 110 22 100-14 100 18 100-22 80 14 60-6v60Z" />
      <path class="ridge-mid" d="M0 80V46l110-12 100 16 110-20 100 16 100-14 120 20 100-16 110 14 110-20 120 18 120-10v42Z" />
      <path class="ridge-front" d="M0 80V60l80-2 80 6 80-10 60-4 80 6 80 10 80 6 100-2 60-10 80 10 100-8 100-10 80-2 80 6 60 6v18Z" />
    </svg>
  `,
  styleUrls: ['./ridge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[class]': "'ridge ridge-' + tone()" },
})
export class RidgeComponent {
  readonly tone = input<'page' | 'footer'>('page');
}
