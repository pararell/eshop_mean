import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { TranslateService } from '../../../services/translate.service';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent  {

  productAction = '';
  lang$: Observable<string>;

  readonly component = 'dashboard';

  constructor(private translate: TranslateService) {
    this.lang$ = this.translate.getLang$();
  }

  changeAction(action: string): void {
    this.productAction = this.productAction === action ? '' : action;
  }

}
