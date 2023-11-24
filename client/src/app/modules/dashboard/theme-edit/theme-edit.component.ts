import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, BehaviorSubject } from 'rxjs';
import {  take } from 'rxjs/operators';

import * as fromRoot from '../../../store/reducers';
import * as actions from '../../../store/actions';
import { languages } from '../../../shared/constants';
import { ThemeService } from '../../../services/theme.service';
import { Theme } from '../../../shared/models';


@Component({
  selector: 'app-theme-edit',
  templateUrl: './theme-edit.component.html',
  styleUrls: ['./theme-edit.component.scss'],
})
export class ThemeEditComponent {
  themes$: Observable<Theme[]>;
  themesEditForm: FormGroup;
  languageOptions = languages;
  choosenLanguageSub$ = new BehaviorSubject(languages[0]);
  newTheme = '';
  chosenTheme = '';
  sendRequest = false;

  constructor(
      private store: Store<fromRoot.State>,
      private fb: FormBuilder,
      private themeService: ThemeService,
      ) {
    this.store.dispatch(new actions.GetThemes());

    this.themesEditForm = this.fb.group({
      titleUrl: ['', Validators.required],
      ...this.startFormValues()
    });

    this.themes$ = this.store.select(fromRoot.getThemes);

    this.themesEditForm.valueChanges.subscribe(values => {
      this.themeService.setCSSVariable(values.primaryColor, 'primary-color');
      this.themeService.setCSSVariable(values.secondaryColor, 'secondary-color');
      this.themeService.setCSSVariable(values.backgroundColor, 'background-color');
      this.themeService.setThemeColor(values.primaryColor, 'theme-primary');
      this.themeService.setThemeColor(values.secondaryColor, 'theme-secondary');
      if (values.mainBackground) {
        this.themeService.setCSSVariable(values.mainBackground, 'main-background');
        this.themeService.setCSSVariable(`url(${values.mainBackground})`, 'main-background-url');
      } else {
        this.themeService.setCSSVariable(`url(/)`, 'main-background-url');
      }
      this.themeService.setCSSVariable(values.freeShippingPromo, 'free-shipping-promo');
      this.themeService.setCSSVariable(`url(${values.promoSlideBackground})`, 'promo-slide-background');
      this.themeService.setCSSVariable(`${values.promoSlideBackgroundPosition}`, 'promo-slide-background-position');
      this.themeService.setCSSVariable(values.promo, 'promo');
      this.themeService.setCSSVariable(`url(${values.logo})`, 'logo');
    })
  }

  addTheme(): void {
    if (this.newTheme) {
      this.themesEditForm.get('titleUrl').setValue(this.newTheme);
      const newForm = {
        titleUrl:  this.newTheme,
        ...this.startFormValues()
      }
      this.themesEditForm.setValue(newForm);
    }
  }

  choseTheme(): void {
    if (this.chosenTheme) {
      this.themesEditForm.get('titleUrl').setValue(this.chosenTheme);
      this.themes$.pipe(take(1)).subscribe((themes) => {
        const foundTheme = themes.find((theme) => theme.titleUrl === this.chosenTheme);
        this.themesEditForm.get('active').setValue(!!foundTheme.active);
        this.themesEditForm.get('freeShippingPromo').setValue(foundTheme.styles.freeShippingPromo || 'none');
        this.themesEditForm.get('promoSlideBackground').setValue(foundTheme.styles.promoSlideBackground || '');
        this.themesEditForm.get('promoSlideBackgroundPosition').setValue(foundTheme.styles.promoSlideBackgroundPosition || '');
        this.themesEditForm.get('promo').setValue(foundTheme.styles.promo || 'none');
        this.themesEditForm.get('primaryColor').setValue(foundTheme.styles.primaryColor || '');
        this.themesEditForm.get('secondaryColor').setValue(foundTheme.styles.secondaryColor || '');
        this.themesEditForm.get('backgroundColor').setValue(foundTheme.styles.backgroundColor || '');
        this.themesEditForm.get('mainBackground').setValue(foundTheme.styles.mainBackground || '');
        this.themesEditForm.get('logo').setValue(foundTheme.styles.logo || '');
      });
    }
  }

  saveTheme(): void {
    const formValues = this.themesEditForm.value;
    const request = {
      titleUrl: formValues.titleUrl,
      active  : formValues.active,
      styles: {
        primaryColor: formValues.primaryColor,
        promoSlideBackground: formValues.promoSlideBackground,
        promoSlideBackgroundPosition: formValues.promoSlideBackgroundPosition,
        secondaryColor: formValues.secondaryColor,
        backgroundColor: formValues.backgroundColor,
        mainBackground: formValues.mainBackground,
        freeShippingPromo: formValues.freeShippingPromo,
        promo: formValues.promo,
        logo: formValues.logo
      }
    }
    this.store.dispatch(new actions.AddOrEditTheme(request));
    this.sendRequest = true;
  }

  removeTheme(): void {
    this.store.dispatch(new actions.RemoveTheme(this.chosenTheme));
    this.sendRequest = true;
  }

  private startFormValues() {
    return {
      active  : false,
      freeShippingPromo: 'none',
      promoSlideBackground: '',
      promoSlideBackgroundPosition: 'center',
      promo: 'none',
      primaryColor: '#222222',
      secondaryColor: '#cccccc',
      backgroundColor: '#eeeeee',
      mainBackground: '',
      logo: ''
    }
  }

}
