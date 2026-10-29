import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, asc, desc, eq, ilike, lte, max, min, SQL, sql } from 'drizzle-orm';
import type { CategoryInput, LanguageCode, ProductInput, ProductRaw } from '@eshop/shared';

import { GetProductsDto } from './dto/get-products';
import { LocalizedProduct, Product, ProductsPage } from './models/product.model';
import { GetProductDto } from './dto/get-product';
import { Category, CategoryWithProducts, LocalizedCategory } from './models/category.model';
import { User } from '../auth/models/user.model';
import { prepareProduct } from '../shared/utils/prepareUtils';
import { languages, paginationLimit } from '../shared/constans';
import { Database, DRIZZLE } from '../db/database.module';
import { toProductDoc } from '../db/mappers';
import { categories, categoryTranslations, products, productTranslations, trailColor as trailColorEnum } from '../db/schema';
import { assertSalePrices } from './sale-price';
import {
  findProduct,
  hasCategoryTag,
  insertCategoryIfMissing,
  insertProduct,
  isLanguage,
  likePattern,
  removeTagFromProducts,
  tagSlug,
  toCategoryDocs,
  toProductDocs,
  upsertCategory,
  upsertProduct,
} from '../db/catalog';

const TRAIL_COLORS: readonly string[] = trailColorEnum.enumValues;

@Injectable()
export class ProductsService {
  constructor(@Inject(DRIZZLE) private db: Database) {}

  async getProducts(getProductsDto: GetProductsDto, lang: string): Promise<ProductsPage> {
    const { page, sort, category, search, maxPrice, onSale } = getProductsDto;
    const pageNumber = parseFloat(page);
    // Unknown language: MongoDB matched nothing, so return an empty page rather than a SQL error
    if (!isLanguage(lang)) {
      return { all: [], pagination: { total: 0, limit: paginationLimit, page: pageNumber, pages: 1 }, maxPrice: Infinity, minPrice: 0 };
    }

    const conditions: SQL[] = [eq(productTranslations.lang, lang), eq(productTranslations.visibility, true)];
    if (search) conditions.push(ilike(products.titleUrl, likePattern(search)));
    if (category) conditions.push(hasCategoryTag(category));
    if (maxPrice) conditions.push(lte(productTranslations.salePrice, Number(maxPrice)));
    if (onSale === 'true') conditions.push(eq(productTranslations.onSale, true));

    const rows = await this.db
      .select({ product: products, translation: productTranslations, total: sql<number>`count(*) over ()`.mapWith(Number) })
      .from(products)
      .innerJoin(productTranslations, eq(productTranslations.productId, products.id))
      .where(and(...conditions))
      .orderBy(...this.prepareSort(sort), asc(products.id))
      .limit(paginationLimit)
      .offset((pageNumber - 1) * paginationLimit);

    // Price range over all products of the language (ignores filters and visibility, as before)
    const [range] = await this.db
      .select({ max: max(productTranslations.salePrice), min: min(productTranslations.salePrice) })
      .from(productTranslations)
      .where(eq(productTranslations.lang, lang));

    const total = rows[0]?.total ?? 0;
    return {
      all: rows.map(({ product, translation }) => prepareProduct(toProductDoc(product, [translation]) as ProductRaw, lang, true)),
      pagination: { total, limit: paginationLimit, page: pageNumber, pages: Math.ceil(total / paginationLimit) || 1 },
      maxPrice: range?.max === null || range?.max === undefined ? Infinity : Number(range.max),
      minPrice: range?.min === null || range?.min === undefined ? 0 : Number(range.min),
    };
  }

  async getCategories(lang: string): Promise<LocalizedCategory[]> {
    if (!isLanguage(lang)) return [];
    const rows = await this.db
      .select({ category: categories })
      .from(categories)
      .innerJoin(categoryTranslations, eq(categoryTranslations.categoryId, categories.id))
      .where(and(eq(categoryTranslations.lang, lang), eq(categoryTranslations.visibility, true)))
      .orderBy(sql`${categoryTranslations.position} asc nulls first`, asc(categories.id));

    const docs = await toCategoryDocs(
      this.db,
      rows.map((r) => r.category),
      lang,
    );
    return this.prepareCategories(docs, lang);
  }

  async getProductsTitles(search: string): Promise<string[]> {
    const rows = await this.db
      .select({ titleUrl: products.titleUrl })
      .from(products)
      .where(ilike(products.titleUrl, likePattern(search ?? '')));
    return rows.map((row) => row.titleUrl);
  }

  async getProductByName(name: string, getProductDto: GetProductDto): Promise<LocalizedProduct | Product> {
    const { lang } = getProductDto;
    const found = await findProduct(this.db, { titleUrl: name });

    if (!found) {
      throw new NotFoundException(`Product with title ${name} not found`);
    }

    return lang ? prepareProduct(found as ProductRaw, lang) : found;
  }

