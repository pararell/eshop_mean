import { PriceFormatPipe } from './price.pipe';
import { NgModule } from '@angular/core';
import {CommonModule} from '@angular/common';

import { TranslatePipe } from './translate.pipe';

@NgModule({
  declarations: [TranslatePipe, PriceFormatPipe],
  imports: [CommonModule],
  exports: [TranslatePipe, PriceFormatPipe]
})

export class PipeModule {}
