
import * as actions from './../actions';


export interface State {
  user: any;
  lang: string;
  currency: string;
  convertVal: number;
}

 export const initialState: State = {
    user: null,
    lang: '',
    currency: '€',
    convertVal: 0
};


export function appReducer(state = initialState, action): State {
  switch (action.type) {

    case actions.STORE_USER_ACTION: {
      return { ...state, user: action.payload };
    }

    case actions.SIGN_IN_SUCCESS: {
      localStorage.setItem('accessToken', action.payload.accessToken);
      return { ...state, user: action.payload };
    }

    case actions.ADD_PRODUCT_IMAGES_URL_SUCCESS: {
      return { ...state, user: action.payload.admin ? action.payload : state.user };
    }

    case actions.REMOVE_PRODUCT_IMAGE_SUCCESS: {
      return { ...state, user: action.payload.admin ? action.payload : state.user };
    }

    case actions.ADD_PRODUCT_IMAGE: {
      return {...state, user: { ...state.user, images: action.payload } };
    }

    case actions.CHANGE_LANG: {
      return {...state, lang: action.payload.lang, currency: action.payload.currency, convertVal: 0 };
    }

    case actions.CHANGE_LANG_SUCCESS: {
      return {...state, convertVal: action.payload.val };
    }


    default: {
      return state;
    }
  }
}

export const user = (state: State) => state.user;
export const lang = (state: State) => state.lang;
export const currency = (state: State) => state.currency;
export const convertVal = (state: State) => state.convertVal;
