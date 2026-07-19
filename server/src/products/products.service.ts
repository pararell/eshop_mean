import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike, LessThanOrEqual } from 'typeorm';

import { GetProductsDto } from './dto/get-products';
import { Product } from '../entities/product.entity';
import { GetProductDto } from './dto/get-product';
import { Category } from '../entities/category.entity';
import { User } from '../entities/user.entity';
import { prepareProduct } from '../shared/utils/prepareUtils';
import { languages, paginationLimit } from '../shared/constans';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepository: Repository<Product>,
    @InjectRepository(Category) private categoryRepository: Repository<Category>,
  ) {}

  async getProducts(
    getProductsDto: GetProductsDto,
    lang: string,
  ): Promise<any> {
    const { page, sort, category, search, maxPrice } = getProductsDto;

    const queryBuilder = this.productRepository.createQueryBuilder('product');

    if (search) {
      queryBuilder.andWhere('product.titleUrl LIKE :search', { search: `%${search}%` });
    }
    if (category) {
      queryBuilder.andWhere('product.tags LIKE :category', { category: `%${category}%` });
    }
    if (maxPrice) {
      queryBuilder.andWhere(`JSON_EXTRACT(product.${lang}, '$.salePrice') <= :maxPrice`, { maxPrice: Number(maxPrice) });
    }
    if (lang) {
      queryBuilder.andWhere(`JSON_EXTRACT(product.${lang}, '$.visibility') = true`);
    }

    // Sort
    const sortMap = {
      'newest': 'product.dateAdded',
      'oldest': 'product.dateAdded',
    };
    sortMap[`${lang}.salePrice`] = `JSON_EXTRACT(product.${lang}, '$.salePrice')`;
    sortMap[`-${lang}.salePrice`] = `JSON_EXTRACT(product.${lang}, '$.salePrice')`;

    const sortField = this.prepareSort(sort, lang);
    const sortOrder = sort?.startsWith('-') ? 'DESC' : 'ASC';
    const cleanSort = sortOrder === 'DESC' ? sort.substring(1) : sort;

    if (cleanSort === 'dateAdded') {
      queryBuilder.orderBy('product.dateAdded', sortOrder);
    } else {
      queryBuilder.orderBy(`JSON_EXTRACT(product.${lang}, '$.salePrice')`, sortOrder);
    }

    const pageNum = parseFloat(page) || 1;
    const skip = (pageNum - 1) * paginationLimit;
    queryBuilder.skip(skip).take(paginationLimit);

    const [all, total] = await queryBuilder.getManyAndCount();

    // Get min/max price
    const allProducts = await this.productRepository.find({});
    let maxPriceValue = 0;
    let minPriceValue = Infinity;
    allProducts.forEach(p => {
      const langData = p[lang];
      if (langData && langData.salePrice) {
        maxPriceValue = Math.max(maxPriceValue, langData.salePrice);
        minPriceValue = Math.min(minPriceValue, langData.salePrice);
      }
    });

    return {
      all: all.map((product) => prepareProduct(product, lang, true)),
      total,
      limit: paginationLimit,
      page: pageNum,
      pages: Math.ceil(total / paginationLimit) || 1,
      maxPrice: maxPriceValue || Infinity,
      minPrice: minPriceValue || 0,
    };
  }

  async getCategories(lang: string): Promise<Category[]> {
    const categories = await this.categoryRepository.find({});
    return this.prepareCategories(categories, lang);
  }

  async getProductsTitles(search: string): Promise<string[]> {
    const products = await this.productRepository.find({
      where: { titleUrl: ILike(`%${search}%`) },
    });
    return products.map((product) => product.titleUrl);
  }

  async getProductByName(
    name: string,
    getProductDto: GetProductDto,
  ): Promise<Product> {
    const { lang } = getProductDto;
    const found = await this.productRepository.findOne({ where: { titleUrl: name } });

    if (!found) {
      throw new NotFoundException(`Product with title ${name} not found`);
    }

    return lang ? prepareProduct(found, lang) : found;
  }

  async addProduct(productReq, user: User): Promise<void> {
    const found = await this.productRepository.findOne({
      where: { titleUrl: productReq.titleUrl },
    });
    if (found) {
      throw new BadRequestException();
    }
    const newProduct = new Product();
    Object.assign(newProduct, productReq, {
      _user: user._id,
      dateAdded: new Date(),
      images: productReq.images || [],
    });

    try {
      const product = await this.productRepository.save(newProduct);
      await this.addCategory(product);
    } catch {
      throw new BadRequestException();
    }
  }

  async editProduct(productReq): Promise<void> {
    const { titleUrl } = productReq;
    const found = await this.productRepository.findOne({ where: { titleUrl } });

    if (!found) {
      throw new NotFoundException(`Product with title ${titleUrl} not found`);
    }

    await this.productRepository.update({ titleUrl }, productReq);
    await this.addCategory(productReq);
  }

  async deleteProductByName(titleUrl: string): Promise<void> {
    const found = await this.productRepository.findOne({ where: { titleUrl } });

    if (!found) {
      throw new NotFoundException(`Product with title ${titleUrl} not found`);
    }

    await this.productRepository.delete({ titleUrl });
  }

  async getAllProducts(lang: string): Promise<Product[]> {
    const products = await this.productRepository.find({});
    return products.map((product) => prepareProduct(product, lang));
  }

  async getAllCategories(lang: string) {
    const categories = await this.categoryRepository.find({});
    const products = await this.productRepository.find({});
    return this.prepareAllCategories(categories, products);
  }

  async editCategory(categoryReq): Promise<void> {
    const { titleUrl } = categoryReq;
    const found = await this.categoryRepository.findOne({ where: { titleUrl } });

    if (!found) {
      const newCategory = new Category();
      Object.assign(newCategory, categoryReq);
      await this.categoryRepository.save(newCategory);
      return;
    }

    await this.categoryRepository.update({ titleUrl }, categoryReq);
  }

  async deleteCategoryByName(titleUrl: string): Promise<void> {
    const found = await this.categoryRepository.findOne({ where: { titleUrl } });

    if (!found) {
      throw new NotFoundException(`Category with title ${titleUrl} not found`);
    }

    await this.categoryRepository.delete({ titleUrl });
    const products = await this.productRepository.find({});
    await this.removeCategoryFromProducts(titleUrl, products);
  }

  private prepareSort = (sortParams, lang: string): string => {
    switch (sortParams) {
      case 'newest':
        return `-dateAdded`;
      case 'oldest':
        return `dateAdded`;
      case 'priceasc':
        return `${lang}.salePrice`;
      case 'pricedesc':
        return `-${lang}.salePrice`;
      default:
        return `-dateAdded`;
    }
  };

  private prepareCategories = (categories, lang: string): Category[] => {
    return categories.map((category) => ({
      titleUrl: category.titleUrl,
      mainImage: category.mainImage,
      dateAdded: category.dateAdded,
      subCategories: category.subCategories,
      title: category[lang] ? category[lang].title : category.titleUrl,
      description: category[lang] ? category[lang].description : '',
      visibility: category[lang] ? category[lang].visibility : false,
      menuHidden: category[lang] ? category[lang].menuHidden : false,
      _id: category._id,
    }));
  };

  private addCategory = async (product): Promise<void> => {
    const uniqueTags = product.tags?.filter((cat, i, arr) => arr.indexOf(cat) === i) || [];

    for (const category of uniqueTags) {
      const titleUrl = category.replace(/ /g, '_').toLowerCase();
      const addCategoryData = {
        titleUrl,
        mainImage: {
          url: product.mainImage?.url || '',
          name: product.mainImage?.name || '',
        },
        dateAdded: new Date(),
        ...languages.reduce(
          (prev, lang) => ({
            ...prev,
            [lang]: {
              title: category,
              description: '',
              visibility: product.tags?.includes(category) || false,
            },
          }),
          {},
        ),
      };

      const found = await this.categoryRepository.findOne({ where: { titleUrl } });
      if (!found) {
        const newCategory = new Category();
        Object.assign(newCategory, addCategoryData);
        await this.categoryRepository.save(newCategory);
      }
    }
  };

  private prepareAllCategories = (categories, products) => {
    return categories.map((category) => {
      const productsWithCategory = products
        .filter((product) => {
          return product.tags?.includes(category.titleUrl);
        })
        .map((product) => product.titleUrl);
      return { category, productsWithCategory };
    });
  };

  private removeCategoryFromProducts = async (category: string, products) => {
    for (const product of products) {
      const productHasCategory = product.tags?.includes(category);
      if (!productHasCategory) {
        continue;
      }
      const productReq = {
        tags: product.tags.filter((tag) => tag !== category),
      };
      await this.productRepository.update(
        { titleUrl: product.titleUrl },
        productReq,
      );
    }
  };
}