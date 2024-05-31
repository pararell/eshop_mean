import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Pagination } from '../../models';
import { CommonModule } from '@angular/common';

import { MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  standalone: true,
  imports: [CommonModule,MatPaginatorModule],
})
export class PaginationComponent {
  @Input()  pagination: Pagination;

  @Output() changePage = new EventEmitter<number>();


  constructor() { }

}
