import { Component } from '@angular/core';
import { TranslateService } from '../services/translate.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  lang: string;

  constructor(translate: TranslateService) {
    translate.languageSub$.subscribe(lang => {
      this.lang = lang;
    });
  }
}
