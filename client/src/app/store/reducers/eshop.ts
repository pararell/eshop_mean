
import { EshopActions } from '../../store/actions';
import { Page } from '../../shared/models';


export interface State {
  loading: boolean;
  error: string;
  pages: Page[];
  themes: any[];
  configs: any[];
}

export const initialState: State = {
  loading: false,
  error: '',
  pages: null,
  themes: null,
  configs: null
};


export function eshopReducer(state = initialState, action): State {
  switch (action.type) {

    case EshopActions.GetPagesSuccess: {
      return { ...state, pages: action.payload };
    }

    case EshopActions.GetThemesSuccess: {
      return { ...state, themes: action.payload };
    }

    case EshopActions.GetConfigsSuccess: {
      return { ...state, configs: action.payload };
    }

    case EshopActions.SendContact: {
      return { ...state, loading: true };
    }

    case EshopActions.SendContactSuccess: {
      return { ...state, loading: false, error: '' };
    }

    case EshopActions.SendContactFail: {
      return { ...state, loading: false, error: 'CONTACT_SEND_ERROR' };
    }

    default: {
      return state;
    }
  }
}

export const loading = (state: State) => state.loading;
export const error = (state: State) => state.error;
export const pages = (state: State) => state.pages;
export const themes = (state: State) => state.themes;
export const configs = (state: State) => state.configs;
