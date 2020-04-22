import { Injectable } from '@nestjs/common';
import { Cart } from './cart';
import { GetCartChangeDto } from './dto/cart-change.dto';
import { ProductModel } from '../products/models/product.model';
import { InjectModel } from '@nestjs/mongoose';



@Injectable()
export class CartService {
  constructor(@InjectModel('Product') private productModel: ProductModel) {}

  async getCart(cart) {
    return cart || new Cart({});
  }

  async addToCart(cart, getCartChangeDto: GetCartChangeDto) {
    const {id, lang} = getCartChangeDto;
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

  async removeFromCart(cart, getCartChangeDto: GetCartChangeDto) {
    const {id, lang} = getCartChangeDto;
    const storeCart = new Cart(cart || {});
    try {
        const product = await this.productModel.findById(id);
        const updatedProduct = this.prepareProduct(product, lang);
        storeCart.remove(updatedProduct, id);
        return storeCart;
    } catch {
        return storeCart;
    }
  }


  private prepareProduct = (product, lang: string) => ({
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
