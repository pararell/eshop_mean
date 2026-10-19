import { Component, Input, ChangeDetectionStrategy, OnChanges, input, output } from '@angular/core';
import { of } from 'rxjs';
import { take, delay } from 'rxjs/operators';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';

import { Category } from '../../models';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PriceFormatPipe } from '../../../pipes/price.pipe';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  imports: [AsyncPipe, RouterLink, TranslatePipe, PriceFormatPipe, MatSliderModule, MatSelectModule, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent implements OnChanges {
  readonly categories = input.required<Category[]>();
  readonly activeCategory = input<string>();
  readonly minPrice = input<number>(0);
  readonly maxPrice = input<number>(Infinity);
  @Input() price!: number;
  readonly sortOptions = input.required<
    {
      name: string;
      id: string;
    }[]
  >();
  readonly choosenSort = input.required<string>();
  readonly currency = input.required<string>();
  readonly lang = input.required<string>();

  readonly changePrice = output<number>();
  readonly changeSort = output<string>();
  readonly changeCategory = output<string>();

  /** Category markers follow the trail colors in order (as on the category cards) */
  readonly trails = ['trail-red', 'trail-blue', 'trail-green', 'trail-yellow'];
  productsUrl!: string;
  categoryUrl!: string;
  priceValue = 0;

  /** No price filter yet (0): the slider and its label start at the highest price, not at 0 */
  ngOnChanges(): void {
    const max = this.maxPrice();
    if (!this.price && max && Number.isFinite(max)) {
      this.price = max;
    }
  }

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
}
