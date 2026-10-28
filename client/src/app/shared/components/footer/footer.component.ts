import type { LanguageCode } from '@eshop/shared';
import { ChangeDetectionStrategy, Component, OnDestroy, Signal, inject } from '@angular/core';
import { Subscription } from 'rxjs';

import { TranslateService } from '../../../services/translate.service';
import { ThemeService } from '../../../services/theme.service';
import { Page } from '../../../shared/models';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { RouterLink } from '@angular/router';
import { RidgeComponent } from '../ridge/ridge.component';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe, RouterLink, RidgeComponent],
})
export class FooterComponent implements OnDestroy {
  private selectors = inject(SignalStoreSelectors);
  /** The shop name from the active theme; empty = the ESHOP_TITLE translation */
  readonly shopName = inject(ThemeService).shopName;

  readonly cart = this.selectors.cart;
  readonly currency = this.selectors.currency;
  currentYear = new Date().getFullYear();
  lang!: LanguageCode;
  getPagesSub: Subscription;
  pages$!: Signal<Page[] | null>;

  constructor() {
    const translate = inject(TranslateService);

    this.getPagesSub = translate.getLang$().subscribe((lang) => {
      this.lang = lang as LanguageCode;
      this.pages$ = this.selectors.pages;
    });
  }

  ngOnDestroy(): void {
    this.getPagesSub.unsubscribe();
  }
}
