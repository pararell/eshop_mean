
import * as actions from '../../store/actions';


export interface State {
  orders: null;
  order: any;
  productImages: Array<string>;
  translations: Array<any>;
}

export const initialState: State = {
  orders: null,
  order: null,
  productImages: [],
  translations: []
};



export function dashboardReducer(state = initialState, action): State {
  switch (action.type) {

    case actions.LOAD_ORDERS_SUCCESS: {
      return { ...state, orders: action.payload } }

    case actions.LOAD_ORDER_SUCCESS: {
      return { ...state, order: action.payload }}

    case actions.GET_IMAGES_SUCCESS: {
      return { ...state, productImages: action.payload.all }
    }

    case actions.ADD_PRODUCT_IMAGE: {
        return { ...state, productImages: action.payload.all }
      }

    case actions.ADD_PRODUCT_IMAGES_URL_SUCCESS: {
      return { ...state, productImages: action.payload.all };
    }

    case actions.REMOVE_PRODUCT_IMAGE_SUCCESS: {
      return { ...state, productImages: action.payload.all };
    }

    case actions.GET_ALL_TRANSLATIONS_SUCCESS: {
      return { ...state, translations: action.payload } }


    case actions.EDIT_TRANSLATION_SUCCESS: {
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
