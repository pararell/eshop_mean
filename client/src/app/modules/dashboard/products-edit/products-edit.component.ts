import { filter, first, take, delay, startWith, map } from 'rxjs/operators';
import { Component, OnInit, Input, OnDestroy, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FileUploader, FileItem, ParsedResponseHeaders } from 'ng2-file-upload';
import { Store } from '@ngrx/store';
import { Observable, Subscription, BehaviorSubject, from } from 'rxjs';

import * as fromRoot from '../../../store/reducers';
import * as actions from '../../../store/actions'
import { ApiService } from '../../../services/api.service';
import { languages } from '../../../shared/constants';
import { Product, Category } from '../../../shared/models';

@Component({
  selector: 'app-products-edit',
  templateUrl: './products-edit.component.html',
  styleUrls: ['./products-edit.component.scss']
})
export class ProductsEditComponent implements OnInit, OnDestroy {
  @Input() action: string;
  @Input() titles: string[];

  @Output() changeTab = new EventEmitter<number>();

  productEditForm: FormGroup;
  uploader: FileUploader;
  images$: Observable<string[]>;
  sendRequest = false;
  descriptionFullSub$: BehaviorSubject<{ [x: string]: string }>
    = new BehaviorSubject(languages.reduce((prev, lang) => ({...prev, [lang]: ''}) , {}));
  product$: Observable<Product>;
  categories$: Observable<Category[]>;
  productSub: Subscription;
  languageOptions = languages;
  choosenLanguageSub$ = new BehaviorSubject(languages[0]);
  testImageUrl: string;
  filteredTitles$: Observable<string[]>;
  tag: string;

  constructor(private fb: FormBuilder, private store: Store<fromRoot.State>, private apiService: ApiService) {
    this.createForm();
    this.product$ = this.store.select(fromRoot.getProduct).pipe(
      filter(product => !!product && !!product.titleUrl && !product.title));
    this.categories$ = this.store.select(fromRoot.getCategories);
    this.store.dispatch(new actions.GetCategories(languages[0]));
  }

  ngOnInit(): void {
    this.store.dispatch(new actions.GetImages());
    this.filteredTitles$ = this.productEditForm.get('titleUrl').valueChanges.pipe(
      startWith(''),
      map(value => {
        const filterValue = value.toLowerCase();
        return this.titles.filter(option => option.toLowerCase().includes(filterValue))
      })
    )
    this.images$ = this.store.select(fromRoot.getProductImages);

    const uploaderOptions = {
      itemAlias: 'file',
      autoUpload: true
    }

    this.store.dispatch(new actions.SetUploader({ options: uploaderOptions }))
    this.apiService.getUploader().subscribe(uploader => {
      this.uploader = uploader;
      this.uploader.onErrorItem = (item, response, status, headers) => this.onErrorItem(item, response, status, headers);
      this.uploader.onSuccessItem = (item, response, status, headers) => this.onSuccessItem(item, response, status, headers);
    })

    this.productSub = this.product$
      .subscribe((product) => {

        const newForm = {
          titleUrl  : product.titleUrl,
          mainImage : (product.mainImage && product.mainImage.url) ? product.mainImage.url : '',
          tags      : product.tags,
          images    : product.images,
          imageUrl  : '',
          ...this.prepareLangEditForm(product)
        };

        const uploaderOptions = {
          itemAlias: 'file',
          autoUpload: true
        }

        this.store.dispatch(new actions.SetUploader({ options: uploaderOptions, titleUrl: product.titleUrl }))

        const prepareDescFull = this.languageOptions
          .map(lang => ({
            [lang]: product[lang].descriptionFull.length ? product[lang].descriptionFull[0] : ''
          })).reduce((prev, curr) => ({ ...prev, ...curr }), {});

        this.descriptionFullSub$.next(prepareDescFull);
        this.productEditForm.setValue(newForm);
      });

  }

  ngOnDestroy(): void {
    if (this.productSub) {
      this.productSub.unsubscribe();
    }
  }

  onSuccessItem(item: FileItem, response: string, status: number, headers: ParsedResponseHeaders): void {
    const parseResponse = JSON.parse(response);
    if (parseResponse && parseResponse.titleUrl) {
      this.store.dispatch(new actions.GetProductSuccess(parseResponse));
    } else if (parseResponse && parseResponse.all) {
      this.store.dispatch(new actions.AddProductImagesUrlSuccess(parseResponse));
    }
  }

  onErrorItem(item: FileItem, response: string, status: number, headers: ParsedResponseHeaders): void {
    console.log(JSON.parse(response));
  }

  onEditorChange(value): void {
    this.choosenLanguageSub$
      .pipe(filter(Boolean), take(1))
      .subscribe((lang: string) => {
        this.productEditForm.get(lang).patchValue({ descriptionFull: value });
      });
  }

