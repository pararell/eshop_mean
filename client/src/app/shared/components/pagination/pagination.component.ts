import { Component, Input, ChangeDetectionStrategy, output } from '@angular/core';
import { PaginationState } from '../../../store/signal.store.selectors';

import { MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatPaginatorModule],
})
export class PaginationComponent {
  /** `limit` is unknown until the first products response */
  @Input() pagination!: PaginationState;

  readonly changePage = output<number>();

  constructor() {}
}
