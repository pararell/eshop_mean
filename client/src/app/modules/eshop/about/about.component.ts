import { Location } from '@angular/common';
import { Component } from '@angular/core';

import { TranslateService } from '../../../services/translate.service';

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

  goBack(): void {
    this.location.back();
  }

}
