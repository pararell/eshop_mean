import { Component, Input, ChangeDetectionStrategy, output } from '@angular/core';

@Component({
  selector: 'app-cart-show',
  templateUrl: './cart-show.component.html',
  styleUrls: ['./cart-show.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartShowComponent {
  @Input() items!: number;
  readonly add = output<void>();
  readonly remove = output<void>();

  constructor() {}
}
