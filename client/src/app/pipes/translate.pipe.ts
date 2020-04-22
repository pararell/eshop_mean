import { take, map } from 'rxjs/operators';
import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '../services/translate.service';

@Pipe({
  name: 'translate',
  pure: false
})
export class TranslatePipe implements PipeTransform {

  constructor(private translate: TranslateService) {}
  transform(key: any): any {
    return this.translate.translationsSub$
    .pipe(take(1), map(translations => translations ? translations[key] : key));
  }

}
