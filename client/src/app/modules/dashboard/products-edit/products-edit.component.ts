import { filter, map, first, take, delay } from 'rxjs/operators';
import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators  } from '@angular/forms';
import { FileUploader, FileItem, ParsedResponseHeaders} from 'ng2-file-upload';

import { Observable, Subscription, BehaviorSubject, from } from 'rxjs';

import * as fromRoot from '../../../store/reducers';
import { Store } from '@ngrx/store';
import * as actions from '../../../store/actions'
import { ApiService } from '../../../services/api.service';


@Component({
  selector: 'app-products-edit',
  templateUrl: './products-edit.component.html',
  styleUrls: ['./products-edit.component.scss']
})
export class ProductsEditComponent implements OnInit, OnDestroy {
  @Input() action: string;

  productEditForm     : FormGroup;
  uploader            : FileUploader;
  images$             : Observable<any>;
  sendRequest         : Boolean = false;
  descriptionFullSub$ : BehaviorSubject<any> = new BehaviorSubject({sk: '', en: '', cs: ''});
  product$            : Observable<any>;
  productSub          : Subscription;
  languageOptions     = ['en', 'sk', 'cs'];
  choosenLanguageSub$ :  BehaviorSubject<string> = new BehaviorSubject('en');

  constructor(private fb: FormBuilder, private store: Store<fromRoot.State>, private apiService: ApiService ) {
     this.createForm();
     this.product$ = this.store.select(fromRoot.getProduct);
    }

  ngOnInit() {
    this.store.dispatch(new actions.GetImages());
    this.images$ = this.store.select(fromRoot.getProductImages).pipe(
      filter(Boolean));

    const uploaderOptions = {
      itemAlias: 'file',
      autoUpload: true
    }

    this.store.dispatch(new actions.SetUploader({options: uploaderOptions}))
    this.apiService.getUploader().subscribe(uploader => {
      this.uploader = uploader;
      this.uploader.onErrorItem = (item, response, status, headers) => this.onErrorItem(item, response, status, headers);
      this.uploader.onSuccessItem = (item, response, status, headers) => this.onSuccessItem(item, response, status, headers);
    })

 }

 ngOnDestroy() {
  if (this.productSub) {
    this.productSub.unsubscribe();
  }
 }

 onSuccessItem(item: FileItem, response: string, status: number, headers: ParsedResponseHeaders): any {
  const parseResponse =  JSON.parse(response);
  if (parseResponse && parseResponse.titleUrl) {
    this.store.dispatch(new actions.GetProductSuccess(parseResponse));
  } else if(parseResponse && parseResponse.all) {
    this.store.dispatch(new actions.AddProductImagesUrlSuccess(parseResponse));
  }
 }

 onErrorItem(item: FileItem, response: string, status: number, headers: ParsedResponseHeaders): any {
   console.log( JSON.parse(response) );
 }

 onEditorChange(value) {
   this.choosenLanguageSub$
    .pipe(filter(Boolean), take(1))
    .subscribe((lang: string) => {
      this.productEditForm.get(lang).patchValue({ descriptionFull: value });
    });
 }

 createForm() {
  this.productEditForm = this.fb.group({
    titleUrl: ['', Validators.required ],
    visibility: 'visible',
    stock: 'onStock',
    onSale: false,
    shiping: 'shiping',
    mainImage: '',
    images: [],
    imageUrl: '',
    ...this._createLangForm(this.languageOptions)
  });
 }


  onRemoveImage(image: string, type: string) {
    const titleUrl = type === 'product'
      ? { titleUrl: this.productEditForm.get('titleUrl').value }
      : {};

    this.store.dispatch(new actions.RemoveProductImage({image: image, ...titleUrl} ));
  }

  setLang(lang: string) {
    this.choosenLanguageSub$.next('');
    from(lang).pipe(delay(100))
      .subscribe(() => {
        this.choosenLanguageSub$.next(lang);
      });


    const prepareDescFull = this.languageOptions
      .map(language => ({
        [language] : typeof this.productEditForm.get([language]).value.descriptionFull === 'string'
         ? this.productEditForm.get([language]).value.descriptionFull
         : this.productEditForm.get([language]).value.descriptionFull.length
          ? this.productEditForm.get([language]).value.descriptionFull[0]
          : ''
      })).reduce((prev, curr) => ({...prev, ...curr}) , {});
    this.descriptionFullSub$.next(prepareDescFull);
 }

