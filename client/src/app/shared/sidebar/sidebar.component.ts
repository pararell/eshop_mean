import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { Category } from '../models';


@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent  {
  @Input() categories: Category[];
  @Input() activeCategory?: string;
  @Input() minPrice: number;
  @Input() maxPrice: number;
  @Input() price: number;
  @Input() sortOptions: {name: string; id: string}[];
  @Input() choosenSort: string;
  @Input() convertVal : number;
  @Input() currency: string;
  @Input() lang: string;

  @Output() changePrice = new EventEmitter<number>();
  @Output() changeSort = new EventEmitter<string>();
  @Output() changeCategory = new EventEmitter<string>();

  productsUrl: string;
  categoryUrl: string;

  constructor() {
  }

  onInputChange($event: string): void {
    this.changeSort.emit($event);
  }


}
