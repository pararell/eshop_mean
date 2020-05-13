import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Pagination } from '../models';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
  @Input()  pagination: Pagination;

  @Output() changePage = new EventEmitter<number>();


  constructor() { }

}
