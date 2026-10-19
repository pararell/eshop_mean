import { User, Page, Theme, Config, Product, Cart, Category, Order, Pagination, Translations, AllCategories } from '../shared/models';
import { languages, currencyLang } from '../shared/constants';
import { signal, computed, Injectable } from '@angular/core';

/** Before the first load the pagination has no `limit`. */
export type PaginationState = Pick<Pagination, 'page' | 'pages' | 'total'> & Partial<Pagination>;

export interface UserState {
  loading: boolean;
  user: User | null;
  lang: string;
  currency: string;
  error: boolean;
}

export interface EshopState {
  loading: boolean;
  error: string;
  pages: Page[] | null;
  page: Page | null;
  themes: Theme[] | null;
  configs: Config[] | null;
}

export interface ProductState {
  products: Product[] | null;
  loadingProducts: boolean;
  categories: Array<Category>;
  pagination: PaginationState;
  product: Product | null;
  loadingProduct: boolean;
  cart: Cart | null;
  userOrders: Order[] | null;
  order: Order | null;
  productsTitles: Array<string>;
  priceFilter: number;
  maxPrice: number | null;
  minPrice: number | null;
  position: { [component: string]: number } | null;
  loading: boolean;
  error: string;
}

export interface DashboardState {
  orders: Order[] | null;
  order: Order | null;
  productImages: Array<string>;
  translations: Array<Translations>;
  allProducts: Array<Product>;
  allCategories: AllCategories;
  loading: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SignalStoreSelectors {
  public userState = signal<UserState>({
    loading: false,
    user: null,
    lang: languages[0],
    currency: currencyLang['default'],
    error: false,
  });

  public eshopState = signal<EshopState>({
    loading: false,
    error: '',
    pages: null,
    page: null,
    themes: null,
    configs: null,
  });

  public productState = signal<ProductState>({
    products: null,
    loadingProducts: false,
    categories: [],
    pagination: {
      page: 1,
      pages: 1,
      total: 0,
    },
    product: null,
    loadingProduct: false,
    cart: null,
    userOrders: null,
    order: null,
    productsTitles: [],
    priceFilter: 0,
    maxPrice: 0,
    minPrice: 0,
    position: null,
    loading: false,
    error: '',
  });

  public dashboardState = signal<DashboardState>({
    orders: null,
    order: null,
    productImages: [],
    translations: [],
    allProducts: [],
    allCategories: [],
    loading: false,
  });

  public readonly user = computed(() => this.userState().user);
  public readonly appLang = computed(() => this.userState().lang);
  public readonly currency = computed(() => this.userState().currency);
  public readonly authLoading = computed(() => this.userState().loading);
  /** The last sign-in failed (wrong email or password) */
  public readonly authError = computed(() => this.userState().error);

  public readonly eshopLoading = computed(() => this.eshopState().loading);
  public readonly eshopError = computed(() => this.eshopState().error);
  public readonly pages = computed(() => this.eshopState().pages);
  public readonly page = computed(() => this.eshopState().page);
  public readonly themes = computed(() => this.eshopState().themes);
  public readonly configs = computed(() => this.eshopState().configs);

  public readonly products = computed(() => this.productState().products);
  public readonly loadingProducts = computed(() => this.productState().loadingProducts);
  public readonly categories = computed(() => this.productState().categories);
  public readonly pagination = computed(() => this.productState().pagination);
  public readonly product = computed(() => this.productState().product);
  public readonly cart = computed(() => this.productState().cart);
  public readonly productLoading = computed(() => this.productState().loadingProduct);
  public readonly userOrders = computed(() => this.productState().userOrders);
  public readonly order = computed(() => this.productState().order);
  public readonly productsTitles = computed(() => this.productState().productsTitles);
  public readonly priceFilter = computed(() => this.productState().priceFilter);
  public readonly maxPrice = computed(() => this.productState().maxPrice);
  public readonly minPrice = computed(() => this.productState().minPrice);
  public readonly position = computed(() => this.productState().position);

  public readonly orders = computed(() => this.dashboardState().orders);
  public readonly dashboardOrder = computed(() => this.dashboardState().order);
  public readonly productImages = computed(() => this.dashboardState().productImages);
  public readonly translations = computed(() => this.dashboardState().translations);
  public readonly allProducts = computed(() => this.dashboardState().allProducts);
  public readonly allCategories = computed(() => this.dashboardState().allCategories);
  public readonly dashboardLoading = computed(() => this.dashboardState().loading);
}
