import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Cart } from './utils/cart';
import { GetCartChangeDto } from './dto/cart-change.dto';
import { Product, ProductModel } from '../products/models/product.model';




@Injectable()
export class CartService {
  constructor(@InjectModel('Product') private productModel: ProductModel) {}

  async getCart(cart: Cart) {
    return cart || new Cart({});
  }

  async addToCart(cart: Cart, getCartChangeDto: GetCartChangeDto, lang: string) {
    const {id} = getCartChangeDto;
    const storeCart = new Cart(cart || {});
    try {
        const product = await this.productModel.findById(id);
        const updatedProduct = this.prepareProduct(product, lang);
        storeCart.add(updatedProduct, id);
        return storeCart;
    } catch {
        return storeCart;
    }
  }

  async removeFromCart(cart: Cart, getCartChangeDto: GetCartChangeDto, lang: string) {
    const {id} = getCartChangeDto;
    const storeCart = new Cart(cart || {});
    try {
        const product = await this.productModel.findById(id);

        if (!product) {
          const itIsInCart = storeCart.check(id);

          if (itIsInCart) {
            return new Cart({});
          }
        }
        const updatedProduct = this.prepareProduct(product, lang);
        storeCart.remove(updatedProduct, id);
        return storeCart;
    } catch {
        return storeCart;
    }
  }


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


}
