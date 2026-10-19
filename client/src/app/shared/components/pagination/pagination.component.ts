import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatPaginatorModule } from '@angular/material/paginator';

import { PaginationState } from '../../../store/signal.store.selectors';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatPaginatorModule],
})
export class PaginationComponent {
  /** `limit` is unknown until the first products response */
  readonly pagination = input.required<PaginationState>();

  readonly changePage = output<number>();
}
