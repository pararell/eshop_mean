import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { Pagination } from '../../models';

import { MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatPaginatorModule],
})
export class PaginationComponent {
  @Input() pagination: Pagination;

  @Output() changePage = new EventEmitter<number>();

  constructor() {}
}
