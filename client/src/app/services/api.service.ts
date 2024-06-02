import { toObservable } from '@angular/core/rxjs-interop';
import { WindowService } from './window.service';
import { catchError, map } from 'rxjs/operators';
import { Inject, Injectable, Optional, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';

import { environment } from '../../environments/environment';
import { Translations } from '../shared/models';
import { accessTokenKey } from '../shared/constants';
import { SignalStoreSelectors } from '../store/signal.store.selectors';
import { combineLatest, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  apiUrl = environment.apiUrl;
  requestOptions = {};
  ranNumber = 0;

  constructor(
    private readonly http: HttpClient,
    private readonly _window: WindowService,
    @Optional() @Inject('serverUrl') protected serverUrl: string,
    @Inject(PLATFORM_ID)
    private platformId: Object,
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
    return this.http.get(configUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getUser() {
    const userUrl = this.apiUrl + '/api/auth';
    return this.http.get(userUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  signIn(req) {
    const sendContact = this.apiUrl + '/api/auth/signin';
    return this.http.post(sendContact, req, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  signUp(req) {
    const sendContact = this.apiUrl + '/api/auth/signup';
    return this.http.post(sendContact, req, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getProducts(req) {
    const { lang, page, sort, category, maxPrice } = req;
    const addCategory = category ? { category } : {};
    const categoryQuery = category ? '&category=' + category : '';
    const priceQuery = maxPrice ? '&maxPrice=' + maxPrice : '';
    const productsUrl = this.apiUrl + '/api/products?lang=' + lang + '&page=' + page + '&sort=' + sort + categoryQuery + priceQuery;
    return this.http.get(productsUrl, this.requestOptions).pipe(
      map((data: any) => ({
        products: data.all.map((product) => ({
          ...product,
          tags: product.tags.filter(Boolean).map((cat: string) => cat.toLowerCase()),
        })),
        pagination: data.pagination,
        maxPrice: data.maxPrice,
        minPrice: data.minPrice,
        ...addCategory,
      })),
      catchError((error: Error) => of({ error })),
    );
  }

  getCategories(lang: string) {
    const categoriesUrl = this.apiUrl + '/api/products/categories?lang=' + lang;
    return this.http.get(categoriesUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getProductsSearch(query: string) {
    const productUrl = this.apiUrl + '/api/products/search?query=' + query;
    return this.http.get(productUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getProduct(params) {
    const productUrl = this.apiUrl + '/api/products/' + params;
    return this.http.get(productUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  addProduct(product) {
    const addProduct = this.apiUrl + '/api/products/add';
    return this.http.post(addProduct, product, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  editProduct(product) {
    const eidtProduct = this.apiUrl + '/api/products/edit';
    return this.http.patch(eidtProduct, product, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getAllProducts() {
    const productUrl = this.apiUrl + '/api/products/all';
    return this.http.get(productUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  removeProduct(name: string) {
    const removeProduct = this.apiUrl + '/api/products/' + name;
    return this.http.delete(removeProduct, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getAllCategories() {
    const categoriesUrl = this.apiUrl + '/api/products/categories/all';
    return this.http.get(categoriesUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  editCategory(category) {
    const eidtCategory = this.apiUrl + '/api/products/categories/edit';
    return this.http.patch(eidtCategory, category, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  removeCategory(name: string) {
    const removeCategory = this.apiUrl + '/api/products/categories/' + name;
    return this.http.delete(removeCategory, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  handleToken(token) {
    const tokenUrl = this.apiUrl + '/api/orders/stripe';
    return this.http.post(tokenUrl, token, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  makeOrder(req) {
    const addOrder = this.apiUrl + '/api/orders/add';
    return this.http.post(addOrder, req, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getUserOrders() {
    const userOrderUrl = this.apiUrl + '/api/orders';
    return this.http.get(userOrderUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getOrders() {
    const ordersUrl = this.apiUrl + '/api/orders/all';
    return this.http.get(ordersUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getOrder(id: string) {
    const orderUrl = this.apiUrl + '/api/orders/' + id;
    return this.http.get(orderUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  updateOrder(req) {
    const orderUpdateUrl = this.apiUrl + '/api/orders';
    return this.http.patch(orderUpdateUrl, req, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getStripeSession(req) {
    const stripeSessionUrl = this.apiUrl + '/api/orders/stripe/session';
    return this.http.post(stripeSessionUrl, req, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getCart(lang?: string) {
    const withLangQuery = lang ? '?lang=' + lang : '';
    const cartUrl = this.apiUrl + '/api/cart' + withLangQuery;
    return this.http.get(cartUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  addToCart(params: string) {
    this.ranNumber = this.ranNumber + 1;
    const randomNum = '&random=' + this.ranNumber;
    const addToCartUrl = this.apiUrl + '/api/cart/add' + params + randomNum;
    return this.http.get(addToCartUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  removeFromCart(params: string) {
    this.ranNumber = this.ranNumber + 1;
    const randomNum = '&random=' + this.ranNumber;
    const removeFromCartUrl = this.apiUrl + '/api/cart/remove' + params + randomNum;
    return this.http.get(removeFromCartUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getLangTranslations(lang: string) {
    const translationsUrl = this.apiUrl + '/api/translations?lang=' + lang;
    return this.http.get(translationsUrl).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getAllTranslations() {
    const translationsUrl = this.apiUrl + '/api/translations/all';
    return this.http.get(translationsUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  editTranslation({ lang, keys }) {
    const translationsUpdateUrl = this.apiUrl + '/api/translations?lang=' + lang;
    return this.http.patch(translationsUpdateUrl, { keys: keys }, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  editAllTranslation(translations: Translations[]) {
    const translationsUpdateUrl = this.apiUrl + '/api/translations/all';
    return this.http.patch(translationsUpdateUrl, translations, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getImages() {
    const getImages = this.apiUrl + '/api/admin/images';
    return this.http.get(getImages, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  addProductImagesUrl({ image, titleUrl }) {
    const titleUrlQuery = titleUrl ? '?titleUrl=' + titleUrl : '';
    const addImageUrl = this.apiUrl + '/api/admin/images/add' + titleUrlQuery;
    return this.http.post(addImageUrl, { image }, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  removeImage({ image, titleUrl }) {
    const titleUrlQuery = titleUrl ? '?titleUrl=' + titleUrl : '';
    const removeImage = this.apiUrl + '/api/admin/images/remove' + titleUrlQuery;
    return this.http.post(removeImage, { image }, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  uploadImage({ fileToUpload, titleUrl }) {
    if (isPlatformBrowser(this.platformId)) {
      const titleUrlQuery = titleUrl ? '?titleUrl=' + titleUrl : '';
      const accessToken = localStorage.getItem(accessTokenKey);
      const formData: FormData = new FormData();
      formData.append('file', fileToUpload);

      let headers = new HttpHeaders();
      headers = headers.set('Authorization', 'Bearer ' + accessToken);
      const sendHeaders = { headers, withCredentials: true };
      const uploadUrl = this.apiUrl + '/api/admin/images/upload' + titleUrlQuery;

      return this.http
        .post(uploadUrl, formData, {
          reportProgress: true,
          responseType: 'json',
          ...sendHeaders,
        })
        .pipe(
          map((response: any) => response),
          catchError((error: Error) => of({ error })),
        );
    }
  }

  sendContact(req) {
    const sendContact = this.apiUrl + '/api/eshop/contact';
    return this.http.post(sendContact, req, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getPages(query?) {
    const titlesQueryParams = query ? `?titles=${query.titles}&lang=${query.lang}` : '';
    const pagesUrl = this.apiUrl + '/api/eshop/page/all' + titlesQueryParams;
    return this.http.get(pagesUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getPage(query) {
    const pageUrl = this.apiUrl + '/api/eshop/page/' + query.titleUrl + '?lang=' + query.lang;
    return this.http.get(pageUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  addOrEditPage(pageReq) {
    const pageUrl = this.apiUrl + '/api/eshop/page';
    return this.http.post(pageUrl, pageReq, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  removePage(titleUrl: string) {
    const pageUrl = this.apiUrl + '/api/eshop/page/' + titleUrl;
    return this.http.delete(pageUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getThemes() {
    const themesUrl = this.apiUrl + '/api/eshop/theme/all';
    return this.http.get(themesUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  addOrEditTheme(themeReq) {
    const themeUrl = this.apiUrl + '/api/eshop/theme';
    return this.http.post(themeUrl, themeReq, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  removeTheme(titleUrl: string) {
    const themeUrl = this.apiUrl + '/api/eshop/theme/' + titleUrl;
    return this.http.delete(themeUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  getConfigs() {
    const configsUrl = this.apiUrl + '/api/eshop/config/all';
    return this.http.get(configsUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  addOrEditConfig(configReq) {
    const configUrl = this.apiUrl + '/api/eshop/config';
    return this.http.post(configUrl, configReq, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  removeConfig(titleUrl: string) {
    const configUrl = this.apiUrl + '/api/eshop/config/' + titleUrl;
    return this.http.delete(configUrl, this.requestOptions).pipe(
      map((response: any) => response),
      catchError((error: Error) => of({ error })),
    );
  }

  setHeaders() {
    const selectors = inject(SignalStoreSelectors);
    combineLatest([toObservable(selectors.appLang), toObservable(selectors.user)]).subscribe(([lang, user]) => {
      if (user && user.accessToken && isPlatformBrowser(this.platformId)) {
        localStorage.setItem(accessTokenKey, user.accessToken);
      }
      const accessToken = isPlatformBrowser(this.platformId) ? localStorage.getItem(accessTokenKey) : '';
      let headers = new HttpHeaders();
      headers = headers.set('Authorization', 'Bearer ' + accessToken).set('lang', lang);
      this.requestOptions = { headers, withCredentials: true };
    });
  }
}
