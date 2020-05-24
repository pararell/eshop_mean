import { delay } from 'rxjs/operators';
import { Component, OnInit, OnDestroy} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, BehaviorSubject, from } from 'rxjs';

import * as fromRoot from '../../../store/reducers';
import * as actions from '../../../store/actions'
import { languages } from '../../../shared/constants';
import { Category } from '../../../shared/models';

@Component({
  selector: 'app-categories-edit',
  templateUrl: './categories-edit.component.html',
  styleUrls: ['./categories-edit.component.scss']
})
export class CategoriesEditComponent implements OnInit, OnDestroy {


  categoryEditForm: FormGroup;
  sendRequest = false;
  categories$: Observable<Category[]>;
  languageOptions = languages;
  choosenLanguageSub$ = new BehaviorSubject(languages[0]);

  constructor(private fb: FormBuilder, private store: Store<fromRoot.State>) {
    this.createForm();
    this.categories$ = this.store.select(fromRoot.getCategories);
    this.store.dispatch(new actions.GetCategories(languages[0]));
  }

  ngOnInit(): void {


  }

  ngOnDestroy(): void {

  }

  createForm(): void {
    this.categoryEditForm = this.fb.group({
      titleUrl  : ['', Validators.required],
      mainImage : '',
      ...this._createLangForm(this.languageOptions)
    });
  }

  setLang(lang: string): void {
    this.choosenLanguageSub$.next('');
    from(lang).pipe(delay(100))
      .subscribe(() => {
        this.choosenLanguageSub$.next(lang);
      });
  }

  onSubmit(): void {

    this.sendRequest = true;

  }

  findCategory(): void {
    const titleUrl = this.categoryEditForm.get('titleUrl').value;

  }

  private _createLangForm(languageOptions: Array<string>) {
    return languageOptions
      .map((lang: string) => ({
        [lang]: this.fb.group({
          title: '',
          description: '',
          visibility: false,
        })
      })
      ).reduce((prev, curr) => ({ ...prev, ...curr }), {});
  }

  private prepareLangEditForm(product) {
    return this.languageOptions
      .map((lang: string) => {
        const productLang = product[lang];
        return {
          [lang]: {
            title         : productLang.title || '',
            description   : productLang.description || '',
            visibility      : !!productLang.visibility,
          }
        }}
      ).reduce((prev, curr) => ({ ...prev, ...curr }), {});

  }



}
