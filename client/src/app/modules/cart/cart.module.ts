import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatStepperModule } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';

import { CartComponent } from './cart/cart.component';
import { SharedModule } from '../../shared/shared.module';
import { PipeModule } from '../../pipes/pipe.module';
import { CardComponent } from './card/card.component';
import { SummaryComponent } from './summary/summary.component';

@NgModule({
  declarations: [
    CartComponent,
    CardComponent,
    SummaryComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    PipeModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatProgressBarModule,
    MatIconModule,
    MatRadioModule,
    MatStepperModule,
    RouterModule.forChild([
      { path: '', component: CartComponent },
      { path: 'summary', component: SummaryComponent }
    ]),
  ],
  providers: []
})
export class CartModule { }
