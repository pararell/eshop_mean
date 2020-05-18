import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-cart-show',
  templateUrl: './cart-show.component.html',
  styleUrls: ['./cart-show.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartShowComponent {
  @Input()  items  :  number;
  @Output() add    = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();

  constructor() { }


}
