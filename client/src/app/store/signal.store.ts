import { SignalStoreSelectors } from './signal.store.selectors';
import { Injectable } from '@angular/core';
import type {
  CategoryInput,
  ContactRequest,
  OrderRequest,
  ProductInput,
  ShopConfig,
  SignInRequest,
  SignUpRequest,
  StripeOrderRequest,
} from '@eshop/shared';
import { ApiService, PagesQuery, ProductsQuery } from '../services/api.service';
import { Cart, Order, Page, Product, Theme, Translations, User } from '../shared/models';

/**
 * Marks an existing state update whose value does not have the slot's declared type
 * (e.g. a single save result written into a list). Kept as-is to preserve behavior; see
 * docs/audit.md BUG-28. Type-only: returns its argument unchanged.
 */
const keepAsIs = <T>(value: unknown): T => value as T;

@Injectable({
  providedIn: 'root',
})
export class SignalStore {
  constructor(
    private apiService: ApiService,
    private selectors: SignalStoreSelectors,
  ) {}

  signIn = (payload: SignInRequest) => {
    this.selectors.userState.update((state) => ({ ...state, loading: true }));
    this.apiService.signIn(payload).subscribe((response) => {
      // Known bug (audit BUG-05): an error response is stored as the user
      this.selectors.userState.update((state) => ({ ...state, user: response, loading: false }));
    });
  };

  signUp = (payload: SignUpRequest) => {
    this.selectors.userState.update((state) => ({ ...state, loading: true }));
    this.apiService.signUp(payload).subscribe(() => {
      this.selectors.userState.update((state) => ({ ...state, loading: false }));
    });
  };

  getUser = () => {
    this.selectors.userState.update((state) => ({ ...state, loading: true }));
    this.apiService.getUser().subscribe((response) => {
      if (response.error) {
        this.selectors.userState.update((state) => ({ ...state, loading: false }));
        return;
      }
      this.selectors.userState.update((state) => ({ ...state, user: response, loading: false }));
    });
  };

  /** After the Google redirect only `{ accessToken }` is known until getUser() completes. */
  storeUser = (payload: User | Pick<User, 'accessToken'> | null) => {
    this.selectors.userState.update((state) => ({ ...state, user: keepAsIs<User | null>(payload), loading: false }));
  };

  changeLanguage = (payload: { lang: string; currency: string }) => {
    this.selectors.userState.update((state) => ({ ...state, lang: payload.lang, currency: payload.currency }));
  };

  sendContact = (payload: ContactRequest) => {
    this.selectors.eshopState.update((state) => ({ ...state, loading: true }));
    this.apiService.sendContact(payload).subscribe(() => {
      this.selectors.eshopState.update((state) => ({ ...state, loading: false }));
    });
  };

  getPages = (payload?: PagesQuery) => {
    this.apiService.getPages(payload).subscribe((response) => {
      this.selectors.eshopState.update((state) => ({ ...state, pages: response }));
    });
  };

  getPage = (payload: { titleUrl: string; lang: string }) => {
    this.apiService.getPage(payload).subscribe((response) => {
      this.selectors.eshopState.update((state) => ({ ...state, page: response }));
    });
  };

  addOrEditPage = (payload: Page) => {
    this.apiService.addOrEditPage(payload).subscribe((response) => {
      this.selectors.eshopState.update((state) => ({ ...state, page: keepAsIs<Page>(response) }));
    });
  };

  removePage = (payload: string) => {
    this.apiService.removePage(payload).subscribe((response) => {
      this.selectors.eshopState.update((state) => ({ ...state, page: keepAsIs<Page>(response) }));
    });
  };

  getThemes = () => {
    this.apiService.getThemes().subscribe((response) => {
      this.selectors.eshopState.update((state) => ({ ...state, themes: response }));
    });
  };

  addOrEditTheme = (payload: Theme) => {
    this.apiService.addOrEditTheme(payload).subscribe((response) => {
      this.selectors.eshopState.update((state) => ({ ...state, themes: keepAsIs<Theme[]>(response) }));
    });
  };

  removeTheme = (payload: string) => {
    this.apiService.removeTheme(payload).subscribe((response) => {
      this.selectors.eshopState.update((state) => ({ ...state, themes: keepAsIs<Theme[]>(response) }));
    });
  };

  getConfigs = () => {
    this.apiService.getConfigs().subscribe((response) => {
      this.selectors.eshopState.update((state) => ({ ...state, configs: response }));
    });
  };

