import { Document } from 'mongoose';
import type { CategoryRaw, CategoryWithProducts, LocalizedCategory } from '@eshop/shared';

export type { CategoryWithProducts, LocalizedCategory };

/** Category document (language sub-documents keyed by language code). */
export interface Category extends Document<string>, Omit<CategoryRaw, '_id'> {
  _id: string;
}

/** @deprecated kept for existing imports; same as Category */
export type CategoryModel = Category;
