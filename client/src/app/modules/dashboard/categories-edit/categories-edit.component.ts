import { toObservable } from '@angular/core/rxjs-interop';
import { delay, map, take, startWith, switchMap } from 'rxjs/operators';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, BehaviorSubject, from } from 'rxjs';

import { languages } from '../../../shared/constants';
import { AllCategories, CategoryRaw } from '../../../shared/models';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';

@Component({
  selector: 'app-categories-edit',
  templateUrl: './categories-edit.component.html',
  styleUrls: ['./categories-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class CategoriesEditComponent {
  categoryEditForm!: FormGroup;
  sendRequest = false;
  categories$: Observable<AllCategories>;
  languageOptions = languages;
  choosenLanguageSub$ = new BehaviorSubject<string>(languages[0]);
  categoryProductsTitlesUrl: string[] = [];
  filteredTitles$: Observable<string[]>;
  mainImageType = false;
  subCategory!: string;

  constructor(
    private fb: FormBuilder,
    private store: SignalStore,
    private selectors: SignalStoreSelectors,
  ) {
    this.createForm();
    this.categories$ = toObservable(this.selectors.allCategories);
    this.store.getAllCategories();

    this.filteredTitles$ = this.categoryEditForm.get('titleUrl')!.valueChanges.pipe(
      startWith(''),
      switchMap((query: string) => {
        const filterValue = query.toLowerCase();
        return this.categories$.pipe(
          map((categories) =>
            categories.map(({ category }) => category.titleUrl).filter((titleUrl: string) => titleUrl.toLowerCase().includes(filterValue)),
          ),
        );
      }),
    );
  }

  createForm(): void {
    this.categoryEditForm = this.fb.group({
      titleUrl: ['', Validators.required],
      mainImage: '',
      subCategories: [[]],
      ...this._createLangForm(this.languageOptions),
    });
  }

  setLang(lang: string): void {
    this.choosenLanguageSub$.next('');
    from(lang)
      .pipe(delay(100))
      .subscribe(() => {
        this.choosenLanguageSub$.next(lang);
      });
  }

  editCategory(): void {
    const titleUrl = this.categoryEditForm.get('titleUrl')!.value;
    this.categories$
      .pipe(
        take(1),
        map((categories) => categories.find((category) => category.category.titleUrl === titleUrl)),
      )
      .subscribe((found) => {
        // titleUrl comes from the loaded list, so the category exists
        const all = found!;
        const category = all.category;
        this.categoryProductsTitlesUrl = all.productsWithCategory;
        this.mainImageType = !!category.mainImage!.type;
        const newForm = {
          titleUrl: category.titleUrl,
          mainImage: category.mainImage && category.mainImage.url ? category.mainImage.url : '',
          subCategories: category.subCategories,
          ...this.prepareLangEditForm(category),
        };

        this.categoryEditForm.setValue(newForm);
      });
  }

  onSubmit(): void {
    const categoryPrepare = {
      ...this.categoryEditForm.value,
      mainImage: {
        url: this.categoryEditForm.value.mainImage,
        name: this.categoryEditForm.value.titleUrl,
        type: this.mainImageType,
      },
    };
    this.store.editCategory(categoryPrepare);
    this.sendRequest = true;
  }

  onRemove(): void {
    const titleUrl = this.categoryEditForm.get('titleUrl')!.value;
    this.store.removeCategory(titleUrl);
    this.sendRequest = true;
  }

  addSubCategory(): void {
    if (this.subCategory && this.subCategory !== this.categoryEditForm.get('titleUrl')!.value) {
      const formSubCategories = this.categoryEditForm.value.subCategories.filter((subCat: string) => subCat !== this.subCategory);
      const subCategories = [...formSubCategories, this.subCategory.replace(/ /g, '_').toLowerCase()];
      this.categoryEditForm.get('subCategories')!.setValue(subCategories);
      this.subCategory = '';
    }
  }

  removeSubCategory(subCatToRemove: string): void {
    const formSubCategories = this.categoryEditForm.value.subCategories.filter((subCat: string) => subCat !== subCatToRemove);
    this.categoryEditForm.get('subCategories')!.setValue(formSubCategories);
  }

  private _createLangForm(languageOptions: Array<string>) {
    return languageOptions
      .map((lang: string) => ({
        [lang]: this.fb.group({
          title: '',
          description: '',
          position: 0,
          visibility: false,
          menuHidden: false,
        }),
      }))
      .reduce((prev, curr) => ({ ...prev, ...curr }), {});
  }

  private prepareLangEditForm(category: CategoryRaw) {
    return this.languageOptions
      .map((lang) => {
        const categoryLang: Partial<NonNullable<CategoryRaw['en']>> = category[lang] || {};
        return {
          [lang]: {
            title: categoryLang.title || '',
            description: categoryLang.description || '',
            position: categoryLang.position || 0,
            visibility: !!categoryLang.visibility,
            menuHidden: !!categoryLang.menuHidden,
          },
        };
      })
      .reduce((prev, curr) => ({ ...prev, ...curr }), {});
  }
}