  addOrEditConfig = (payload: ShopConfig) => {
    this.apiService.addOrEditConfig(payload).subscribe((response) => {
      this.selectors.eshopState.update((state) => ({ ...state, configs: keepAsIs<ShopConfig[]>(response) }));
    });
  };

  removeConfig = (payload: string) => {
    this.apiService.removeConfig(payload).subscribe((response) => {
      this.selectors.eshopState.update((state) => ({ ...state, configs: keepAsIs<ShopConfig[]>(response) }));
    });
  };

  getProducts = (payload: ProductsQuery) => {
    this.selectors.productState.update((state) => ({ ...state, loadingProducts: true }));
    this.apiService.getProducts(payload).subscribe((response) => {
      if (response.error) {
        this.selectors.productState.update((state) => ({ ...state, loadingProducts: false }));
        return;
      }
      this.selectors.productState.update((state) => ({
        ...state,
        products: response.products,
        pagination: response.pagination,
        maxPrice: response.maxPrice,
        minPrice: response.minPrice,
        loadingProducts: false,
      }));
    });
  };

  getCategories = (payload: string) => {
    this.apiService.getCategories(payload).subscribe((response) => {
      this.selectors.productState.update((state) => ({ ...state, categories: response }));
    });
  };

  getProduct = (payload: string) => {
    this.selectors.productState.update((state) => ({ ...state, loadingProduct: true }));
    this.apiService.getProduct(payload).subscribe((response) => {
      this.selectors.productState.update((state) => ({ ...state, product: response, loadingProduct: false }));
    });
  };

  getProductSearch = (payload: string) => {
    this.apiService.getProductsSearch(payload).subscribe((response) => {
      this.selectors.productState.update((state) => ({ ...state, productsTitles: response }));
    });
  };

  getCart = (payload?: string) => {
    this.apiService.getCart(payload).subscribe((response) => {
      this.selectors.productState.update((state) => ({ ...state, cart: response }));
    });
  };

  addToCart = (payload: string) => {
    this.apiService.addToCart(payload).subscribe((response) => {
      this.selectors.productState.update((state) => ({ ...state, cart: response }));
    });
  };

  removeFromCart = (payload: string) => {
    this.apiService.removeFromCart(payload).subscribe((response) => {
      this.selectors.productState.update((state) => ({ ...state, cart: response }));
    });
  };

  makeOrder = (payload: OrderRequest) => {
    this.selectors.productState.update((state) => ({ ...state, loading: true }));
    this.apiService.makeOrder(payload).subscribe((response) => {
      // Known bug (audit BUG-04): no return here, so the update below overwrites the error
      if (response.error || !response) {
        this.selectors.productState.update((state) => ({
          ...state,
          order: null,
          error: 'ORDER_SUBMIT_ERROR',
          loading: false,
        }));
      }
      this.selectors.productState.update((state) => ({
        ...state,
        order: response.result,
        // On success the server returns an empty session cart ({ items: [] })
        cart: keepAsIs<Cart>(response.cart),
        error: response.error,
        loading: false,
      }));
    });
  };

  makeOrderWithPayment = (payload: StripeOrderRequest) => {
    this.selectors.productState.update((state) => ({ ...state, loading: true }));
    this.apiService.handleToken(payload).subscribe((response) => {
      // Known bug (audit BUG-04): no return here, so the update below overwrites the error
      if (response.error || !response) {
        this.selectors.productState.update((state) => ({
          ...state,
          order: null,
          error: 'ORDER_SUBMIT_ERROR',
          loading: false,
        }));
      }
      this.selectors.productState.update((state) => ({
        ...state,
        order: response.result,
        cart: keepAsIs<Cart>(response.cart),
        error: response.error,
        loading: false,
      }));
    });
  };

  getStripeSession = (payload: unknown) => {
    this.apiService.getStripeSession(payload);
  };

  getUserOrders = () => {
    this.apiService.getUserOrders().subscribe((response) => {
      this.selectors.productState.update((state) => ({ ...state, userOrders: response }));
    });
  };

  filterPrice = (payload: number) => {
    this.selectors.productState.update((state) => ({ ...state, priceFilter: payload }));
  };

  updatePosition = (payload: { [component: string]: number }) => {
    this.selectors.productState.update((state) => ({ ...state, position: payload }));
  };

  cleanError = () => {
    this.selectors.productState.update((state) => ({ ...state, order: null, error: '' }));
  };

