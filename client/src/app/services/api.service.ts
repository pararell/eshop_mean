import { WindowService } from './window.service';
import { map, filter } from 'rxjs/operators';
import { Inject, Injectable, Optional, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { FileUploader } from 'ng2-file-upload';
import { Observable, BehaviorSubject} from 'rxjs';
import { Store } from '@ngrx/store';

import * as fromRoot from '../store/reducers';
import { environment } from '../../environments/environment';
import { Translations, Pagination } from '../shared/models';
import { countryLang, accessTokenKey } from '../shared/constants';



@Injectable({
  providedIn: 'root'
})
export class ApiService {

  apiUrl = environment.apiUrl;
  uploaderSub : BehaviorSubject<FileUploader> = new BehaviorSubject(null);
  requestOptions = {};

  constructor(
    private readonly http     : HttpClient,
    private readonly _window  : WindowService,
    private store     : Store<fromRoot.State>,
    @Optional() @Inject('serverUrl') protected serverUrl: string,
    @Inject(PLATFORM_ID)
    private platformId: Object
    ) {

    this.setHeaders();

    if (environment.production) {
      if (isPlatformServer(this.platformId)) {
        this.apiUrl = this.serverUrl || '';
      }

      if (isPlatformBrowser(this.platformId)) {
        this.apiUrl = this._window.location.origin || '';
      }
    }
  }

  getConfig() {
    const configUrl = this.apiUrl + '/api/eshop/config';
    return this.http.get(configUrl, this.requestOptions);
  }

  getUser() {
    const userUrl = this.apiUrl + '/api/auth';
    return this.http.get(userUrl, this.requestOptions);
  }

  handleToken(token) {
    const tokenUrl = this.apiUrl + '/api/orders/stripe';
    return this.http.post(tokenUrl, token, this.requestOptions);
  };

  makeOrder(req) {
    const addOrder = this.apiUrl + '/api/orders/add';
    return this.http.post(addOrder, req, this.requestOptions)
  }

  signIn(req) {
    const sendContact = this.apiUrl + '/api/auth/signin';
    return this.http.post(sendContact, req, this.requestOptions)
  }

  signUp(req) {
    const sendContact = this.apiUrl + '/api/auth/signup';
    return this.http.post(sendContact, req, this.requestOptions);
  }

  getProducts(req) {
    const {lang, page, sort, category, maxPrice} = req;
    const addCategory = category ? {category} : {};
    const categoryQuery = category ? '&category=' + category : '';
    const priceQuery = maxPrice ? '&maxPrice=' + maxPrice : '';
    const productsUrl = this.apiUrl + '/api/products?lang=' + lang + '&page=' + page + '&sort=' + sort + categoryQuery + priceQuery;
    return this.http.get(productsUrl, this.requestOptions).pipe(map((data: any) => ({
        products : data.all
          .map(product =>
            ({...product,
              tags: product.tags.filter(Boolean).map((cat: string) => cat.toLowerCase())
          })),
        pagination: data.pagination,
        maxPrice: data.maxPrice,
        minPrice: data.minPrice,
        ...addCategory
    })))
  }

  getCategories(lang: string) {
    const categoriesUrl = this.apiUrl + '/api/products/categories?lang=' + lang;
    return this.http.get(categoriesUrl, this.requestOptions);
  }

  getProductsSearch(query: string) {
    const productUrl = this.apiUrl + '/api/products/search?query=' + query;
    return this.http.get(productUrl, this.requestOptions);
  }

  getProduct(params) {
    const productUrl = this.apiUrl + '/api/products/' + params;
    return this.http.get(productUrl, this.requestOptions);
  }

  addProduct(product) {
    const addProduct = this.apiUrl + '/api/products/add';
    return this.http.post(addProduct, product, this.requestOptions);
  }

  editProduct(product) {
    const eidtProduct = this.apiUrl + '/api/products/edit';
    return this.http.patch(eidtProduct, product, this.requestOptions);
  }

  getAllProducts() {
    const productUrl = this.apiUrl + '/api/products/all';
    return this.http.get(productUrl, this.requestOptions);
  }

  removeProduct(name: string) {
    const removeProduct = this.apiUrl + '/api/products/' + name;
    return this.http.delete(removeProduct, this.requestOptions);
  }

  getAllCategories() {
    const categoriesUrl = this.apiUrl + '/api/products/categories/all';
    return this.http.get(categoriesUrl, this.requestOptions);
  }

  editCategory(category) {
    const eidtCategory = this.apiUrl + '/api/products/categories/edit';
    return this.http.patch(eidtCategory, category, this.requestOptions);
  }

  removeCategory(name: string) {
    const removeCategory = this.apiUrl + '/api/products/categories/' + name;
    return this.http.delete(removeCategory, this.requestOptions);
  }

  getUserOrders() {
    const userOrderUrl = this.apiUrl + '/api/orders';
    return this.http.get(userOrderUrl, this.requestOptions);
  }

  getOrders() {
    const ordersUrl = this.apiUrl + '/api/orders/all';
    return this.http.get(ordersUrl, this.requestOptions);
  }

  getOrder(id: string) {
    const orderUrl = this.apiUrl + '/api/orders/' + id;
    return this.http.get(orderUrl, this.requestOptions);
  }

  updateOrder(req) {
    const orderUpdateUrl = this.apiUrl + '/api/orders';
    return this.http.patch(orderUpdateUrl, req, this.requestOptions);
  }

  getStripeSession(req) {
    const stripeSessionUrl = this.apiUrl + '/api/orders/stripe/session';
    return this.http.post(stripeSessionUrl, req, this.requestOptions);
  }

  getCart() {
    const cartUrl = this.apiUrl + '/api/cart/';
    return this.http.get(cartUrl, this.requestOptions);
  }

  addToCart(params: string) {
    const addToCartUrl = this.apiUrl + '/api/cart/add' + params;
    return this.http.get(addToCartUrl, this.requestOptions);
  }

  removeFromCart(params: string) {
    const removeFromCartUrl = this.apiUrl + '/api/cart/remove' + params;
    return this.http.get(removeFromCartUrl, this.requestOptions);
  }

  getLangTranslations(lang: string) {
    const translationsUrl = this.apiUrl + '/api/translations?lang=' + lang;
    return this.http.get(translationsUrl);
  }

  getAllTranslations() {
    const translationsUrl = this.apiUrl + '/api/translations/all';
    return this.http.get(translationsUrl, this.requestOptions);
  }

  editTranslation({lang, keys}) {
    const translationsUpdateUrl = this.apiUrl + '/api/translations?lang=' + lang;
    return this.http.patch(translationsUpdateUrl, { keys : keys }, this.requestOptions);
  }

  editAllTranslation(translations: Translations[]) {
    const translationsUpdateUrl = this.apiUrl + '/api/translations/all';
    return this.http.patch(translationsUpdateUrl, translations, this.requestOptions);
  }

  getImages() {
    const getImages = this.apiUrl + '/api/admin/images';
    return this.http.get(getImages, this.requestOptions);
  }

  addProductImagesUrl({image, titleUrl}) {
    const titleUrlQuery = titleUrl ? '?titleUrl=' + titleUrl : '';
    const addImageUrl = this.apiUrl + '/api/admin/images/add' + titleUrlQuery;
    return this.http.post(addImageUrl, { image }, this.requestOptions);
  }

  removeImage({image, titleUrl}) {
    const titleUrlQuery = titleUrl ? '?titleUrl=' + titleUrl : '';
    const removeImage = this.apiUrl + '/api/admin/images/remove' + titleUrlQuery;
    return this.http.post(removeImage, { image }, this.requestOptions);
  }

  getUploader() {
    return this.uploaderSub.asObservable();
  }

  setUploader({options, titleUrl}): Observable<any> {
    if (isPlatformBrowser(this.platformId)) {
      const titleUrlQuery = titleUrl ? '?titleUrl=' + titleUrl : '';
      const accessToken = localStorage.getItem(accessTokenKey);
      const authorizationHeader = accessToken ? {name: 'Authorization', value: 'Bearer ' + accessToken } : {};

      this.uploaderSub.next(new FileUploader({
        url: this.apiUrl + '/api/admin/images/upload' + titleUrlQuery,
        headers: [{name: 'Accept', value: 'application/json', ...authorizationHeader}],
        ...options
    }));

    return this.uploaderSub.asObservable();
    }
  }

  sendContact(req) {
    const sendContact = this.apiUrl + '/api/eshop/contact';
    return this.http.post(sendContact, req, this.requestOptions);
  }

  getPages() {
    const pagesUrl = this.apiUrl + '/api/eshop/page/all';
    return this.http.get(pagesUrl, this.requestOptions);
  }

  addOrEditPage(pageReq) {
    const pageUrl = this.apiUrl + '/api/eshop/page';
    return this.http.post(pageUrl, pageReq, this.requestOptions);
  }

  removePage(titleUrl: string) {
    const pageUrl = this.apiUrl + '/api/eshop/page/' + titleUrl;
    return this.http.delete(pageUrl, this.requestOptions);
  }

  setHeaders() {
    this.store.select(fromRoot.getLang)
      .subscribe(lang => {
        const accessToken = isPlatformBrowser(this.platformId) ? localStorage.getItem(accessTokenKey) : '';
        let headers = new HttpHeaders();
        headers = headers.set('Authorization', 'Bearer ' + accessToken).set('lang', lang);
        this.requestOptions = { headers, withCredentials: true };
      })
  }


}
