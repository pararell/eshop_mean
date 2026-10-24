import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { TranslateService } from '../../../services/translate.service';
import { MatTabGroup, MatTab, MatTabContent } from '@angular/material/tabs';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AdminProductsComponent } from '../admin-products/admin-products.component';
import { CategoriesEditComponent } from '../categories-edit/categories-edit.component';
import { PagesEditComponent } from '../pages-edit/pages-edit.component';
import { ThemeEditComponent } from '../theme-edit/theme-edit.component';
import { ConfigEditComponent } from '../config-edit/config-edit.component';
import { TranslationsEditComponent } from '../translations-edit/translations-edit.component';
import { AsyncPipe } from '@angular/common';
import { buildLabel } from '../../../build-info';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    RouterLink,
    MatTabGroup,
    MatTab,
    AdminProductsComponent,
    MatTabContent,
    CategoriesEditComponent,
    PagesEditComponent,
    ThemeEditComponent,
    ConfigEditComponent,
    TranslationsEditComponent,
    AsyncPipe,
  ],
})
export class DashboardComponent {
  private translate = inject(TranslateService);

  readonly lang$: Observable<string> = this.translate.getLang$();
  /** The running build, so an admin can tell which version is deployed */
  readonly version = buildLabel();
}
