import { Location } from '@angular/common';
import { TranslateService } from './../../services/translate.service';
import { Component } from '@angular/core';

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

  goBack() {
    this.location.back();
  }

}
