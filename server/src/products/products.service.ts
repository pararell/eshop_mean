import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { GetProductsDto } from './dto/get-products';
import { Product, ProductModel, ProductsWithPagination } from './models/product.model';
import { GetProductDto } from './dto/get-product';
import { Category } from './models/category.model';
import { User } from '../auth/models/user.model';


@Injectable()
export class ProductsService {
  constructor(@InjectModel('Product') private productModel: ProductModel) {}

  async getProducts(getProductsDto: GetProductsDto): Promise<ProductsWithPagination> {
    const { lang, page, sort, category, search } = getProductsDto;
    const searchQuery = search      ? { titleUrl:  new RegExp(search, 'i') }                : {};
    const categoryQuery = category  ? { [`${lang}.categories`] : new RegExp(category, 'i' ) } : {};

    const query = {...searchQuery, ...categoryQuery, ...{ [`${lang}.visibility`] : true}}
    const options = {
        page  : parseFloat(page),
        sort  : this.prepareSort(sort, lang),
        limit : 10
      };

    const productsWithPagination = await this.productModel.paginate(query, options);

    return {
        ...productsWithPagination,
        all: productsWithPagination.all.map(product => this.prepareProduct(product, lang))
      }
  }

  async getCategories(lang: string): Promise<Category[]> {
    const categoriesLang = `${lang}.categories`;
    const products = await this.productModel.find( {[categoriesLang]: { $gt: [] }} );
    return this.prepareCategories(products, lang);
  }

  async getProductsTitles(search: string): Promise<string[]> {
    const products = await this.productModel.find({ titleUrl:  new RegExp(search, 'i') });
    return products.map(product => product.titleUrl);
  }

  async getProductByName(name: string, getProductDto: GetProductDto): Promise<Product> {
    const { lang } = getProductDto;
    const found = await this.productModel.findOne({ titleUrl: name });

    if (!found) {
      throw new NotFoundException(`Product with title ${name} not found`);
    }

    return lang
      ? this.prepareProduct(found, lang)
      : found;
  }


  async addProduct(productReq, user: User): Promise<void> {
    const newProduct = Object.assign(productReq, {
      _user     : user._id,
      dateAdded : Date.now()
    });

    try {
      const product = await new this.productModel(newProduct);
      product.save();
    } catch {
      throw new BadRequestException();
    }
  }


  async editProduct(productReq): Promise<void> {
    const {titleUrl} = productReq;
    const found = await this.productModel.findOneAndUpdate({ titleUrl }, productReq, {upsert: true});

    if (!found) {
      throw new NotFoundException(`Product with title ${name} not found`);
    }
  }


  async deleteProductByName(name: string): Promise<void> {
      const found = await this.productModel.findOneAndRemove({ titleUrl: name });

      if (!found) {
        throw new NotFoundException(`Product with title ${name} not found`);
      }
  }


  async getAllProducts(lang: string): Promise<Product[]> {
    const products = await this.productModel.find({});
    return products.map(product => this.prepareProduct(product, lang));
  }


  private prepareSort = (sortParams, lang: string): string => {
    switch (sortParams) {
      case 'newest':
        return `${lang}.dateAdded`
      case 'oldest':
        return `-${lang}.dateAdded`;
      case 'priceasc':
        return `${lang}.salePrice`
      case 'pricedesc':
      return  `-${lang}.salePrice`
      default:
       return `-${lang}.dateAdded`;
    }
  };

  private prepareProduct = (product, lang: string): Product => ({
      _id       : product._id,
      titleUrl  : product.titleUrl,
      mainImage : product.mainImage,
      onSale    : product.onSale,
      stock     : product.stock,
      visibility: product.visibility,
      shipping  : product.shipping,
      images    : product.images,
      _user     : product._user,
      dateAdded : product.dateAdded,
      ...product[lang]
  });


  private prepareCategories = (products, lang: string): Category[] => {
    return products
      .reduce((catSet, product) => catSet.concat(product[lang].categories) , [])
      .filter((cat, i, arr) => arr.indexOf(cat) === i)
      .map(category => ({
          title: category ,
          titleUrl: category.replace(/ /g, '_').toLowerCase()
        })
      );
  };

}
