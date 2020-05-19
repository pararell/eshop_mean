import { Component, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';

import * as fromRoot from '../../store/reducers';
import { TranslateService } from '../../services/translate.service';
import { Page } from '../../shared/models';


@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnDestroy {
  currentYear = new Date().getFullYear();
  lang: string;
  getPagesSub: Subscription;
  pages$: Observable<Page[]>;

  constructor(translate: TranslateService, private store: Store<fromRoot.State>) {
    this.getPagesSub = translate.getLang$()
      .subscribe(lang => {
        this.lang = lang;
        this.pages$ = this.store.select(fromRoot.getPages)
    });
  }

  ngOnDestroy(): void {
    this.getPagesSub.unsubscribe();
  }
}
