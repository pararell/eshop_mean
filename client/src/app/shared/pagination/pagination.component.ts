import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
  @Input()  page:  any;
  @Input()  category:   any;
  @Input()  pagination:   any;

  @Output() changePage:    EventEmitter<any> = new EventEmitter<any>();


  constructor() { }

}
