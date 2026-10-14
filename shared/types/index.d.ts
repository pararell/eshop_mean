/**
 * Data shapes shared by the client (client/) and the server (server/).
 *
 * Type-only (.d.ts): import with `import type { ... } from '@eshop/shared'`. Nothing here exists at
 * runtime, so it works in every build (Angular/esbuild, Nest tsc, Jest/SWC) without path mapping
 * at runtime. Shapes mirror the Mongoose schemas in server/src/** /schemas and the JSON the API
 * returns; see docs/architecture.md.
 */

// ---------------------------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------------------------

/** Languages with content sub-documents (server/src/shared/constans.ts `languages`). */
export type LanguageCode = 'en' | 'sk' | 'cs';

/** Translatable content: one sub-document per language, e.g. `product.en.title`. */
export type ByLanguage<T> = Partial<Record<LanguageCode, T>>;

export type ShippingType = 'basic' | 'extended';

export interface Image {
  url: string;
  name: string;
}

/** Dates are Date objects on the server and ISO strings once serialized to JSON. */
export type DateValue = Date | string;

// ---------------------------------------------------------------------------------------------
// Products and categories
// ---------------------------------------------------------------------------------------------

export interface ProductLangInfo {
  title: string;
  description: string;
  /** HTML fragments from the rich-text editor */
  descriptionFull: string[];
  regularPrice: number;
  /** The price customers pay (major currency units, e.g. 19.99) */
  salePrice: number;
  onSale: boolean;
  /** Free text, e.g. 'onStock' | 'onWaitings' | 'unavailable'; not a quantity */
  stock: string;
  visibility: boolean;
  shipping: ShippingType | string;
}

/** Language-independent product fields. */
export interface ProductBase {
  _id: string;
  /** Slug; the de-facto unique key */
  titleUrl: string;
  mainImage: Image;
  images: string[];
  /** Category `titleUrl`s */
  tags: string[];
  _user?: string;
  dateAdded?: DateValue;
}

/** Product as stored, and as returned to admins (`GET /api/products/all`, `/:name` without lang). */
export type ProductRaw = ProductBase & ByLanguage<ProductLangInfo>;

/** Body of admin `POST /api/products/add` and `PATCH /api/products/edit`. */
export type ProductInput = Omit<ProductRaw, '_id'> & { _id?: string };

/** Product flattened for one language (`GET /api/products`, `/:name?lang=`). */
export type LocalizedProduct = ProductBase & ProductLangInfo;

export interface CategoryLangInfo {
  title: string;
  description: string;
  position?: number;
  visibility: boolean;
  menuHidden?: boolean;
}

export interface CategoryBase {
  _id?: string;
  titleUrl: string;
  mainImage?: Image & { type?: boolean };
  subCategories?: string[];
  _user?: string;
  dateAdded?: DateValue;
}

/** Category as stored (admin endpoints). */
export type CategoryRaw = CategoryBase & ByLanguage<CategoryLangInfo>;

/** Body of admin `PATCH /api/products/categories/edit`. */
export type CategoryInput = CategoryRaw;

/** Category flattened for one language (`GET /api/products/categories`). */
export interface LocalizedCategory extends CategoryBase {
  title: string;
  description: string;
  visibility: boolean;
  menuHidden: boolean;
}

/** `GET /api/products/categories/all` */
export interface CategoryWithProducts {
  category: CategoryRaw;
  productsWithCategory: string[];
}

export interface Pagination {
  total: number;
  limit: number;
  page: number;
  pages: number;
}

/** `GET /api/products` */
export interface ProductsPage {
  all: LocalizedProduct[];
  pagination: Pagination;
  maxPrice: number | null;
  minPrice: number | null;
}

export type ProductSort = 'newest' | 'oldest' | 'priceasc' | 'pricedesc';

// ---------------------------------------------------------------------------------------------
// Cart (lives in the server session)
// ---------------------------------------------------------------------------------------------

