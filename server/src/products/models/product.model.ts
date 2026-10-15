import type { LocalizedProduct, ProductsPage } from '@eshop/shared';
import type { ProductDoc } from '../../db/mappers';

export type { LocalizedProduct, ProductsPage };

/** Product as the API returns it: base fields + one sub-object per language */
export type Product = ProductDoc;
