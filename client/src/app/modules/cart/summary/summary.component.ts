import { Location, AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { TranslateService } from './../../../services/translate.service';
import { Component, Signal, ChangeDetectionStrategy, inject, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Order } from '../../../shared/models';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { SignalStore } from '../../../store/signal.store';
import { OrderInfoComponent } from '../../../shared/components/order-info/order-info.component';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, OrderInfoComponent, AsyncPipe, TranslatePipe],
})
export class SummaryComponent {
  private location = inject(Location);
  private selectors = inject(SignalStoreSelectors);
  translate = inject(TranslateService);

  private store = inject(SignalStore);
  private route = inject(ActivatedRoute);

  order$: Signal<Order | null>;
  lang$: Observable<string>;
  /** A card payment that Stripe has not confirmed yet (e.g. a bank transfer still processing) */
  readonly pending = computed(() => ['PENDING_PAYMENT', 'PAYMENT_FAILED'].includes(this.order$()?.status ?? ''));

  readonly component = 'summaryComponent';

  constructor() {
    this.order$ = this.selectors.order;
    this.lang$ = this.translate.getLang$();

    // Back from a Stripe redirect (3-D Secure page, bank app): load the order's payment state
    const orderId = this.route.snapshot.queryParamMap.get('order');
    if (orderId && isPlatformBrowser(inject(PLATFORM_ID)) && this.order$()?.orderId !== orderId) {
      this.store.completePayment(orderId);
    }
  }

  goBack(): void {
    this.location.back();
  }
}
