import type { LanguageCode, LocalizedCart, LocalizedCartItem, LocalizedProduct, ProductRaw, SessionCart, ShopConfig } from '@eshop/shared';
import { shippingCost, shippingTypes } from '../constans';

/** Flattens a product's language sub-document. Throws if the language is missing (current behavior). */
export const prepareProduct = (product: ProductRaw, lang: string, light?: boolean): LocalizedProduct => ({
  _id: product._id,
  titleUrl: product.titleUrl,
  mainImage: product.mainImage,
  images: product.images,
  tags: product.tags,
  _user: product._user,
  dateAdded: product.dateAdded,
  ...{
    ...product[lang as LanguageCode]!,
    descriptionFull: !light ? product[lang as LanguageCode]!.descriptionFull : [],
  },
});

export const prepareCart = (cart: SessionCart, lang: string, config: ShopConfig | null | undefined): LocalizedCart => {
  const cartLangItems: LocalizedCartItem[] = cart.items.length
    ? cart.items
        .map((cartItem) => {
          const prepareItem = prepareProduct(cartItem.item, lang, true);
          const price: number = prepareItem.salePrice;
          const shipingCostType: string = prepareItem.shipping;

          return {
            item: prepareItem,
            id: cartItem.id,
            qty: cartItem.qty,
            price,
            shipingCostType,
          };
        })
        .filter((cartItem) => cartItem.item.visibility && cartItem.item.salePrice)
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
  const langConfig = config && config[lang as LanguageCode];
  const shippingByLang =
    langConfig && langConfig.shippingCost && langConfig.shippingCost[shippingType]
      ? langConfig.shippingCost[shippingType]
      : shippingCost[(lang || 'en') as LanguageCode][shippingType];
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