  createForm(): void {
    this.productEditForm = this.fb.group({
      titleUrl  : ['', Validators.required],
      mainImage : '',
      tags      : [[]],
      images    : [],
      imageUrl  : '',
      ...this._createLangForm(this.languageOptions)
    });
  }

  onRemoveImage(image: string, type: string): void {
    const titleUrl = type === 'product'
      ? { titleUrl: this.productEditForm.get('titleUrl').value }
      : {};

    this.store.dispatch(new actions.RemoveProductImage({ image: image, ...titleUrl }));
  }

  setLang(lang: string): void {
    this.choosenLanguageSub$.next('');
    from(lang).pipe(delay(100))
      .subscribe(() => {
        this.choosenLanguageSub$.next(lang);
      });


    const prepareDescFull = this.languageOptions
      .map(language => {
        const descriptionFull = this.productEditForm.get([language]).value.descriptionFull;
        return {
        [language]: typeof descriptionFull === 'string'
          ? descriptionFull
          : descriptionFull.length ? descriptionFull[0] : ''
      }}).reduce((prev, curr) => ({ ...prev, ...curr }), {});
    this.descriptionFullSub$.next(prepareDescFull);
  }

  onSubmit(): void {

    switch (this.action) {
      case 'add':
        this.images$.pipe(first())
          .subscribe(images => {
            if (images && images.length) {
              this.productEditForm.patchValue({ images: images });
            }

            const productPrepare = {
              ...this.productEditForm.value,

              mainImage: { url: this.productEditForm.value.mainImage, name: this.productEditForm.value.titleUrl },
              ...this.prepareProductData(this.languageOptions, this.productEditForm.value)
            };

            this.store.dispatch(new actions.AddProduct(productPrepare));
          })
        break;

      case 'edit':
        const editProduct = Object.keys(this.productEditForm.value)
          .filter(key => !!this.productEditForm.value[key])
          .reduce((prev, curr) => ({ ...prev, [curr]: this.productEditForm.value[curr] }), {});

        const productPrepare = {
          ...editProduct,
          mainImage: { url: this.productEditForm.value.mainImage, name: this.productEditForm.value.titleUrl },
          ...this.prepareProductData(this.languageOptions, editProduct)
        };

        this.store.dispatch(new actions.EditProduct(productPrepare));
        break;
    }

    this.sendRequest = true;

  }

  onRemoveSubmit(): void {
    this.store.dispatch(new actions.RemoveProduct(this.productEditForm.get('titleUrl').value));
    this.sendRequest = true;
  }

  addTag(): void {
    if (this.tag) {
      const formTags = this.productEditForm.value.tags.filter(tag => tag !== this.tag);
      const tags = [...formTags, this.tag.replace(/ /g, '_').toLowerCase()];
      this.productEditForm.get('tags').setValue(tags);
      this.tag = '';
    }
  }

  removeTag(tagToRemove: string): void {
    const formTags = this.productEditForm.value.tags.filter(tag => tag !== tagToRemove);
    this.productEditForm.get('tags').setValue(formTags);
  }

  addImageUrl(): void {
    const imageUrl = this.productEditForm.get('imageUrl').value;
    const titleUrl = this.productEditForm.get('titleUrl').value;
    if (imageUrl && titleUrl) {
      this.testImageUrl = imageUrl;
    }
  }

  checkImageUrl() {
    const imageUrl = this.productEditForm.get('imageUrl').value;
    const titleUrl = this.productEditForm.get('titleUrl').value;
    this.store.dispatch(new actions.AddProductImagesUrl({ image: imageUrl, titleUrl }));
    this.testImageUrl = '';
  }

  openForm(): void {
    this.sendRequest = false;
  }

  findProduct(): void {
    const titleUrl = this.productEditForm.get('titleUrl').value;
    if (titleUrl) {
      this.store.dispatch(new actions.GetProduct(titleUrl));
    }
  }

  formatTitleUrl(e) {
    if (e.target.value) {
      const titleUrlFormated = e.target.value.replace(/\s+/g, '-').toLowerCase();
      this.productEditForm.get('titleUrl').setValue(titleUrlFormated);
    }
  }

  private _createLangForm(languageOptions: Array<string>) {
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
          shipping: 'basic'
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
            salePrice     : productLang.salePrice || '',
            regularPrice  : productLang.regularPrice || '',
            descriptionFull : productLang.descriptionFull || '',
            visibility      : !!productLang.visibility,
            stock           : productLang.stock || 'onStock',
            onSale          : !!productLang.onSale,
            shipping         : productLang.shipping || 'basic'
          }
        }}
      ).reduce((prev, curr) => ({ ...prev, ...curr }), {});

  }

  private prepareProductData(languageOptions: Array<string>, formData) {
    return languageOptions
      .map((lang: string) => ({
        [lang]: {
          ...formData[lang]
        }
      })).reduce((prev, curr) => ({ ...prev, ...curr }), {});
  }


}
