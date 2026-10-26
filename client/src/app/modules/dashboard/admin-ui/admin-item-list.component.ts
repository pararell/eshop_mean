import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

export interface AdminListItem {
  /** Identifier (titleUrl) */
  id: string;
  label: string;
  /** Short info on the right, e.g. a count or "active" */
  meta?: string;
}

/**
 * The left side of the list + editor pages (categories, pages, themes, configs): a searchable
 * list of items; choosing one emits its id. The current item is marked with aria-current.
 */
@Component({
  selector: 'app-admin-item-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatFormField, MatLabel, MatInput],
  host: { class: 'admin-card', role: 'region', '[attr.aria-labelledby]': 'headingId' },
  template: `
    <div class="admin-card-head">
      <h2 [id]="headingId">{{ heading() }}</h2>
    </div>
    @if (items().length > 5) {
      <mat-form-field class="admin-list-search" subscriptSizing="dynamic">
        <mat-label>Search {{ heading().toLowerCase() }}</mat-label>
        <input matInput type="search" [ngModel]="query()" (ngModelChange)="query.set($event)" />
      </mat-form-field>
    }
    @if (filtered().length) {
      <ul class="admin-list" role="list">
        @for (item of filtered(); track item.id) {
          <li>
            <button type="button" [attr.aria-current]="selected() === item.id" (click)="choose.emit(item.id)">
              <span>{{ item.label }}</span>
              @if (item.meta) {
                <span class="admin-list-meta">{{ item.meta }}</span>
              }
            </button>
          </li>
        }
      </ul>
    } @else {
      <p class="admin-state">
        <strong>{{ items().length ? 'No match' : 'Nothing here yet' }}</strong>
        {{ items().length ? 'Try another search.' : emptyText() }}
      </p>
    }
  `,
})
export class AdminItemListComponent {
  private static nextId = 0;
  readonly headingId = `admin-list-${AdminItemListComponent.nextId++}`;

  readonly heading = input.required<string>();
  readonly items = input.required<AdminListItem[]>();
  readonly selected = input<string | null>(null);
  readonly emptyText = input('');
  readonly choose = output<string>();

  readonly query = signal('');
  readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.items().filter((item) => !query || `${item.id} ${item.label}`.toLowerCase().includes(query));
  });
}
