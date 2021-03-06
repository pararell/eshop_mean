import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';

import * as actions from '../../../store/actions';
import * as fromRoot from '../../../store/reducers';
import { TranslateService } from '../../../services/translate.service';
import { Page } from '../../../shared/models';


@Component({
  selector: 'app-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss']
})
export class PageComponent {

  lang$: Observable<string>;
  titleUrl$: Observable<string>;
  page$: Observable<Page>;
  pageSub: Subscription;

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router : Router,
    private store: Store<fromRoot.State>,
    private translate: TranslateService) {

    this.lang$ = this.translate.getLang$().pipe(filter((lang: string) => !!lang));
    this.titleUrl$ = this.route.params.pipe(map(params => params['titleUrl']));
    this.page$ = this.store.select(fromRoot.getPage).pipe(filter(page => !!page));

    this.pageSub = combineLatest([
      this.titleUrl$,
      this.lang$]
    ).subscribe(([titleUrl, lang ]: [string, string]) => {
      this.store.dispatch(new actions.GetPage({ titleUrl, lang }));
    })
  }

  goBack(): void {
    this.location.back();
  }

}
