
import { EshopActions } from '../../store/actions';
import { Product, Translations, Order } from '../../shared/models';


export interface State {
  orders: Order[];
  order: Order;
  productImages: Array<string>;
  translations: Array<Translations>;
  allProducts: Array<Product>;
}

export const initialState: State = {
  orders: null,
  order: null,
  productImages: [],
  translations: [],
  allProducts: []
};



export function dashboardReducer(state = initialState, action): State {
  switch (action.type) {

    case EshopActions.GetOrdersSuccess: {
      return { ...state, orders: action.payload }
    }

    case EshopActions.GetOrderSuccess: {
      return { ...state, order: action.payload }
    }

    case EshopActions.GetImagesSuccess: {
      return { ...state, productImages: action.payload.all }
    }

    case EshopActions.AddProductImage: {
      return { ...state, productImages: action.payload.all }
    }

    case EshopActions.AddProductImagesUrlSuccess: {
      return { ...state, productImages: action.payload.all };
    }

    case EshopActions.RemoveProductImageSuccess: {
      return { ...state, productImages: action.payload.all };
    }

    case EshopActions.GetAllTranslationsSuccess: {
      return { ...state, translations: action.payload }
    }

    case EshopActions.GetAllProductsSuccess: {
      return { ...state, allProducts: action.payload }
    }

    case EshopActions.EditTranslationSuccess: {
      return { ...state, translations: state.translations
          .map(trans => trans._id === action.payload._id ? action.payload : trans)}
    }

    default: {
      return state;
    }
  }
}

export const orders = (state: State) => state.orders;
export const order = (state: State) => state.order;
export const productImages = (state: State) => state.productImages;
export const translations = (state: State) => state.translations;
export const allProducts = (state: State) => state.allProducts;
