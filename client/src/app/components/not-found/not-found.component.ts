import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslateService } from '../../services/translate.service';
import { SSR_RESPONSE } from '../../services/ssr-response';

/** "The trail ends here": unknown URLs */
@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink, TranslatePipe],
})
export class NotFoundComponent {
  readonly lang$ = inject(TranslateService).getLang$();

  constructor() {
    // Server-side render: answer 404, so crawlers don't index unknown URLs as pages
    inject(SSR_RESPONSE, { optional: true })?.status(404);
  }
}
