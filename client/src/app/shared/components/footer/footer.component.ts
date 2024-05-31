import { ChangeDetectionStrategy, Component, OnDestroy, Signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

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
  standalone: true,
  imports: [CommonModule, TranslatePipe, RouterLink],
})
export class FooterComponent implements OnDestroy {
  currentYear = new Date().getFullYear();
  lang: string;
  getPagesSub: Subscription;
  pages$: Signal<Page[]>;

  constructor(translate: TranslateService, private selectors: SignalStoreSelectors) {
    this.getPagesSub = translate.getLang$()
      .subscribe(lang => {
        this.lang = lang;
        this.pages$ = this.selectors.pages;
    });
  }

  ngOnDestroy(): void {
    this.getPagesSub.unsubscribe();
  }
}