/** Item as kept in `session.cart` (a snapshot of the product document). */
export interface SessionCartItem {
  id: string;
  qty: number;
  item: ProductRaw;
}

export interface SessionCart {
  items: SessionCartItem[];
}

export interface LocalizedCartItem {
  id: string;
  qty: number;
  price: number;
  shipingCostType: string;
  item: LocalizedProduct;
}

/** Cart as returned by `/api/cart*` and stored on orders. `totalPrice` includes shipping. */
export interface LocalizedCart {
  items: LocalizedCartItem[];
  totalQty: number;
  totalPrice: number;
  shippingCost: number;
  shippingLimit: number;
  /** 'basic' | 'extended' | 'free', or '' for an empty cart */
  shippingType: string;
}

// ---------------------------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------------------------

export type OrderStatus = 'NEW' | 'PAID' | 'SHIPPING' | 'COMPLETED' | 'CANCELED';

export type OrderType = 'PAYMENT_ON_DELIVERY' | 'WITH_PAYMENT';

export interface Address {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  zip: string;
  country: string;
  region?: string;
}

export interface Order {
  _id?: string;
  orderId: string;
  /** Total incl. shipping, major currency units */
  amount: number;
  amount_refunded?: number;
  currency: string;
  cart: LocalizedCart;
  status: OrderStatus;
  type?: OrderType | string;
  customerEmail: string;
  addresses: Address[];
  notes?: string;
  description?: string;
  outcome?: { seller_message: string };
  cardId?: string;
  _user?: string;
  dateAdded: DateValue;
}

/** Body of `POST /api/orders/add` (cash on delivery). */
export interface OrderRequest {
  email: string;
  addresses: Address[];
  currency: string;
  amount?: number | string;
  notes?: string;
  userId?: string;
  cardId?: string;
}

/** Body of `POST /api/orders/stripe`. */
export interface StripeOrderRequest extends OrderRequest {
  token: { id: string };
}

/** Response of `POST /api/orders/add` and `/stripe`. */
export interface OrderResult {
  error: string;
  result: Order | null;
  cart: LocalizedCart | SessionCart;
}

// ---------------------------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------------------------

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest extends SignInRequest {
  name?: string;
}

/** `POST /api/auth/signin` */
export interface SignInResponse {
  accessToken: string;
  id: string;
  email: string;
  roles?: string[];
}

/** `GET /api/auth` */
export interface CurrentUser {
  id: string;
  email: string;
  roles?: string[];
}

// ---------------------------------------------------------------------------------------------
// Shop content
// ---------------------------------------------------------------------------------------------

export interface Translation {
  _id?: string;
  lang: string;
  keys: Record<string, string>;
}

export interface PageLangInfo {
  title: string;
  contentHTML: string;
}

export type Page = { _id?: string; titleUrl: string; dateAdded?: DateValue } & ByLanguage<PageLangInfo>;

export interface ThemeStyles {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  mainBackground?: string;
  freeShippingPromo?: string;
  promoSlideBackground?: string;
  promoSlideVideo?: string;
  promoSlideBackgroundPosition?: string;
  promo?: string;
  logo?: string;
  [key: string]: string | undefined;
}

export interface Theme {
  _id?: string;
  titleUrl: string;
  dateAdded?: DateValue;
  active: boolean;
  styles: ThemeStyles;
}

export interface ShippingCostRule {
  cost: number;
  /** Free shipping from this subtotal */
  limit: number;
}

export interface ShippingCost {
  basic: ShippingCostRule;
  extended: ShippingCostRule;
}

export type ShopConfig = {
  _id?: string;
  titleUrl: string;
  dateAdded?: DateValue;
  active: boolean;
} & ByLanguage<{ shippingCost: ShippingCost }>;

/** `GET /api/eshop/config`: base64 JSON of the public `FE_*` env values and active theme styles. */
export interface PublicConfigResponse {
  config: string;
}

export interface ContactRequest {
  email: string;
  name?: string;
  notes?: string;
  token: string;
}
