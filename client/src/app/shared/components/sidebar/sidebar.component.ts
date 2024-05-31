import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { of } from 'rxjs';
import { take, delay } from 'rxjs/operators';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';

import { Category } from '../../models';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PriceFormatPipe } from '../../../pipes/price.pipe';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, PriceFormatPipe, MatSliderModule, MatSelectModule, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  @Input() categories: Category[];
  @Input() activeCategory?: string;
  @Input() minPrice: number = 0;
  @Input() maxPrice: number = Infinity;
  @Input() price: number;
  @Input() sortOptions: { name: string; id: string }[];
  @Input() choosenSort: string;
  @Input() currency: string;
  @Input() lang: string;

  @Output() changePrice = new EventEmitter<number>();
  @Output() changeSort = new EventEmitter<string>();
  @Output() changeCategory = new EventEmitter<string>();

  productsUrl: string;
  categoryUrl: string;
  priceValue = 0;

  constructor() {}

  onInputChange($event: string): void {
    this.changeSort.emit($event);
  }

  onChangePrice(value: number): void {
    of('change_price')
      .pipe(take(1), delay(200))
      .subscribe(() => {
        this.changePrice.emit(value);
      });
  }

  trackById(_index: number, item) {
    return item.titleUrl;
  }
}
