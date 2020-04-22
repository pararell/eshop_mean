import { filter } from 'rxjs/operators';
import { Component } from '@angular/core';
import { TranslateService } from '../../services/translate.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent  {

  productAction: String = '';
  lang: string;

  constructor(private translate: TranslateService) {
    this.translate.translationsSub$
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.lang = translate.lang;
      });
  }

  changeAction(action: string) {
    this.productAction = this.productAction === action ? '' : action;
  }

}