  getOrders = () => {
    this.apiService.getOrders().subscribe((response) => {
      this.selectors.dashboardState.update((state) => ({ ...state, orders: response }));
    });
  };

  getOrder = (payload: string) => {
    this.apiService.getOrder(payload).subscribe((response) => {
      this.selectors.dashboardState.update((state) => ({ ...state, order: response }));
      this.selectors.productState.update((state) => ({ ...state, order: response }));
    });
  };

  addProduct = (payload: ProductInput) => {
    this.apiService.addProduct(payload).subscribe((response) => {
      this.selectors.dashboardState.update((state) => ({ ...state, allProducts: keepAsIs<Product[]>(response) }));
    });
  };

  editProduct = (payload: ProductInput) => {
    this.selectors.dashboardState.update((state) => ({ ...state, loading: true }));
    this.apiService.editProduct(payload).subscribe(() => {
      this.selectors.dashboardState.update((state) => ({ ...state, loading: false }));
    });
  };

  removeProduct = (payload: string) => {
    this.selectors.dashboardState.update((state) => ({ ...state, loading: true }));
    this.apiService.removeProduct(payload).subscribe(() => {
      this.selectors.dashboardState.update((state) => ({ ...state, loading: false }));
    });
  };

  storeProduct = (payload: unknown) => {
    this.selectors.productState.update((state) => ({ ...state, product: keepAsIs<Product | null>(payload), loadingProduct: false }));
  };

  getAllProducts = () => {
    this.apiService.getAllProducts().subscribe((response) => {
      this.selectors.dashboardState.update((state) => ({ ...state, allProducts: response }));
    });
  };

  getAllCategories = () => {
    this.apiService.getAllCategories().subscribe((response) => {
      this.selectors.dashboardState.update((state) => ({ ...state, allCategories: response }));
    });
  };

  editCategory = (payload: CategoryInput) => {
    this.apiService.editCategory(payload).subscribe((response) => {
      console.log(response);
    });
  };

  removeCategory = (payload: string) => {
    this.apiService.removeCategory(payload).subscribe((response) => {
      console.log(response);
    });
  };

  getImages = () => {
    this.apiService.getImages().subscribe((response) => {
      if (response.error) {
        return;
      }
      this.selectors.dashboardState.update((state) => ({ ...state, productImages: response.all }));
    });
  };

  addProductImagesUrl = (payload: { image: string; titleUrl?: string }) => {
    this.apiService.addProductImagesUrl(payload).subscribe((result) => {
      const response = result as typeof result & { titleUrl?: string; all?: string[] };
      if (response.error) {
        return;
      }
      if (response && response.titleUrl) {
        this.selectors.productState.update((state) => ({ ...state, product: keepAsIs<Product>(response) }));
      }
      this.selectors.dashboardState.update((state) => ({ ...state, productImages: keepAsIs<string[]>(response.all) }));
    });
  };

  removeImage = (payload: { image: string; titleUrl?: string }) => {
    this.apiService.removeImage(payload).subscribe((result) => {
      const response = result as typeof result & { titleUrl?: string; all?: string[] };
      if (response && response.titleUrl) {
        this.selectors.productState.update((state) => ({ ...state, product: keepAsIs<Product>(response) }));
      }
      this.selectors.dashboardState.update((state) => ({ ...state, productImages: keepAsIs<string[]>(response.all) }));
    });
  };

  storeProductImages = (payload: { all: string[] }) => {
    this.selectors.dashboardState.update((state) => ({ ...state, productImages: payload.all }));
  };

  updateOrder = (payload: Partial<Order> & Pick<Order, 'orderId'>) => {
    this.apiService.updateOrder(payload).subscribe((response) => {
      this.selectors.dashboardState.update((state) => ({ ...state, order: response }));
    });
  };

  getAllTranslations = () => {
    this.apiService.getAllTranslations().subscribe((response) => {
      this.selectors.dashboardState.update((state) => ({ ...state, translations: response }));
    });
  };

  editTranslation = (payload: Translations[]) => {
    this.selectors.dashboardState.update((state) => ({ ...state, loading: true }));
    this.apiService.editAllTranslation(payload).subscribe((result) => {
      // Known bug (audit BUG-12): the response is an array, so `_id` never matches
      const response = keepAsIs<Translations>(result);
      this.selectors.dashboardState.update((state) => ({
        ...state,
        loading: false,
        translations: state.translations.map((trans) => (trans._id === response._id ? response : trans)),
      }));
    });
  };
}
