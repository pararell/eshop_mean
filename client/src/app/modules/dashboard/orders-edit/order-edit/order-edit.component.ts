import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-order-edit',
  templateUrl: './order-edit.component.html',
  styleUrls: ['./order-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class OrderEditComponent {
  constructor() {}
}
