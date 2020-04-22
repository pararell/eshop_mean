import { filter } from 'rxjs/operators';
import { TranslateService } from './../../services/translate.service';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent  {
  @Input() categories: any;
  @Input() activeCategory?: string;
  @Input() minPrice: number;
  @Input() maxPrice: number;
  @Input() price: number;
  @Input() sortOptions: Array<any>;
  @Input() choosenSort: string;
  @Input() convertVal : number;
  @Input() currency: string;

  @Output() changePrice: EventEmitter<any> = new EventEmitter<any>();
  @Output() changeSort: EventEmitter<any> = new EventEmitter<any>();
  @Output() changeCategory: EventEmitter<any> = new EventEmitter<any>();

  productsUrl: string;
  categoryUrl: string;

  constructor(private translate: TranslateService) {
    this.translate.translationsSub$
    .pipe(filter(Boolean))
    .subscribe(translations => {
      this.productsUrl =  '/' + this.translate.lang + '/' + (translations['products'] ? translations['products'].toLowerCase() : 'products');
      this.categoryUrl = '/' + this.translate.lang + '/' + (translations['category']);
    });
  }

  onInputChange($event: any): void {
    this.changeSort.emit($event);
  }


}
