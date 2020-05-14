import { Component } from '@angular/core';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../store/reducers';
import { TranslateService } from '../../services/translate.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  lang: string;
  pages$: Observable<any>;

  constructor(translate: TranslateService, private store: Store<fromRoot.State>) {
    translate.languageSub$.subscribe(lang => {
      this.lang = lang;

      this.pages$ = this.store.select(fromRoot.getPages)
    });
  }
}
