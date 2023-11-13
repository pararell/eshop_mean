import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { Category } from '../models';
import { CarouselComponent } from '../carousel/carousel.component';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-categories-list',
  templateUrl: './categories-list.component.html',
  styleUrls: ['./categories-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CarouselComponent, RouterLink, CommonModule]
})
export class CategoriesListComponent {
  @Input()  categories    : Category[];
  @Input()  lang          : string;
  @Input()  withSlider    = true;

  constructor() {}
}
