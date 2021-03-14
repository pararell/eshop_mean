
import { EshopActions } from '../actions';
import { Page, Theme, Config } from '../../shared/models';


export interface State {
  loading: boolean;
  error: string;
  pages: Page[];
  page: Page;
  themes: Theme[];
  configs: Config[];
}

export const initialState: State = {
  loading: false,
  error: '',
  pages: null,
  page: null,
  themes: null,
  configs: null
};


export function eshopReducer(state = initialState, action): State {
  switch (action.type) {

    case EshopActions.GetPagesSuccess: {
      return { ...state, pages: action.payload };
    }

    case EshopActions.GetPageSuccess: {
      return { ...state, page: action.payload };
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
export const page = (state: State) => state.page;
export const themes = (state: State) => state.themes;
export const configs = (state: State) => state.configs;
