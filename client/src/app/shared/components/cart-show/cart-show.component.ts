import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { TranslatePipe } from '../../../pipes/translate.pipe';
import { IconComponent } from '../icon/icon.component';

/** "Add to cart" button; once the product is in the cart, a − qty + stepper */
@Component({
  selector: 'app-cart-show',
  templateUrl: './cart-show.component.html',
  styleUrls: ['./cart-show.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, TranslatePipe, IconComponent],
})
export class CartShowComponent {
  /** Quantity of the product in the cart (undefined = not in the cart) */
  readonly items = input<number | undefined>();
  readonly size = input<'default' | 'large'>('default');
  readonly add = output<void>();
  readonly remove = output<void>();
}
