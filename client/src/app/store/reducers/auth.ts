
import * as actions from '../../store/actions';
import { User } from 'src/app/shared/models';


export interface State {
  user: User;
  lang: string;
  currency: string;
  convertVal: number;
}

 export const initialState: State = {
    user: null,
    lang: '',
    currency: 'EUR',
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
