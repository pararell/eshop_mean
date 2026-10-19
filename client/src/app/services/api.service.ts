import { toObservable } from '@angular/core/rxjs-interop';
import { WindowService } from './window.service';
import { catchError, map } from 'rxjs/operators';
import { Injectable, PLATFORM_ID, inject, InjectionToken } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { combineLatest, Observable, of } from 'rxjs';
import type {
  AiDraftRequest,
  AiDraftResponse,
  AiStatus,
  CategoryInput,
  ContactRequest,
  CurrentUser,
  Order,
  OrderRequest,
  OrderResult,
  Page,
  Pagination,
  PaymentCompleteResponse,
  PaymentIntentRequest,
  PaymentIntentResponse,
  ProductInput,
  ProductRaw,
  PublicConfigResponse,
  ShopConfig,
  SignInRequest,
  SignInResponse,
  RefundRequest,
  SignUpRequest,
  Theme,
  Translation,
} from '@eshop/shared';

import { environment } from '../../environments/environment';
import { AllCategories, Cart, Category, Product, Translations } from '../shared/models';
import { accessTokenKey } from '../shared/constants';
import { SignalStoreSelectors } from '../store/signal.store.selectors';

/**
 * API calls never throw: an HTTP error is emitted as `{ error }` instead of the response, and
 * callers check `response.error`. The success type is kept for convenience, so on error only
 * `error` is actually present. Note that order responses also carry `error: ''` on success.
 */
export type ApiResponse<T> = T & { error?: unknown };

/** `GET /api/products`, reshaped for the store. */
export interface ProductsResult {
  products: Product[];
  pagination: Pagination;
  maxPrice: number | null;
  minPrice: number | null;
  category?: string;
}

export interface ProductsQuery {
  lang: string;
  page: number | string;
  sort: string;
  category?: string;
  maxPrice?: number;
}

/** Admin image library, or the updated product when an image was attached to one. */
export type ImagesResult = { all: string[] } | ProductRaw;

export interface PagesQuery {
  titles: boolean;
  lang: string;
}

