
import { EshopActions } from '../actions';
import { User } from '../../shared/models';
import { languages, currencyLang } from '../../shared/constants';


export interface State {
  loading: boolean;
  user: User;
  lang: string;
  currency: string;
}

export const initialState: State = {
  loading: false,
  user: null,
  lang: languages[0],
  currency: currencyLang['default']
};


export function appReducer(state = initialState, action): State {
  switch (action.type) {

    case EshopActions.GetUser: {
      return { ...state, loading: true };
    }

    case EshopActions.StoreUser: {
      return { ...state, user: action.payload, loading: false };
    }

    case EshopActions.GetUserFail: {
      return { ...state, user: action.payload, loading: false };
    }

    case EshopActions.SignIn: {
      return { ...state, loading: true};
    }

    case EshopActions.SignInSuccess: {
      return { ...state, user: action.payload, loading: false };
    }

    case EshopActions.ChangeLanguage: {
      return {...state, lang: action.payload.lang, currency: action.payload.currency };
    }

    default: {
      return state;
    }
  }
}

export const user = (state: State) => state.user;
export const lang = (state: State) => state.lang;
export const currency = (state: State) => state.currency;
export const loading = (state: State) => state.loading;
