
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
      return { ...state, user: action.payload };
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
