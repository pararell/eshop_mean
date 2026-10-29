/**
 * Data shapes shared by the client (client/) and the server (server/).
 *
 * Type-only (.d.ts): import with `import type { ... } from '@eshop/shared'`. Nothing here exists at
 * runtime, so it works in every build (Angular/esbuild, Nest tsc, Jest/SWC) without path mapping
 * at runtime. Shapes are the JSON the API returns (built by server/src/db/mappers.ts); see
 * docs/architecture.md.
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
  /** Page <title>; empty falls back to `title` */
  seoTitle?: string;
  /** <meta name="description">; empty falls back to `description` */
  metaDescription?: string;
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

// AI product drafts (POST /api/admin/products/ai-draft, docs/ai.md) -----------------------------

export interface AiStatus {
  enabled: boolean;
  provider?: string;
  model?: string;
}

export interface AiDraftRequest {
  /** Cloudinary URLs of uploaded product images; at most 3 are sent to the model */
  imageUrls?: string[];
  text?: string;
  supplierText?: string;
}

/** AI-written texts for one language. Prices, stock, visibility and shipping are never set. */
export interface AiLanguageDraft {
  title: string;
  description: string;
  descriptionFull: string[];
  seoTitle: string;
  metaDescription: string;
}

export type AiProductDraft = {
  titleUrl: string;
  /** Existing category titleUrls only */
  tags: string[];
  images: string[];
  mainImage: Image;
} & ByLanguage<AiLanguageDraft>;

export interface AiDraftResponse {
  draft: AiProductDraft;
  /** New category names the admin may add; never applied automatically */
  suggestedCategories: string[];
  warnings: string[];
  usage: AiUsageSummary;
}

/** What a draft cost (all attempts together) */
export interface AiUsageSummary {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
}

/** `POST /api/admin/themes/ai-draft` (admin): a few words about the shop's look */
export interface AiThemeDraftRequest {
  brief: string;
}

/** An AI theme proposal for the theme editor; never saved by the server */
export interface AiThemeDraft {
  primaryColor: string;
  heroTint: 'none' | 'warm';
  /** May be empty */
  shopName: string;
  /** Texts of a new full-width photo band */
  band: ByLanguage<{ title: string; text: string; button: string }>;
}

export interface AiThemeDraftResponse {
  draft: AiThemeDraft;
  usage: AiUsageSummary;
}

/** Product flattened for one language (`GET /api/products`, `/:name?lang=`). */
export type LocalizedProduct = ProductBase & ProductLangInfo;

export interface CategoryLangInfo {
  title: string;
  description: string;
  position?: number;
  visibility: boolean;
  menuHidden?: boolean;
}

/** A marked-trail color (category tiles and menu markers) */
export type TrailColor = 'red' | 'blue' | 'green' | 'yellow';

