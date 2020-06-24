import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { Category } from '../models';

@Component({
  selector: 'app-categories-list',
  templateUrl: './categories-list.component.html',
  styleUrls: ['./categories-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesListComponent {
  @Input()  categories    : Category[];
  @Input()  lang          : string;
  @Input()  withSlider    = true;

  constructor() {}

  trackById(_index: number, item: Category) {
    return item.titleUrl;
  }
}