 onSubmit() {

   switch (this.action) {
     case 'add':
     this.images$.pipe(first())
      .subscribe(images => {
        if (images && images.length) {
         this.productEditForm.patchValue( { images: images });
        }

        const productPrepare = {...this.productEditForm.value,

          mainImage: { url: this.productEditForm.value.mainImage, name: this.productEditForm.value.titleUrl },
        ...this._prepareProductData(this.languageOptions, this.productEditForm.value)};

        this.store.dispatch(new actions.AddProduct(productPrepare));
    })
     break;

     case 'edit':
     this.images$.pipe(first())
      .subscribe(images => {
        if (images && images.length) {
          this.productEditForm.patchValue( { images: images });
        }

      const editProduct = Object.keys(this.productEditForm.value)
        .filter(key => !!this.productEditForm.value[key])
        .reduce((prev, curr) =>  ({ ...prev, [curr] : this.productEditForm.value[curr] }), {});

      const productPrepare = {...editProduct,
        images: images || [],
        mainImage: { url: this.productEditForm.value.mainImage, name: this.productEditForm.value.titleUrl },
        ...this._prepareProductData(this.languageOptions, editProduct)};

        this.store.dispatch(new actions.EditProduct(productPrepare));
    });
     break;

     case 'remove':
     this.store.dispatch(new actions.RemoveProduct( this.productEditForm.get('titleUrl').value ));
     break;
   }

   this.sendRequest = true;

 }

 addImageUrl() {
  this.store.dispatch(new actions.AddProductImagesUrl( { image: this.productEditForm.get('imageUrl').value, titleUrl: this.productEditForm.get('titleUrl').value }));
 }

 openForm() {
  this.sendRequest = false;
 }

 findProduct() {
   const titleUrl = this.productEditForm.get('titleUrl').value;
   if (titleUrl) {
    this.store.dispatch(new actions.GetProduct(titleUrl));

    this.productSub = this.product$.pipe(
      filter(product => product && product.titleUrl && !product.toBeShow))
      .subscribe((product) => {

      const newForm = {
        titleUrl: product.titleUrl,
        visibility: product.visibility || 'visible',
        stock: product.stock || 'onStock',
        onSale: product.onSale || true,
        shiping: product.shiping || 'shiping',
        mainImage: (product.mainImage && product.mainImage.url) ? product.mainImage.url : '',
        images: product.images,
        imageUrl: product.imageUrl || '',
        ...this.prepareLangEditForm(this.languageOptions, product)
      };

      const uploaderOptions = {
        itemAlias: 'file',
        autoUpload: true
      }

      this.store.dispatch(new actions.SetUploader({options: uploaderOptions, titleUrl: product.titleUrl}))

    const prepareDescFull = this.languageOptions
      .map(lang => ({
        [lang] : product[lang].descriptionFull.length ? product[lang].descriptionFull[0] : ''
      })).reduce((prev, curr) => ({...prev, ...curr}) , {});

      this.descriptionFullSub$.next(prepareDescFull);
      this.productEditForm.setValue(newForm);
    });
   }
 }

 private _createLangForm(languageOptions: Array<string>) {
  return languageOptions
    .map((lang: string) => ({
      [lang] : this.fb.group({
        title: '',
        description: '',
        salePrice: '',
        regularPrice: '',
        tags: '',
        categories: '',
        descriptionFull: ''
      })
    })
  ).reduce((prev, curr) => ({...prev, ...curr}) , {});
 }

 private prepareLangEditForm(languageOptions: Array<string>, product: any) {
    return languageOptions
      .map((lang: string) => ({
        [lang] : {
          title           : product[lang].title || '',
          description     : product[lang].description || '',
          salePrice       : product[lang].salePrice || '',
          regularPrice    : product[lang].regularPrice || '',
          tags            : product[lang].tags
            ? product[lang].tags.reduce((string, tag) => (string ? string + ',' : string) + tag , '')
            : '',
          categories      : product[lang].categories
          ? product[lang].categories.reduce((string, tag) => (string ? string + ',' : string) + tag , '')
          : '',
          descriptionFull : product[lang].descriptionFull || ''
        }
      })
    ).reduce((prev, curr) => ({...prev, ...curr}) , {});

}

  private _prepareProductData(languageOptions: Array<string>, formData: any) {
    return languageOptions
      .map((lang: string) => ({
        [lang] : {
          ...formData[lang],
          tags: formData[lang].tags ? formData[lang].tags.split(',') : [],
          categories: formData[lang].categories ? formData[lang].categories.split(',') : []
        }
      })).reduce((prev, curr) => ({...prev, ...curr}) , {});
  }


}
