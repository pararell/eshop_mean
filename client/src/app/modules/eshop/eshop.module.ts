
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RECAPTCHA_V3_SITE_KEY, RecaptchaV3Module } from 'ng-recaptcha';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { SharedModule } from '../../shared/shared.module';
import { PipeModule } from '../../pipes/pipe.module';
import { ContactComponent } from './contact/contact.component';
import { PageComponent } from './page/page.component';
import { EnvConfigurationService } from '../../services/env-configuration.service';

export function RecaptchFactory(config: EnvConfigurationService): string {
  return config && config.config ? config.config['FE_RECAPTCHA_CLIENT_KEY'] : '';
}

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
    MatProgressBarModule,
    RecaptchaV3Module,
    RouterModule.forChild([
      { path: 'contact', component: ContactComponent },
      { path: ':titleUrl', component: PageComponent },
    ]),
  ],
  providers: [
    { provide: RECAPTCHA_V3_SITE_KEY,
      useFactory: RecaptchFactory,
      deps: [ EnvConfigurationService ]
    }
  ]
})
export class EshopModule { }
