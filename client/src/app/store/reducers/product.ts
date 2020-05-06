
import * as actions from '../../store/actions';
import { Product, Cart } from 'src/app/shared/models';


export interface State {
  products: Product[];
  loadingProducts: boolean;
  categories: Array<string>;
  pagination: {
    page: number;
    pages: number;
    limit: number;
    total: number;
  };
  product: Product;
  loadingProduct: boolean;
  cart: Cart;
  userOrders: any;
  order: any;
  productsTitles: Array<string>;
  priceFilter: number;
  position: any;
  loading: boolean;
  error: string;
}

export const initialState: State = {
  products: null,
  loadingProducts: false,
  categories: [],
  pagination: {
    page: 1,
    pages: 1,
    limit: 10,
    total: 0
  },
  product: null,
  loadingProduct: false,
  cart: null,
  userOrders: null,
  order: null,
  productsTitles: [],
  priceFilter: Infinity,
  position: null,
  loading: false,
  error: ''
};



export function productReducer(state = initialState, action): State {
  switch (action.type) {

    case actions.LOAD_PRODUCTS: {
      return { ...state, loadingProducts: true };
    }

    case actions.LOAD_PRODUCTS_SUCCESS: {
      return {
        ...state,
        products: action.payload.products,
        pagination: action.payload.pagination,
        loadingProducts: false
      }
    }

    case actions.LOAD_CATEGORIES_SUCCESS: {
      return {
        ...state,
        categories: action.payload
      }
    }

    case actions.GET_PRODUCT: {
      return {
        ...state,
        loadingProduct: true
      }
    }

    case actions.GET_PRODUCT_SUCCESS: {
      return {
        ...state,
        product: action.payload,
        loadingProduct: false
      }
    }

    case actions.LOAD_PRODUCTS_SEARCH_SUCCESS: {
      return { ...state, productsTitles: action.payload }
    }

    case actions.GET_CART_SUCCESS:
    case actions.ADD_TO_CART_SUCCESS: {
      return {
        ...state,
        cart: action.payload
      }
    }

    case actions.LOAD_PAYMENT:
      return { ...state, loading: true }

    case actions.LOAD_PAYMENT_SUCCESS:
      return {
        ...state,
        order: action.payload.result,
        cart: action.payload.cart,
        error: action.payload.error,
        loading: false
      }

    case actions.LOAD_PAYMENT_FAIL:
      return {
        ...state,
        order: null,
        error: 'ORDER_SUBMIT_ERROR',
        loading: false
      }

    case actions.MAKE_ORDER:
      return { ...state, loading: true }

    case actions.MAKE_ORDER_SUCCESS:
      return {
        ...state,
        order: action.payload.result,
        cart: action.payload.cart,
        error: action.payload.error,
        loading: false
      }

    case actions.MAKE_ORDER_FAIL:
      return {
        ...state,
        order: null,
        error: 'ORDER_SUBMIT_ERROR',
        loading: false
      }

    case actions.FILTER_PRICE:
      return { ...state, priceFilter: action.payload };

    case actions.LOAD_USER_ORDERS_SUCCESS: {
      return { ...state, userOrders: action.payload }
    }

    case actions.UPDATE_POSITION: {
      return { ...state, position: action.payload }
    }

    case actions.CLEAN_ERROR: {
      return { ...state, error: '' }
    }


    default: {
      return state;
    }
  }
}

export const products = (state: State) => state.products;
export const loadingProducts = (state: State) => state.loadingProducts;
export const categories = (state: State) => state.categories;
export const pagination = (state: State) => state.pagination;
export const product = (state: State) => state.product;
export const cart = (state: State) => state.cart;
export const productLoading = (state: State) => state.loadingProduct;
export const userOrders = (state: State) => state.userOrders;
export const order = (state: State) => state.order;
export const productsTitles = (state: State) => state.productsTitles;
export const priceFilter = (state: State) => state.priceFilter;

export const position = (state: State) => state.position;
