import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { PaginationState } from '../../../store/signal.store.selectors';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { IconComponent } from '../icon/icon.component';
import { pageItems } from './page-items';

/** Page numbers like waypoints: first, last, and two around the current page; gaps as "…" */
@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, TranslatePipe, IconComponent],
})
export class PaginationComponent {
  /** `limit` is unknown until the first products response */
  readonly pagination = input.required<PaginationState>();

  readonly changePage = output<number>();

  readonly pages = computed(() => pageItems(this.pagination().page, this.pagination().pages));

  go(page: number): void {
    if (page >= 1 && page <= this.pagination().pages && page !== this.pagination().page) this.changePage.emit(page);
  }
}
