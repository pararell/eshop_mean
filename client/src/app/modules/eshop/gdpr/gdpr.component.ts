import { Location } from '@angular/common';
import { Component } from '@angular/core';

import { TranslateService } from '../../../services/translate.service';

@Component({
  selector: 'app-gdpr',
  templateUrl: './gdpr.component.html',
  styleUrls: ['./gdpr.component.scss']
})
export class GdprComponent {

  lang: string;

  constructor(translate: TranslateService, private location: Location) {
    translate.languageSub$
      .subscribe(lang => {
        this.lang = lang;
      });
  }

  goBack(): void {
    this.location.back();
  }

}
