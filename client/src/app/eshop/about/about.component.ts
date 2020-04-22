import { Location } from '@angular/common';
import { TranslateService } from './../../services/translate.service';
import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {

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
