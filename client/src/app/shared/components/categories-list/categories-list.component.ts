import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Category } from '../../models';

const TRAILS = ['trail-red', 'trail-blue', 'trail-green', 'trail-yellow'];

@Component({
  selector: 'app-categories-list',
  templateUrl: './categories-list.component.html',
  styleUrls: ['./categories-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgOptimizedImage],
})
export class CategoriesListComponent {
  readonly categories = input.required<Category[]>();
  readonly lang = input.required<string>();

  readonly visibleCategories = computed(() => this.categories().filter((category) => !category.menuHidden));

  /** Five categories: one large tile and four small ones, so no tile is left alone in a row */
  readonly featureFirst = computed(() => this.visibleCategories().length === 5);

  /** Columns that divide the count evenly where possible (6 → 3 × 2, 8 → 4 × 2) */
  readonly columns = computed(() => {
    const count = this.visibleCategories().length;
    if (count <= 4) return Math.max(count, 1);
    return count % 4 === 0 ? 4 : count % 3 === 0 ? 3 : 4;
  });

  /** Each category follows one trail color, in the order of the marked-trail system */
  trailClass(index: number): string {
    return TRAILS[index % TRAILS.length];
  }
}