/** Legacy string token provided by the SSR engine (server/src/app-universal.module.ts). */
const SERVER_URL = 'serverUrl' as unknown as InjectionToken<string>;

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly _window = inject(WindowService);
  protected serverUrl = inject(SERVER_URL, { optional: true });
  private platformId = inject(PLATFORM_ID);

  apiUrl = environment.apiUrl;
  requestOptions = {};
  ranNumber = 0;

  constructor() {
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

  /** Maps HTTP errors to `{ error }` values (see ApiResponse). */
  private handle<T>(request: Observable<T>): Observable<ApiResponse<T>> {
    return request.pipe(
      map((response) => response as ApiResponse<T>),
      catchError((error: Error) => of({ error } as ApiResponse<T>)),
    );
  }

  getConfig() {
    const configUrl = this.apiUrl + '/api/eshop/config';
    return this.handle(this.http.get<PublicConfigResponse>(configUrl, this.requestOptions));
  }

  /** A sign-in token is stored (browser only); without one `GET /api/auth` can only answer 401 */
  hasAccessToken(): boolean {
    return isPlatformBrowser(this.platformId) && !!localStorage.getItem(accessTokenKey);
  }

  getUser() {
    const userUrl = this.apiUrl + '/api/auth';
    return this.handle(this.http.get<CurrentUser>(userUrl, this.requestOptions));
  }

  signIn(req: SignInRequest) {
    const sendContact = this.apiUrl + '/api/auth/signin';
    return this.handle(this.http.post<SignInResponse>(sendContact, req, this.requestOptions));
  }

  signUp(req: SignUpRequest) {
    const sendContact = this.apiUrl + '/api/auth/signup';
    return this.handle(this.http.post<unknown>(sendContact, req, this.requestOptions));
  }

  getProducts(req: ProductsQuery): Observable<ApiResponse<ProductsResult>> {
    const { lang, page, sort, category, maxPrice } = req;
    const addCategory = category ? { category } : {};
    const categoryQuery = category ? '&category=' + category : '';
    const priceQuery = maxPrice ? '&maxPrice=' + maxPrice : '';
    const productsUrl = this.apiUrl + '/api/products?lang=' + lang + '&page=' + page + '&sort=' + sort + categoryQuery + priceQuery;
    return this.http
      .get<{ all: Product[]; pagination: Pagination; maxPrice: number | null; minPrice: number | null }>(productsUrl, this.requestOptions)
      .pipe(
        map((data) => ({
          products: data.all.map((product) => ({
            ...product,
            tags: product.tags.filter(Boolean).map((cat: string) => cat.toLowerCase()),
          })),
          pagination: data.pagination,
          maxPrice: data.maxPrice,
          minPrice: data.minPrice,
          ...addCategory,
        })),
        catchError((error: Error) => of({ error } as ApiResponse<ProductsResult>)),
      );
  }

  getCategories(lang: string) {
    const categoriesUrl = this.apiUrl + '/api/products/categories?lang=' + lang;
    return this.handle(this.http.get<Category[]>(categoriesUrl, this.requestOptions));
  }

  getProductsSearch(query: string) {
    const productUrl = this.apiUrl + '/api/products/search?query=' + query;
    return this.handle(this.http.get<string[]>(productUrl, this.requestOptions));
  }

  /** `params` is `<titleUrl>` (admin, raw product) or `<titleUrl>?lang=xx` (localized product). */
  getProduct(params: string) {
    const productUrl = this.apiUrl + '/api/products/' + params;
    return this.handle(this.http.get<Product>(productUrl, this.requestOptions));
  }

  addProduct(product: ProductInput) {
    const addProduct = this.apiUrl + '/api/products/add';
    return this.handle(this.http.post<unknown>(addProduct, product, this.requestOptions));
  }

  editProduct(product: ProductInput) {
    const eidtProduct = this.apiUrl + '/api/products/edit';
    return this.handle(this.http.patch<unknown>(eidtProduct, product, this.requestOptions));
  }

  getAllProducts() {
    const productUrl = this.apiUrl + '/api/products/all';
    return this.handle(this.http.get<Product[]>(productUrl, this.requestOptions));
  }

  removeProduct(name: string) {
    const removeProduct = this.apiUrl + '/api/products/' + name;
    return this.handle(this.http.delete<unknown>(removeProduct, this.requestOptions));
  }

  getAllCategories() {
    const categoriesUrl = this.apiUrl + '/api/products/categories/all';
    return this.handle(this.http.get<AllCategories>(categoriesUrl, this.requestOptions));
  }

  editCategory(category: CategoryInput) {
    const eidtCategory = this.apiUrl + '/api/products/categories/edit';
    return this.handle(this.http.patch<unknown>(eidtCategory, category, this.requestOptions));
  }

  removeCategory(name: string) {
    const removeCategory = this.apiUrl + '/api/products/categories/' + name;
    return this.handle(this.http.delete<unknown>(removeCategory, this.requestOptions));
  }

  /** Card payment, step 1: the server creates (or updates) the order and its PaymentIntent */
  createPaymentIntent(req: PaymentIntentRequest) {
    return this.handle(this.http.post<PaymentIntentResponse>(this.apiUrl + '/api/payments/intent', req, this.requestOptions));
  }

  /** Card payment, after Stripe.js confirmed (or Stripe redirected back): the order's payment state */
  completePayment(orderId: string) {
    return this.handle(this.http.post<PaymentCompleteResponse>(this.apiUrl + '/api/payments/complete', { orderId }, this.requestOptions));
  }

  /** Admin: refund a paid card order (no amount = what is left) */
  refundOrder(orderId: string, req: RefundRequest) {
    return this.handle(this.http.post<Order>(`${this.apiUrl}/api/admin/orders/${encodeURIComponent(orderId)}/refund`, req, this.requestOptions));
  }

  makeOrder(req: OrderRequest) {
    const addOrder = this.apiUrl + '/api/orders/add';
    return this.handle(this.http.post<OrderResult>(addOrder, req, this.requestOptions));
  }

  getUserOrders() {
    const userOrderUrl = this.apiUrl + '/api/orders';
    return this.handle(this.http.get<Order[]>(userOrderUrl, this.requestOptions));
  }

  getOrders() {
    const ordersUrl = this.apiUrl + '/api/orders/all';
    return this.handle(this.http.get<Order[]>(ordersUrl, this.requestOptions));
  }

  getOrder(id: string) {
    const orderUrl = this.apiUrl + '/api/orders/' + id;
    return this.handle(this.http.get<Order>(orderUrl, this.requestOptions));
  }

  updateOrder(req: Partial<Order> & Pick<Order, 'orderId'>) {
    const orderUpdateUrl = this.apiUrl + '/api/orders';
    return this.handle(this.http.patch<Order>(orderUpdateUrl, req, this.requestOptions));
  }

  getCart(lang?: string) {
    const withLangQuery = lang ? '?lang=' + lang : '';
    const cartUrl = this.apiUrl + '/api/cart' + withLangQuery;
    return this.handle(this.http.get<Cart>(cartUrl, this.requestOptions));
  }

  addToCart(params: string) {
    this.ranNumber = this.ranNumber + 1;
    const randomNum = '&random=' + this.ranNumber;
    const addToCartUrl = this.apiUrl + '/api/cart/add' + params + randomNum;
    return this.handle(this.http.get<Cart>(addToCartUrl, this.requestOptions));
  }

  removeFromCart(params: string) {
    this.ranNumber = this.ranNumber + 1;
    const randomNum = '&random=' + this.ranNumber;
    const removeFromCartUrl = this.apiUrl + '/api/cart/remove' + params + randomNum;
    return this.handle(this.http.get<Cart>(removeFromCartUrl, this.requestOptions));
  }

  getLangTranslations(lang: string) {
    const translationsUrl = this.apiUrl + '/api/translations?lang=' + lang;
    return this.handle(this.http.get<Translation | null>(translationsUrl));
  }

  getAllTranslations() {
    const translationsUrl = this.apiUrl + '/api/translations/all';
    return this.handle(this.http.get<Translations[]>(translationsUrl, this.requestOptions));
  }

  editTranslation({ lang, keys }: Pick<Translation, 'lang' | 'keys'>) {
    const translationsUpdateUrl = this.apiUrl + '/api/translations?lang=' + lang;
    return this.handle(this.http.patch<Translation>(translationsUpdateUrl, { keys: keys }, this.requestOptions));
  }

  editAllTranslation(translations: Translations[]) {
    const translationsUpdateUrl = this.apiUrl + '/api/translations/all';
    return this.handle(this.http.patch<unknown[]>(translationsUpdateUrl, translations, this.requestOptions));
  }

  getImages() {
    const getImages = this.apiUrl + '/api/admin/images';
    return this.handle(this.http.get<{ all: string[] }>(getImages, this.requestOptions));
  }

  addProductImagesUrl({ image, titleUrl }: { image: string; titleUrl?: string }) {
    const titleUrlQuery = titleUrl ? '?titleUrl=' + titleUrl : '';
    const addImageUrl = this.apiUrl + '/api/admin/images/add' + titleUrlQuery;
    return this.handle(this.http.post<ImagesResult>(addImageUrl, { image }, this.requestOptions));
  }

  removeImage({ image, titleUrl }: { image: string; titleUrl?: string }) {
    const titleUrlQuery = titleUrl ? '?titleUrl=' + titleUrl : '';
    const removeImage = this.apiUrl + '/api/admin/images/remove' + titleUrlQuery;
    return this.handle(this.http.post<ImagesResult>(removeImage, { image }, this.requestOptions));
  }

  /** Returns undefined during SSR (no upload possible there). */
  uploadImage({ fileToUpload, titleUrl }: { fileToUpload: File; titleUrl?: string }) {
    if (isPlatformBrowser(this.platformId)) {
      const titleUrlQuery = titleUrl ? '?titleUrl=' + titleUrl : '';
      const accessToken = localStorage.getItem(accessTokenKey);
      const formData: FormData = new FormData();
      formData.append('file', fileToUpload);

      let headers = new HttpHeaders();
      headers = headers.set('Authorization', 'Bearer ' + accessToken);
      const sendHeaders = { headers, withCredentials: true };
      const uploadUrl = this.apiUrl + '/api/admin/images/upload' + titleUrlQuery;

      return this.handle(
        this.http.post<ImagesResult>(uploadUrl, formData, {
          reportProgress: true,
          responseType: 'json',
          ...sendHeaders,
        }),
      );
    }
    return undefined;
  }

  /** Whether AI product drafts are enabled on the server (admin only) */
  getAiStatus() {
    return this.handle(this.http.get<AiStatus>(this.apiUrl + '/api/admin/ai/status', this.requestOptions));
  }

  /** AI product draft; unsubscribing cancels the request. Errors come back as `{ error }` (HttpErrorResponse). */
  createAiDraft(req: AiDraftRequest) {
    return this.handle(this.http.post<AiDraftResponse>(this.apiUrl + '/api/admin/products/ai-draft', req, this.requestOptions));
  }

  sendContact(req: ContactRequest) {
    const sendContact = this.apiUrl + '/api/eshop/contact';
    return this.handle(this.http.post<unknown>(sendContact, req, this.requestOptions));
  }

  getPages(query?: PagesQuery) {
    const titlesQueryParams = query ? `?titles=${query.titles}&lang=${query.lang}` : '';
    const pagesUrl = this.apiUrl + '/api/eshop/page/all' + titlesQueryParams;
    return this.handle(this.http.get<Page[]>(pagesUrl, this.requestOptions));
  }

  getPage(query: { titleUrl: string; lang: string }) {
    const pageUrl = this.apiUrl + '/api/eshop/page/' + query.titleUrl + '?lang=' + query.lang;
    return this.handle(this.http.get<Page | null>(pageUrl, this.requestOptions));
  }

  addOrEditPage(pageReq: Page) {
    const pageUrl = this.apiUrl + '/api/eshop/page';
    return this.handle(this.http.post<unknown>(pageUrl, pageReq, this.requestOptions));
  }

  removePage(titleUrl: string) {
    const pageUrl = this.apiUrl + '/api/eshop/page/' + titleUrl;
    return this.handle(this.http.delete<unknown>(pageUrl, this.requestOptions));
  }

  getThemes() {
    const themesUrl = this.apiUrl + '/api/eshop/theme/all';
    return this.handle(this.http.get<Theme[]>(themesUrl, this.requestOptions));
  }

  addOrEditTheme(themeReq: Theme) {
    const themeUrl = this.apiUrl + '/api/eshop/theme';
    return this.handle(this.http.post<unknown>(themeUrl, themeReq, this.requestOptions));
  }

  removeTheme(titleUrl: string) {
    const themeUrl = this.apiUrl + '/api/eshop/theme/' + titleUrl;
    return this.handle(this.http.delete<unknown>(themeUrl, this.requestOptions));
  }

  getConfigs() {
    const configsUrl = this.apiUrl + '/api/eshop/config/all';
    return this.handle(this.http.get<ShopConfig[]>(configsUrl, this.requestOptions));
  }

  addOrEditConfig(configReq: ShopConfig) {
    const configUrl = this.apiUrl + '/api/eshop/config';
    return this.handle(this.http.post<unknown>(configUrl, configReq, this.requestOptions));
  }

  removeConfig(titleUrl: string) {
    const configUrl = this.apiUrl + '/api/eshop/config/' + titleUrl;
    return this.handle(this.http.delete<unknown>(configUrl, this.requestOptions));
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
