import { filter, first, take, delay, startWith, map } from 'rxjs/operators';
import { Component, OnInit, Input, OnDestroy, ChangeDetectionStrategy, inject, input, output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Observable, Subscription, BehaviorSubject, from } from 'rxjs';

import { ApiService } from '../../../services/api.service';
import { languages } from '../../../shared/constants';
import { Category, ProductInput, ProductRaw } from '../../../shared/models';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatFormField, MatLabel, MatSelect, MatOption } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { MatAutocompleteTrigger, MatAutocomplete } from '@angular/material/autocomplete';
import { MatButton } from '@angular/material/button';
import { MatRadioGroup, MatRadioButton } from '@angular/material/radio';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { TinyEditorComponent } from '../tiny-editor.ts/tiny-editor.component';
import { AsyncPipe, UpperCasePipe } from '@angular/common';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-products-edit',
  templateUrl: './products-edit.component.html',
  styleUrls: ['./products-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MatFormField,
    MatLabel,
    MatSelect,
    ReactiveFormsModule,
    FormsModule,
    MatOption,
    MatInput,
    MatAutocompleteTrigger,
    MatAutocomplete,
    MatButton,
    MatRadioGroup,
    MatRadioButton,
    MatChipListbox,
    MatChipOption,
    TinyEditorComponent,
    AsyncPipe,
    UpperCasePipe,
    TranslatePipe,
  ],
})
export class ProductsEditComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private apiService = inject(ApiService);

  @Input() action!: string;
  readonly titles = input<string[]>();
  readonly productToEditTitleUrl = input<string>();

  readonly changeTab = output<number>();

  productEditForm!: FormGroup;
  images$: Observable<string[]>;
  sendRequest = false;
  descriptionFullSub$: BehaviorSubject<{ [x: string]: string }> = new BehaviorSubject(
    languages.reduce((prev, lang) => ({ ...prev, [lang]: '' }), {}),
  );
  product$: Observable<ProductRaw>;
  categories$: Observable<Category[]>;
  productSub!: Subscription;
  languageOptions = languages;
  choosenLanguageSub$ = new BehaviorSubject<string>(languages[0]);
  testImageUrl!: string;
  filteredTitles$!: Observable<string[]>;
  tag!: string;

  constructor() {
    this.createForm();
    // In the dashboard the product slot holds the raw (all-language) product, hence no `title`
    this.product$ = toObservable(this.selectors.product).pipe(
      filter((product) => !!product && !!product.titleUrl && !product.title),
    ) as unknown as Observable<ProductRaw>;
    this.categories$ = toObservable(this.selectors.categories);
    this.images$ = toObservable(this.selectors.productImages);
    this.store.getCategories(languages[0]);
  }

  ngOnInit(): void {
    this.store.getImages();
    const productToEditTitleUrl = this.productToEditTitleUrl();
    if (productToEditTitleUrl) {
      this.store.getProduct(productToEditTitleUrl);
    }
    this.filteredTitles$ = this.productEditForm.get('titleUrl')!.valueChanges.pipe(
      startWith(''),
      map((value) => {
        const filterValue = value.toLowerCase();
        return this.titles()!.filter((option) => option.toLowerCase().includes(filterValue));
      }),
    );

    this.productSub = this.product$.subscribe((product) => {
      const newForm = {
        titleUrl: product.titleUrl,
        mainImage: product.mainImage && product.mainImage.url ? product.mainImage.url : '',
        tags: product.tags,
        images: product.images || [],
        imageUrl: '',
        ...this.prepareLangEditForm(product),
      };

      const prepareDescFull = this.languageOptions
        .map((lang) => ({
          [lang]: product[lang]!.descriptionFull.length ? product[lang]!.descriptionFull[0] : '',
        }))
        .reduce((prev, curr) => ({ ...prev, ...curr }), {});

      this.descriptionFullSub$.next(prepareDescFull);
      this.productEditForm.setValue(newForm);
    });
  }

  ngOnDestroy(): void {
    if (this.productSub) {
      this.productSub.unsubscribe();
    }
  }

  onFileChanged(event: Event) {
    const files = (event.target as HTMLInputElement).files!;
    if (files.length === 0) return;

    const mimeType = files[0].type;
    if (mimeType.match(/image\/*/) == null) {
      console.log('Only images are supported.');
      return;
    }

    const uploadImage = this.apiService.uploadImage({ fileToUpload: files[0], titleUrl: this.productToEditTitleUrl() });

    // Only reachable in the browser, where uploadImage() returns an observable
    uploadImage!.pipe(take(1)).subscribe((uploaded) => {
      const result = uploaded as { titleUrl?: string; all?: string[] };
      if (result && result.titleUrl) {
        this.store.storeProduct(result);
      } else if (result && result.all) {
        this.store.storeProductImages(result as { all: string[] });
      }
    });
  }

  onEditorChange(value: string): void {
    this.choosenLanguageSub$.pipe(filter(Boolean), take(1)).subscribe((lang: string) => {
      this.productEditForm.get(lang)!.patchValue({ descriptionFull: value });
    });
  }

  createForm(): void {
    this.productEditForm = this.fb.group({
      titleUrl: ['', Validators.required],
      mainImage: '',
      tags: [[]],
      images: [],
      imageUrl: '',
      ...this.createLangForm(this.languageOptions),
    });
  }

  onRemoveImage(image: string, type: string): void {
    const titleUrl = type === 'product' ? { titleUrl: this.productEditForm.get('titleUrl')!.value } : {};

    this.store.removeImage({ image: image, ...titleUrl });
  }

  setLang(lang: string): void {
    this.choosenLanguageSub$.next('');
    from(lang)
      .pipe(delay(100))
      .subscribe(() => {
        this.choosenLanguageSub$.next(lang);
      });

    const prepareDescFull = this.languageOptions
      .map((language) => {
        const descriptionFull = this.productEditForm.get([language])!.value.descriptionFull;
        return {
          [language]: typeof descriptionFull === 'string' ? descriptionFull : descriptionFull.length ? descriptionFull[0] : '',
        };
      })
      .reduce((prev, curr) => ({ ...prev, ...curr }), {});
    this.descriptionFullSub$.next(prepareDescFull);
  }

  addTag(): void {
    if (this.tag) {
      const formTags = this.productEditForm.value.tags.filter((tag: string) => tag !== this.tag);
      const tags = [...formTags, this.tag.replace(/ /g, '_').toLowerCase()];
      this.productEditForm.get('tags')!.setValue(tags);
      this.tag = '';
    }
  }

  removeTag(tagToRemove: string): void {
    const formTags = this.productEditForm.value.tags.filter((tag: string) => tag !== tagToRemove);
    this.productEditForm.get('tags')!.setValue(formTags);
  }

  addImageUrl(): void {
    const imageUrl = this.productEditForm.get('imageUrl')!.value;
    const titleUrl = this.productEditForm.get('titleUrl')!.value;
    if (imageUrl && titleUrl) {
      this.testImageUrl = imageUrl;
    }
  }

  checkImageUrl() {
    const imageUrl = this.productEditForm.get('imageUrl')!.value;
    const titleUrl = this.productEditForm.get('titleUrl')!.value;
    this.store.addProductImagesUrl({ image: imageUrl, titleUrl });
    this.testImageUrl = '';
  }

  openForm(): void {
    this.sendRequest = false;
  }

  findProduct(): void {
    const titleUrl = this.productEditForm.get('titleUrl')!.value;
    if (titleUrl) {
      this.store.getProduct(titleUrl);
    }
  }

  formatTitleUrl(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.value) {
      const titleUrlFormated = target.value.replace(/\s+/g, '-').toLowerCase();
      this.productEditForm.get('titleUrl')!.setValue(titleUrlFormated);
    }
  }

  onSubmit(): void {
    switch (this.action) {
      case 'add':
        this.images$.pipe(first()).subscribe((images) => {
          if (images && images.length) {
            this.productEditForm.patchValue({ images: images });
          }

          const productPrepare = {
            ...this.productEditForm.value,

            mainImage: {
              url: this.productEditForm.value.mainImage,
              name: this.productEditForm.value.titleUrl,
            },
            ...this.prepareProductData(this.languageOptions, this.productEditForm.value),
          };

          this.store.addProduct(productPrepare);
        });
        break;

      case 'edit': {
        const editProduct = Object.keys(this.productEditForm.value)
          .filter((key) => !!this.productEditForm.value[key])
          .reduce((prev, curr) => ({ ...prev, [curr]: this.productEditForm.value[curr] }), {});

        const productPrepareEdit = {
          ...editProduct,
          mainImage: {
            url: this.productEditForm.value.mainImage,
            name: this.productEditForm.value.titleUrl,
          },
          ...this.prepareProductData(this.languageOptions, editProduct),
        };

        this.store.editProduct(productPrepareEdit as ProductInput);
        break;
      }
    }

    this.sendRequest = true;
  }

  onRemoveSubmit(): void {
    this.store.removeProduct(this.productEditForm.get('titleUrl')!.value);
    this.sendRequest = true;
  }

  private createLangForm(languageOptions: Array<string>) {
    return languageOptions
      .map((lang: string) => ({
        [lang]: this.fb.group({
          title: '',
          description: '',
          salePrice: '',
          regularPrice: '',
          descriptionFull: '',
          visibility: false,
          stock: 'onStock',
          onSale: false,
          shipping: 'basic',
        }),
      }))
      .reduce((prev, curr) => ({ ...prev, ...curr }), {});
  }

  private prepareLangEditForm(product: ProductRaw) {
    return this.languageOptions
      .map((lang) => {
        const productLang = product[lang]!;
        return {
          [lang]: {
            title: productLang.title || '',
            description: productLang.description || '',
            salePrice: productLang.salePrice || '',
            regularPrice: productLang.regularPrice || '',
            descriptionFull: productLang.descriptionFull || '',
            visibility: !!productLang.visibility,
            stock: productLang.stock || 'onStock',
            onSale: !!productLang.onSale,
            shipping: productLang.shipping || 'basic',
          },
        };
      })
      .reduce((prev, curr) => ({ ...prev, ...curr }), {});
  }

  private prepareProductData(languageOptions: Array<string>, formData: Record<string, object>) {
    return languageOptions
      .map((lang: string) => ({
        [lang]: {
          ...formData[lang],
        },
      }))
      .reduce((prev, curr) => ({ ...prev, ...curr }), {});
  }
}
