import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Category } from '../../models';

const TRAILS = ['trail-red', 'trail-blue', 'trail-green', 'trail-yellow'];

@Component({
  selector: 'app-categories-list',
  templateUrl: './categories-list.component.html',
  styleUrls: ['./categories-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class CategoriesListComponent {
  readonly categories = input.required<Category[]>();
  readonly lang = input.required<string>();
  /** true: one horizontally scrolling row on small screens; false: always a wrapping grid */
  readonly withSlider = input(true);

  readonly visibleCategories = computed(() => this.categories().filter((category) => !category.menuHidden));

  /** Each category follows one trail color, in the order of the marked-trail system */
  trailClass(index: number): string {
    return TRAILS[index % TRAILS.length];
  }
}
