import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../../store/reducers';
import { TranslateService } from '../../../services/translate.service';


@Component({
  selector: 'app-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss']
})
export class PageComponent {

  lang$: Observable<string>;
  titleUrl$: Observable<string>;
  page$: Observable<{title: string; contentHTML: string}>;

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router : Router,
    private store: Store<fromRoot.State>,
    private translate: TranslateService) {

    this.lang$ = this.translate.getLang$().pipe(filter((lang: string) => !!lang));
    this.titleUrl$ = this.route.params.pipe(map(params => params['titleUrl']));
    this.page$ = combineLatest(
      this.titleUrl$,
      this.lang$,
      this.store.select(fromRoot.getPages).pipe(filter(pages => !!pages)),
      (titleUrl: string, lang: string, pages: any[]) => {
        const foundPage = pages.find(page => page.titleUrl === titleUrl);
        if (!foundPage) {
          this.router.navigate(['/']);
          return;
        }
        return { title: foundPage[lang].title, contentHTML: foundPage[lang].contentHTML }
      })
  }

  goBack(): void {
    this.location.back();
  }

}
