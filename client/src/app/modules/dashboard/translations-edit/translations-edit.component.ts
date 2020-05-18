import { take } from 'rxjs/operators';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { Component, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, BehaviorSubject, Subscription } from 'rxjs';

import * as fromRoot from '../../../store/reducers';
import * as actions from '../../../store/actions'
import { languages } from '../../../shared/constants';
import { Translations } from '../../../shared/models';

@Component({
  selector: 'app-translations-edit',
  templateUrl: './translations-edit.component.html',
  styleUrls: ['./translations-edit.component.scss']
})
export class TranslationsEditComponent implements OnDestroy {

  translations$: Observable<Translations[]>;
  languageForm: FormGroup;
  translationSub$ = new BehaviorSubject([]);
  translationsSub: Subscription;
  allLanguages = languages;

  constructor(private store: Store<fromRoot.State>, private fb: FormBuilder) {

     this.store.dispatch(new actions.GetAllTranslations());

     this.languageForm = this.fb.group({
        add: ''
     });

     this.translations$ = this.store.select(fromRoot.getAllTranslations);

     this.translationsSub = this.translations$
      .subscribe(translations => {
        translations.forEach((translation: Translations) => {
          const keys = translation.keys;
          const newUsergroup: FormGroup = this.fb.group({});
          Object.keys(keys).map(key => {
            newUsergroup.addControl(key, new FormControl(keys[key]));
          })
          this.languageForm.setControl(translation.lang, newUsergroup);
          this.languageForm.setControl(translation.lang + '_json', new FormControl(JSON.stringify(keys)));
        });

        this.translationSub$.next(translations);
      })
   }

   addKeyToTranslation(): void {
      const newKey = this.languageForm.get('add').value;
      if (newKey) {
      this.translationSub$.pipe(take(1)).subscribe(translations => {
        const updateTransations = translations.map(translation => {
          const langGroup = this.languageForm.get(translation.lang) as FormGroup;
          langGroup.addControl(newKey, new FormControl(newKey));

          return {...translation, keys: {...translation.keys, [newKey]: newKey}};
        })

        this.translationSub$.next(updateTransations);
      })

      this.languageForm.get('add').patchValue('');
    }
   }

   removeTranslation(toRemove: string): void {
    this.translationSub$.pipe(take(1)).subscribe(translations => {
      const updateTransations = translations.map(translation => {
        const langGroup = this.languageForm.get(translation.lang) as FormGroup;
          langGroup.removeControl(toRemove);

          return {...translation, keys: Object.keys(translation.keys)
            .filter(key => key !== toRemove)
            .reduce((prev, curr) => ({...prev, [curr]: translation.keys[curr]}) , {})};
        })
        this.translationSub$.next(updateTransations);
    });
   }

   submitForm(): void {
     const allTranslations = Object.keys(this.languageForm.value)
      .filter(value => this.allLanguages.includes(value))
      .map(lang => ({
        lang,
        keys: this.languageForm.value[lang]
      }))
     this.store.dispatch(new actions.EditTranslation(allTranslations));
   }

   submitJSON(): void {
    const allTranslations = Object.keys(this.languageForm.value)
    .filter(value => value.includes('_json'))
    .map(lang => ({
      lang : lang.replace('_json', ''),
      keys: JSON.parse(this.languageForm.value[lang])
    }))
    this.store.dispatch(new actions.EditTranslation(allTranslations));
  }

   ngOnDestroy(): void {
    this.translationsSub.unsubscribe();
   }

}