  async addProduct(productReq: ProductInput, user: User): Promise<void> {
    const found = await findProduct(this.db, { titleUrl: productReq.titleUrl });
    if (found) {
      throw new BadRequestException();
    }
    assertSalePrices(productReq);
    const newProduct = Object.assign(productReq, {
      images: productReq.images || [],
    });

    try {
      const product = await insertProduct(this.db, newProduct as unknown as Record<string, unknown>, { createdBy: user._id });
      // Not awaited, as before: categories appear shortly after the response
      void this.addCategory(product);
    } catch {
      throw new BadRequestException();
    }
  }

  /** Updates the product, or creates it when the titleUrl is new (upsert); either way 200 (audit BUG-08) */
  async editProduct(productReq: ProductInput): Promise<void> {
    assertSalePrices(productReq);
    await upsertProduct(this.db, productReq as unknown as Record<string, unknown>);
    void this.addCategory(productReq);
  }

  async deleteProductByName(titleUrl: string): Promise<void> {
    const deleted = await this.db.delete(products).where(eq(products.titleUrl, titleUrl)).returning({ id: products.id });

    if (!deleted.length) {
      throw new NotFoundException(`Product with title ${titleUrl} not found`);
    }
  }

  async getAllProducts(lang: string): Promise<LocalizedProduct[]> {
    const rows = await this.db.select().from(products);
    const docs = await toProductDocs(this.db, rows);
    return docs.map((product) => prepareProduct(product as ProductRaw, lang));
  }

  async getAllCategories(_lang: string): Promise<CategoryWithProducts[]> {
    const categoryRows = await this.db.select().from(categories);
    const productRows = await this.db.select({ titleUrl: products.titleUrl, tags: products.tags }).from(products);
    return this.prepareAllCategories(await toCategoryDocs(this.db, categoryRows), productRows);
  }

  /** Updates the category, or creates it when the titleUrl is new (upsert); either way 200 (audit BUG-08) */
  async editCategory(categoryReq: CategoryInput): Promise<void> {
    const { trailColor } = categoryReq;
    if (trailColor !== undefined && trailColor !== null && (trailColor as string) !== '' && !TRAIL_COLORS.includes(trailColor)) {
      throw new BadRequestException(`trailColor must be one of ${TRAIL_COLORS.join(', ')}, or empty`);
    }
    const { headerImage } = categoryReq;
    if (headerImage && (typeof headerImage !== 'string' || !/^https:\/\/[^\s]+$/.test(headerImage))) {
      throw new BadRequestException('headerImage must be an https URL, or empty');
    }
    await upsertCategory(this.db, categoryReq as unknown as Record<string, unknown>);
  }

  async deleteCategoryByName(titleUrl: string): Promise<void> {
    const deleted = await this.db.delete(categories).where(eq(categories.titleUrl, titleUrl)).returning({ id: categories.id });

    if (!deleted.length) {
      throw new NotFoundException(`Category with title ${titleUrl} not found`);
    } else {
      await removeTagFromProducts(this.db, titleUrl);
    }
  }

  private prepareSort = (sortParams: string): SQL[] => {
    switch (sortParams) {
      case 'newest':
        return [desc(products.createdAt)];
      case 'oldest':
        return [asc(products.createdAt)];
      case 'priceasc':
        // MongoDB sorts missing values first ascending and last descending
        return [sql`${productTranslations.salePrice} asc nulls first`];
      case 'pricedesc':
        return [sql`${productTranslations.salePrice} desc nulls last`];
      default:
        return [desc(products.createdAt)];
    }
  };

  private prepareCategories = (docs: Category[], lang: LanguageCode): LocalizedCategory[] => {
    return docs.map((category) => {
      const langInfo = category[lang];
      return {
        titleUrl: category.titleUrl,
        mainImage: category.mainImage,
        dateAdded: category.dateAdded,
        subCategories: category.subCategories,
        ...(category.trailColor ? { trailColor: category.trailColor } : {}),
        ...(category.headerImage ? { headerImage: category.headerImage } : {}),
        title: langInfo ? langInfo.title : category.titleUrl,
        description: langInfo ? langInfo.description : '',
        visibility: langInfo ? langInfo.visibility : false,
        menuHidden: langInfo ? langInfo.menuHidden! : false,
      };
    });
  };

  private addCategory = async (product: Pick<ProductRaw, 'tags' | 'mainImage'>): Promise<void> => {
    const tags = (product.tags ?? []).filter((cat, i, arr) => arr.indexOf(cat) === i);
    for (const category of tags) {
      const titleUrl = tagSlug(category);
      await insertCategoryIfMissing(this.db, {
        titleUrl,
        mainImage: { url: product.mainImage?.url, name: product.mainImage?.name },
        ...languages.reduce(
          (prev, lang) => ({
            ...prev,
            [lang]: { title: category, description: '', visibility: product.tags.includes(category) },
          }),
          {},
        ),
      });
    }
  };

  private prepareAllCategories = (docs: Category[], productRows: { titleUrl: string; tags: string[] }[]): CategoryWithProducts[] => {
    return docs.map((category) => {
      const slug = tagSlug(category.titleUrl);
      const productsWithCategory = productRows
        .filter((product) => product.tags.some((tag) => tagSlug(tag) === slug))
        .map((product) => product.titleUrl);
      return { category, productsWithCategory };
    });
  };
}
