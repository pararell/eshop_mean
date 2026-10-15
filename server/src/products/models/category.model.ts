import type { CategoryWithProducts, LocalizedCategory } from '@eshop/shared';
import type { CategoryDoc } from '../../db/mappers';

export type { CategoryWithProducts, LocalizedCategory };

/** Category as the API returns it (language sub-objects keyed by language code) */
export type Category = CategoryDoc;
