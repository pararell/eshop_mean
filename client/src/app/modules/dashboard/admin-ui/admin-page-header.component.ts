import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The header of an admin page: title (the page's h1), optional subtitle (counts, status) and the
 * page's actions, primary action last. Usage:
 *   <app-admin-page-header title="Categories" subtitle="12 categories">
 *     <button class="btn btn-primary">New category</button>
 *   </app-admin-page-header>
 */
@Component({
  selector: 'app-admin-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head-text">
      <h1 class="page-head-title">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="page-head-sub">{{ subtitle() }}</p>
      }
      <ng-content select="[headerInfo]" />
    </div>
    <div class="page-head-actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3) var(--space-4);
      margin-bottom: var(--space-6);
    }

    .page-head-text {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--space-1) var(--space-3);
      min-width: 0;
    }

    .page-head-title {
      margin: 0;
      font-size: var(--text-2xl);
      font-weight: var(--weight-semibold);
      line-height: var(--leading-tight);
    }

    .page-head-sub {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }

    .page-head-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-left: auto;
    }
  `,
})
export class AdminPageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
