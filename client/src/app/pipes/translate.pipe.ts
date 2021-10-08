import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Pipe, PipeTransform } from '@angular/core';

import { TranslateService } from '../services/translate.service';


@Pipe({
  name: 'translate',
  pure: true
})
export class TranslatePipe implements PipeTransform {
  constructor(private translate: TranslateService) {}
  transform(key: string): Observable<string> {
    return this.translate.getTranslations$()
      .pipe(map(translations => translations ? (translations[key] || key) : key));
  }

}
