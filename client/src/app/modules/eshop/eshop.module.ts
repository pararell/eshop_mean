
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

import { SharedModule } from '../../shared/shared.module';
import { PipeModule } from '../../pipes/pipe.module';
import { ContactComponent } from './contact/contact.component';
import { PageComponent } from './page/page.component';

@NgModule({
  declarations: [
    ContactComponent,
    PageComponent
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
      { path: 'contact', component: ContactComponent },
      { path: ':titleUrl', component: PageComponent },
    ]),
  ],
  providers: []
})
export class EshopModule { }
