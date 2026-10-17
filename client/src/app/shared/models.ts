// Client-side names for the API shapes. The shapes themselves live in shared/types (@eshop/shared)
// and are shared with the server.
import type {
  CategoryRaw,
  CategoryWithProducts,
  CurrentUser,
  LocalizedCart,
  LocalizedCategory,
  LocalizedProduct,
  ProductRaw,
  ShopConfig,
  Translation,
} from '@eshop/shared';

export type {
  Address,
  CategoryRaw,
  CategoryWithProducts,
  ContactRequest,
  LanguageCode,
  Order,
  OrderRequest,
  Page,
  Pagination,
  ProductInput,
  ProductRaw,
  ProductSort,
  SignInRequest,
  SignInResponse,
  SignUpRequest,
  StripeOrderRequest,
  Theme,
  ThemeStyles,
} from '@eshop/shared';

export type Translations = Translation;

/** Product flattened for the current language (shop pages). Admin screens use ProductRaw. */
export type Product = LocalizedProduct;

export type Cart = LocalizedCart;

/** Category flattened for the current language (shop pages). Admin screens use CategoryRaw. */
export type Category = LocalizedCategory & Partial<Pick<CategoryRaw, 'en' | 'sk' | 'cs'>> & { position?: number };

export type Config = ShopConfig;

/** Logged-in user; `accessToken` is present right after sign-in. */
export type User = CurrentUser & { accessToken?: string };

export type AllCategories = CategoryWithProducts[];

/** Runtime values for the order status select (same strings as the server's OrderStatus). */
export enum OrderStatus {
  NEW = 'NEW',
  PAID = 'PAID',
  SHIPPING = 'SHIPPING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REFUNDED = 'REFUNDED',
}

export type { ProductRaw as ProductDocument };
