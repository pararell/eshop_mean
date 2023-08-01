import { CartModel } from '../../cart/models/cart.model';
import { Product } from '../../products/models/product.model';
import { shippingCost, shippingTypes } from '../constans';

export const prepareProduct = (product, lang: string, light?: boolean): Product => ({
  _id: product._id,
  titleUrl: product.titleUrl,
  mainImage: product.mainImage,
  images: product.images,
  tags: product.tags,
  _user: product._user,
  dateAdded: product.dateAdded,
  ...{ ...product[lang], descriptionFull: !light ? product[lang].descriptionFull : [] },
});

export const prepareCart = (cart, lang: string, config): CartModel => {
  const cartLangItems = cart.items.length
    ? cart.items
        .map((cartItem: any) => {
          const prepareItem = prepareProduct(cartItem.item, lang, true);
          const price: number = prepareItem.salePrice;
          const shipingCostType: string = prepareItem.shipping;
          return { item: prepareItem, id: cartItem.id, qty: cartItem.qty, price, shipingCostType };
        })
        .filter((cartItem: any) => cartItem.item.visibility && cartItem.item.salePrice)
    : [];

  const { totalPrice, totalQty }: { totalPrice: number; totalQty: number } = cartLangItems.reduce(
    (prev, item) => ({
      totalPrice: prev.totalPrice + item.price * item.qty,
      totalQty: prev.totalQty + item.qty,
    }),
    { totalPrice: 0, totalQty: 0 },
  );

  const shippingTypeCheck = cartLangItems.find((item) => item.shipingCostType === shippingTypes[1]);
  const shippingType = shippingTypeCheck ? shippingTypes[1] : shippingTypes[0];
  const shippingByLang =
    config && config[lang] && config[lang].shippingCost && config[lang].shippingCost[shippingType]
      ? config[lang].shippingCost[shippingType]
      : shippingCost[lang][shippingType];
  const shippingTypeCost = totalPrice >= shippingByLang.limit ? 0 : shippingByLang.cost;

  return {
    items: cartLangItems,
    shippingCost: totalPrice ? shippingTypeCost : 0,
    shippingLimit: shippingByLang.limit,
    shippingType: totalPrice ? (shippingTypeCost ? shippingType : 'free') : '',
    totalPrice: totalPrice ? totalPrice + shippingTypeCost : totalPrice,
    totalQty,
  };
};