export interface CategoryBase {
  _id?: string;
  titleUrl: string;
  mainImage?: Image & { type?: boolean };
  /** Absent = by position in the category list; on save, null or '' sets it back to that */
  trailColor?: TrailColor | null;
  /** Wide photo for the category page header (https); absent = the main image. On save, null or '' clears it */
  headerImage?: string | null;
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

export type OrderStatus = 'NEW' | 'PAID' | 'SHIPPING' | 'COMPLETED' | 'CANCELED' | 'PENDING_PAYMENT' | 'PAYMENT_FAILED' | 'REFUNDED';

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
  /** Stripe PaymentIntent of a card order */
  paymentIntentId?: string;
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

/** Body of `POST /api/orders/stripe` (removed: answers 410; card payments use /api/payments). */
export interface StripeOrderRequest extends OrderRequest {
  token: { id: string };
}

// Card payments with the Stripe Payment Element (docs/payments.md) ----------------------------

/** Body of `POST /api/payments/intent`. Amount and currency always come from the server. */
export interface PaymentIntentRequest {
  email: string;
  addresses: Address[];
  notes?: string;
}

/** Response of `POST /api/payments/intent`: confirm `clientSecret` with Stripe.js. */
export interface PaymentIntentResponse {
  orderId: string;
  clientSecret: string;
  /** Major units, as shown in the cart */
  amount: number;
  currency: string;
}

/** Response of `POST /api/payments/complete` (body `{ orderId }`). */
export interface PaymentCompleteResponse {
  order: Order;
  /** `succeeded` once paid; `processing` for delayed methods; otherwise the customer can retry */
  paymentStatus: 'succeeded' | 'processing' | 'requires_payment_method' | 'requires_action' | 'canceled' | string;
  cart: LocalizedCart | SessionCart;
}

/** Body of `POST /api/admin/orders/:orderId/refund`; no amount = refund what is left. */
export interface RefundRequest {
  /** Major units */
  amount?: number;
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

/**
 * One section of the home page (`ThemeStyles.home`, in display order). Without `home` the client uses
 * the default layout, built from the theme's other settings (client/src/app/shared/home-layout.ts).
 *
 * Types: hero (photo or video, Hero_* translations; first when present), benefits (shipping, cash on
 * delivery, returns, secure payment), categories (the menu categories as tiles), products (the newest
 * products with paging), band (a photo with a title, text and a button), trips ("shop by trip": 1–3
 * large cards, usually menu-hidden categories), productRow (one row of products: newest, on sale or
 * from one category).
 */
export type HomeSection = {
  id: string;
  enabled: boolean;
  /** 'ridge': layered mountain ridges under the section */
  divider?: 'none' | 'ridge';
} & (
  | { type: 'hero' }
  | { type: 'benefits' }
  | { type: 'categories' }
  | { type: 'products' }
  | {
      type: 'band';
      image?: string;
      link?: string;
      /** 'full': edge to edge with a light parallax; otherwise a rounded banner in the page width */
      width?: 'boxed' | 'full';
      /** `button` empty = the Shop_now translation */
      text: ByLanguage<{ title: string; text?: string; button?: string }>;
    }
  | { type: 'trips'; categories: string[]; text?: ByLanguage<{ title: string }> }
  | { type: 'productRow'; source: ProductRowSource; category?: string; text?: ByLanguage<{ title: string }> }
);

/** Where a product row takes its products from */
export type ProductRowSource = 'newest' | 'sale' | 'category';

export type HomeSectionType = HomeSection['type'];

/** `ListingStyles` page key of the All products page; any other key is a category's titleUrl */
export type ListingAllPage = '*';

/** An editorial tile in the product grid: a lifestyle photo two columns wide with a headline and a link */
export interface ListingTile {
  id: string;
  image: string;
  /** A shop path like /en/product/category/tents, or an https URL */
  link: string;
  /** The listing pages it appears on ('*' = All products, or category titleUrls); empty = every listing page */
  pages: string[];
  /** `button` empty = the Shop_now translation */
  text: ByLanguage<{ title: string; text?: string; button?: string }>;
}

/** The large first card of a listing page (page 1 only): a chosen product, or the page's newest sale item */
export interface ListingFeatured {
  /** '*' = All products, or a category's titleUrl */
  page: string;
  source: 'product' | 'sale';
  /** The product's titleUrl, for the product source */
  product?: string;
}

/** Product listing pages (All products and categories); see client/src/app/shared/listing.ts */
export interface ListingStyles {
  /** The All products page header (a category page uses the category's header image, title and description) */
  header?: { image?: string; text?: ByLanguage<{ title?: string; text?: string }> };
  /** A tile after every N products (2–24); absent = 6 */
  tileEvery?: number;
  tiles?: ListingTile[];
  featured?: ListingFeatured[];
}

/** Per-language theme texts: promoTitle_en, promoText_sk, … */
export type ThemeLangKey = `promoTitle_${LanguageCode}` | `promoText_${LanguageCode}`;

/**
 * The active theme's settings (`themes.styles`). The server accepts only these keys and merges a save
 * into the stored ones (an empty string clears a value); see server/src/eshop/theme-styles.ts.
 */
export type ThemeStyles = {
  /** The brand accent; empty = the default ink. Light/dark variants are contrast-checked by the client */
  primaryColor?: string;
  logo?: string;
  /** Shown in the header, footer, page titles, structured data and emails; empty = the ESHOP_TITLE translation */
  shopName?: string;
  /** Home hero: photo, optional video (the photo is its poster) and the photo's vertical position */
  promoSlideBackground?: string;
  promoSlideVideo?: string;
  promoSlideBackgroundPosition?: 'center' | 'top' | 'bottom' | '';
  /** Home hero photo: 'none' (its own colors) or 'warm' (a warm tint) */
  heroTint?: 'none' | 'warm' | '';
  /** 'block' shows the home promo banner (promoImage, promoLink, promoTitle_<lang>, promoText_<lang>); 'none' hides it */
  promo?: 'none' | 'block' | '';
  promoImage?: string;
  /** A shop path like /en/product/category/tents, or an https URL */
  promoLink?: string;
  /** The home page sections in order; absent = the default layout */
  home?: HomeSection[];
  /** Headers, editorial tiles and featured products of the product listing pages */
  listing?: ListingStyles;
  /** @deprecated Not used by the shop or the editor; kept in stored themes */
  secondaryColor?: string;
  /** @deprecated */
  backgroundColor?: string;
  /** @deprecated */
  mainBackground?: string;
  /** @deprecated */
  freeShippingPromo?: string;
} & Partial<Record<ThemeLangKey, string>>;

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
/** GET /api/admin/overview?days=1|7|30: the admin Overview page. Money is per currency (EUR and CZK can't be added). */
export interface AdminOverview {
  days: number;
  /** ISO timestamps of the period and the one before it (same length) */
  from: string;
  previousFrom: string;
  sales: AdminOverviewSales[];
  /** Orders that need the admin: NEW (to confirm/ship) and PAID (to ship); all time */
  toHandle: number;
  /** One entry per day of the period (YYYY-MM-DD, shop time zone), per currency */
  revenueByDay: { day: string; currency: string; revenue: number; orders: number }[];
  topProducts: { titleUrl: string; title: string; qty: number; revenue: number; currency: string }[];
  recentOrders: { orderId: string; date: string; customer: string; email: string; amount: number; currency: string; status: OrderStatus }[];
  attention: {
    /** Visible in a language but marked unavailable */
    unavailableVisible: number;
    /** Products without a title in a language, per language */
    missingLanguage: { lang: LanguageCode; count: number }[];
    /** Visible products without a meta description, per language */
    missingSeo: { lang: LanguageCode; count: number }[];
    /** UI text keys empty or missing in a language, per language */
    untranslated: { lang: LanguageCode; count: number }[];
  };
  ai: { drafts: number; ok: number; failed: number; costUsd: number; lastModel?: string };
}

export interface AdminOverviewSales {
  currency: string;
  revenue: number;
  orders: number;
  averageOrder: number;
  previousRevenue: number;
  previousOrders: number;
}

/** GET /api/version: the running build ("dev" when not built with scripts/build-ssr.mjs) */
export interface BuildInfo {
  version: string;
  /** Short git commit SHA */
  sha: string;
  /** YYYY-MM-DD */
  buildDate: string;
}

export interface PublicConfigResponse {
  config: string;
}

export interface ContactRequest {
  email: string;
  name?: string;
  notes?: string;
  token: string;
}
