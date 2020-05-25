import { CartModel } from '../../cart/models/cart.model';
import { Product } from '../../products/models/product.model';

export const prepareProduct = (product, lang: string): Product => ({
  _id: product._id,
  titleUrl: product.titleUrl,
  mainImage: product.mainImage,
  images: product.images,
  tags: product.tags,
  _user: product._user,
  dateAdded: product.dateAdded,
  ...product[lang],
});

export const prepareCart = (cart, lang: string): CartModel => {
  const cartLangItems = cart.items
    .map((cartItem: any) => {
      const prepareItem = prepareProduct(cartItem.item, lang);
      const price = prepareItem.salePrice;

      return { item: prepareItem, id: cartItem.id, qty: cartItem.qty, price };
    })
    .filter(
      (cartItem: any) =>  cartItem.item.visibility && cartItem.item.salePrice,
    );
  const {
    totalPrice,
    totalQty,
  }: { totalPrice: number; totalQty: number } = cartLangItems.reduce(
    (prev, curr) => ({
      totalPrice: prev.totalPrice + curr.price,
      totalQty: prev.totalQty + curr.qty,
    }),
    { totalPrice: 0, totalQty: 0 },
  );

  return {
    items: cartLangItems,
    totalPrice,
    totalQty,
  };
};
