import { toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { delay, take } from 'rxjs/operators';

import { languages } from '../../../shared/constants';
import { Config, LanguageCode } from '../../../shared/models';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';

@Component({
  selector: 'app-config-edit',
  templateUrl: './config-edit.component.html',
  styleUrls: ['./config-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class ConfigEditComponent {
  configs$: Observable<Config[] | null>;
  configEditForm: FormGroup;
  languageOptions = languages;
  choosenLanguageSub$ = new BehaviorSubject<string>(languages[0]);
  newConfig = '';
  chosenConfig = '';
  sendRequest = false;

  constructor(
    private store: SignalStore,
    private selectors: SignalStoreSelectors,
    private fb: FormBuilder,
  ) {
    this.store.getConfigs();

    this.configEditForm = this.fb.group({
      titleUrl: ['', Validators.required],
      active: false,
      ...this.createLangForm(this.languageOptions),
    });

    this.configs$ = toObservable(this.selectors.configs);
  }

  addConfig(): void {
    if (this.newConfig) {
      this.configEditForm.get('titleUrl')!.setValue(this.newConfig);
    }
  }

  choseConfig(): void {
    if (this.chosenConfig) {
      this.configEditForm.get('titleUrl')!.setValue(this.chosenConfig);
      this.configs$.pipe(take(1)).subscribe((configs) => {
        // chosenConfig comes from the loaded list, so the config exists
        const foundConfig = configs!.find((config) => config.titleUrl === this.chosenConfig)!;
        const newForm = {
          titleUrl: foundConfig.titleUrl,
          active: foundConfig.active,
          ...this.languageOptions
            .map((lang: string) => ({
              [lang]: {
                basicShippingCost: foundConfig[lang as LanguageCode]!.shippingCost?.basic.cost || 0,
                basicShippingLimit: foundConfig[lang as LanguageCode]!.shippingCost?.basic.limit || 0,
                extendedShippingCost: foundConfig[lang as LanguageCode]!.shippingCost?.extended.cost || 0,
                extendedShippingLimit: foundConfig[lang as LanguageCode]!.shippingCost?.extended.limit || 0,
              },
            }))
            .reduce((prev, curr) => ({ ...prev, ...curr }), {}),
        };
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
      active: formValues.active,
      ...this.languageOptions
        .map((lang: string) => ({
          [lang]: {
            shippingCost: {
              basic: { cost: formValues[lang].basicShippingCost, limit: formValues[lang].basicShippingLimit },
              extended: { cost: formValues[lang].extendedShippingCost, limit: formValues[lang].extendedShippingLimit },
            },
          },
        }))
        .reduce((prev, curr) => ({ ...prev, ...curr }), {}),
    };
    this.store.addOrEditConfig(request);
    this.sendRequest = true;
  }

  removeConfig(): void {
    this.store.removeConfig(this.chosenConfig);
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
