import { Component, ChangeDetectionStrategy, input } from '@angular/core';

import { Category } from '../../models';
import { CarouselComponent } from '../carousel/carousel.component';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-categories-list',
  templateUrl: './categories-list.component.html',
  styleUrls: ['./categories-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CarouselComponent, RouterLink, CommonModule],
})
export class CategoriesListComponent {
  readonly categories = input.required<Category[]>();
  readonly lang = input.required<string>();
  readonly withSlider = input(true);

  constructor() {}
}
