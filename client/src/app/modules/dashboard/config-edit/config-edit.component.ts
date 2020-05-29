import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { delay, take } from 'rxjs/operators';

import * as fromRoot from '../../../store/reducers';
import * as actions from '../../../store/actions';
import { languages } from '../../../shared/constants';
import { Config } from '../../../shared/models';


@Component({
  selector: 'app-config-edit',
  templateUrl: './config-edit.component.html',
  styleUrls: ['./config-edit.component.scss'],
})
export class ConfigEditComponent {
  configs$: Observable<Config[]>;
  configEditForm: FormGroup;
  languageOptions = languages;
  choosenLanguageSub$ = new BehaviorSubject(languages[0]);
  newConfig = '';
  chosenConfig = '';
  sendRequest = false;

  constructor(private store: Store<fromRoot.State>, private fb: FormBuilder) {
    this.store.dispatch(new actions.GetConfigs());

    this.configEditForm = this.fb.group({
      titleUrl: ['', Validators.required],
      active: false,
      ...this.createLangForm(this.languageOptions),
    });

    this.configs$ = this.store.select(fromRoot.getConfigs);
  }

  addConfig(): void {
    if (this.newConfig) {
      this.configEditForm.get('titleUrl').setValue(this.newConfig);
    }
  }

  choseConfig(): void {
    if (this.chosenConfig) {
      this.configEditForm.get('titleUrl').setValue(this.chosenConfig);
      this.configs$.pipe(take(1)).subscribe((configs) => {
        const foundConfig = configs.find((config) => config.titleUrl === this.chosenConfig);
        const newForm = {
            titleUrl: foundConfig.titleUrl,
            active: foundConfig.active,
            ...this.languageOptions.map((lang: string) => ({
              [lang]: {
                basicShippingCost: foundConfig[lang].shippingCost.basic.cost || 0,
                basicShippingLimit: foundConfig[lang].shippingCost.basic.limit || 0,
                extendedShippingCost: foundConfig[lang].shippingCost.extended.cost || 0,
                extendedShippingLimit: foundConfig[lang].shippingCost.extended.limit || 0,
              }
            }))
            .reduce((prev, curr) => ({ ...prev, ...curr }), {}),
        }
        this.configEditForm.setValue(newForm);
      });
    }
  }

  setLang(lang: string): void {
    this.choosenLanguageSub$.next('');
    from(lang)
      .pipe(delay(100))
      .subscribe(() => {
        this.choosenLanguageSub$.next(lang);
      });
  }

  saveConfig(): void {
    const formValues = this.configEditForm.value;
    const request = {
      titleUrl: formValues.titleUrl,
      active  : formValues.active,
      ...this.languageOptions.map((lang: string) => ({
        [lang]: {
          shippingCost: {
            basic: { cost: formValues[lang].basicShippingCost, limit: formValues[lang].basicShippingLimit },
            extended: { cost: formValues[lang].extendedShippingCost, limit: formValues[lang].extendedShippingLimit }
          }
        }
      }))
      .reduce((prev, curr) => ({ ...prev, ...curr }), {}),
    }
    this.store.dispatch(new actions.AddOrEditConfig(request));
    this.sendRequest = true;
  }

  removeConfig(): void {
    this.store.dispatch(new actions.RemoveConfig(this.chosenConfig));
    this.sendRequest = true;
  }

  private createLangForm(languageOptions: Array<string>) {
    return languageOptions
      .map((lang: string) => ({
        [lang]: this.fb.group({
          basicShippingCost: 0,
          basicShippingLimit: 0,
          extendedShippingCost: 0,
          extendedShippingLimit: 0,
        }),
      }))
      .reduce((prev, curr) => ({ ...prev, ...curr }), {});
  }
}
