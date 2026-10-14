import type { LanguageCode } from '@eshop/shared';
import { ChangeDetectionStrategy, Component, OnDestroy, Signal } from '@angular/core';
import { Subscription } from 'rxjs';

import { TranslateService } from '../../../services/translate.service';
import { Page } from '../../../shared/models';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe, RouterLink],
})
export class FooterComponent implements OnDestroy {
  currentYear = new Date().getFullYear();
  lang!: LanguageCode;
  getPagesSub: Subscription;
  pages$!: Signal<Page[] | null>;

  constructor(
    translate: TranslateService,
    private selectors: SignalStoreSelectors,
  ) {
    this.getPagesSub = translate.getLang$().subscribe((lang) => {
      this.lang = lang as LanguageCode;
      this.pages$ = this.selectors.pages;
    });
  }

  ngOnDestroy(): void {
    this.getPagesSub.unsubscribe();
  }
}
