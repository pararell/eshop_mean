
import { EshopActions } from '../../store/actions';
import { Page } from '../../shared/models';


export interface State {
  loading: boolean;
  error: string;
  pages: Page[];
}

export const initialState: State = {
  loading: false,
  error: '',
  pages: null
};


export function eshopReducer(state = initialState, action): State {
  switch (action.type) {

    case EshopActions.GetPagesSuccess: {
      return { ...state, pages: action.payload };
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
