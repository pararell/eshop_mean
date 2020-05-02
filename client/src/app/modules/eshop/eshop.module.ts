
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

import { SharedModule } from '../../shared/shared.module';
import { PipeModule } from '../../pipes/pipe.module';
import { VopComponent } from './vop/vop.component';
import { GdprComponent } from './gdpr/gdpr.component';
import { ContactComponent } from './contact/contact.component';
import { AboutComponent } from './about/about.component';

@NgModule({
  declarations: [
    VopComponent,
    GdprComponent,
    ContactComponent,
    AboutComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    PipeModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    RouterModule.forChild([
      { path: 'vop', component: VopComponent },
      { path: 'gdpr', component: GdprComponent },
      { path: 'contact', component: ContactComponent },
      { path: 'info', component: AboutComponent }
    ]),
  ],
  providers: []
})
export class EshopModule { }
