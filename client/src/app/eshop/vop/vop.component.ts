import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateService } from '../../services/translate.service';

@Component({
  selector: 'app-vop',
  templateUrl: './vop.component.html',
  styleUrls: ['./vop.component.scss']
})
export class VopComponent {

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
