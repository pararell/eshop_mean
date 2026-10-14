import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Pipe, PipeTransform, inject } from '@angular/core';

import { TranslateService } from '../services/translate.service';

@Pipe({
  name: 'translate',
  pure: true,
  standalone: true,
})
export class TranslatePipe implements PipeTransform {
  private translate = inject(TranslateService);

  transform(key: string): Observable<string> {
    return this.translate.getTranslations$().pipe(map((translations) => (translations ? translations[key] || key : key)));
  }
}
