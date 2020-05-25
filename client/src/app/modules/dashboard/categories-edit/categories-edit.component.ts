import { delay, map, take } from 'rxjs/operators';
import { Component} from '@angular/core';
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
export class CategoriesEditComponent {

  categoryEditForm: FormGroup;
  sendRequest = false;
  categories$: Observable<{category: Category; productsWithCategory: string[]}[]>;
  languageOptions = languages;
  choosenLanguageSub$ = new BehaviorSubject(languages[0]);
  categoryProductsTitlesUrl: string[] = [];

  constructor(private fb: FormBuilder, private store: Store<fromRoot.State>) {
    this.createForm();
    this.categories$ = this.store.select(fromRoot.getAllCategories);
    this.store.dispatch(new actions.GetAllCategories());
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

  editCategory(): void {
    const titleUrl = this.categoryEditForm.get('titleUrl').value;
    this.categories$.pipe(
      take(1),
      map(categories => categories.find(category => category.category.titleUrl === titleUrl)))
      .subscribe(all => {
        const category = all.category;
        this.categoryProductsTitlesUrl = all.productsWithCategory;
        const newForm = {
          titleUrl  : category.titleUrl,
          mainImage : (category.mainImage && category.mainImage.url) ? category.mainImage.url : '',
          ...this.prepareLangEditForm(category)
        };

        this.categoryEditForm.setValue(newForm);
    })
  }

  onSubmit(): void {
    const categoryPrepare = {
      ...this.categoryEditForm.value,
      mainImage: { url: this.categoryEditForm.value.mainImage, name: this.categoryEditForm.value.titleUrl },
    }
    this.store.dispatch(new actions.EditCategory(categoryPrepare));
    this.sendRequest = true;
  }

  onRemove(): void {
    const titleUrl = this.categoryEditForm.get('titleUrl').value;
    this.store.dispatch(new actions.RemoveCategory(titleUrl));
    this.sendRequest = true;
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

  private prepareLangEditForm(category) {
    return this.languageOptions
      .map((lang: string) => {
        const categoryLang = category[lang] || {};
        return {
          [lang]: {
            title         : categoryLang.title || '',
            description   : categoryLang.description || '',
            visibility    : !!categoryLang.visibility,
          }
        }}
      ).reduce((prev, curr) => ({ ...prev, ...curr }), {});
  }



}
