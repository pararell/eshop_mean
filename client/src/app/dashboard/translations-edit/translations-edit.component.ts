import { first } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Component } from '@angular/core';

import { Observable } from 'rxjs';

import * as fromRoot from '../../store/reducers';
import { Store } from '@ngrx/store';
import * as actions from './../../store/actions'

@Component({
  selector: 'app-translations-edit',
  templateUrl: './translations-edit.component.html',
  styleUrls: ['./translations-edit.component.scss']
})
export class TranslationsEditComponent {

  translations$: Observable<any>;
  languageForm: FormGroup;

  editLang = '';

  constructor(private store: Store<fromRoot.State>, private _fb: FormBuilder) {

     this.store.dispatch(new actions.GetAllTranslations());

     this.languageForm = this._fb.group({
      lang: ['', Validators.required ]
    });

     this.translations$ = this.store.select(fromRoot.getAllTranslations);
   }

   showLanguageEdit(lang) {
     this.translations$.pipe(first())
      .subscribe(translations => {
        const keys = translations
          .filter(translation => translation.lang === lang)[0].keys;
        this.languageForm.get('lang').setValue(JSON.stringify(keys));
      })
      this.editLang = lang;
   }

   submit() {
    const keys = this.languageForm.get('lang').value;
    this.store.dispatch(new actions.EditTranslation(
      {lang: this.editLang, keys: JSON.parse(keys) })
    );
   }

}
