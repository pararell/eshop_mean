import { Action, ActionReducer, createSelector, MetaReducer } from '@ngrx/store';
import { localStorageSync } from './local-storage';
import * as fromAuth from './auth.reducer';
import * as fromProducts from './product.reducer';
import * as fromDashboard from './dashboard.reducer';
import * as fromEshop from './eshop.reducer';
;

export interface State {
  auth: fromAuth.State;
  products: fromProducts.State;
  dashboard: fromDashboard.State;
  eshop: fromEshop.State;
}

export const reducers = {
  auth: fromAuth.appReducer,
  products: fromProducts.productReducer,
  dashboard: fromDashboard.dashboardReducer,
  eshop: fromEshop.eshopReducer
}


export const Auth = (state: State) => state.auth;
export const Products = (state: State) => state.products;
export const Dashboard = (state: State) => state.dashboard;
export const Eshop = (state: State) => state.eshop;

export const getUser = createSelector(Auth, fromAuth.user);
export const getLang = createSelector(Auth, fromAuth.lang);
export const getCurrency = createSelector(Auth, fromAuth.currency);
export const getAuthLoading = createSelector(Auth, fromAuth.loading);

export const getProducts = createSelector(Products, fromProducts.products);
export const getLoadingProducts = createSelector(Products, fromProducts.loadingProducts);
export const getCategories = createSelector(Products, fromProducts.categories);
export const getPagination = createSelector(Products, fromProducts.pagination);
export const getProduct = createSelector(Products, fromProducts.product);
export const getProductLoading = createSelector(Products, fromProducts.productLoading);
export const getCart = createSelector(Products, fromProducts.cart);
export const getOrder = createSelector(Products, fromProducts.order);
export const getUserOrders = createSelector(Products, fromProducts.userOrders);
export const getProductTitles = createSelector(Products, fromProducts.productsTitles);
export const getPriceFilter = createSelector(Products, fromProducts.priceFilter);
export const getMaxPrice = createSelector(Products, fromProducts.maxPrice);
export const getMinPrice = createSelector(Products, fromProducts.minPrice);
export const getPosition = createSelector(Products, fromProducts.position);

export const getOrderId = createSelector(Dashboard, fromDashboard.order);
export const getOrders = createSelector(Dashboard, fromDashboard.orders);
export const getProductImages = createSelector(Dashboard, fromDashboard.productImages);
export const getAllTranslations = createSelector(Dashboard, fromDashboard.translations);
export const getAllProducts = createSelector(Dashboard, fromDashboard.allProducts);
export const getAllCategories = createSelector(Dashboard, fromDashboard.allCategories);
export const getDashboardLoading = createSelector(Dashboard, fromDashboard.loading);

export const getPages = createSelector(Eshop, fromEshop.pages);
export const getPage = createSelector(Eshop, fromEshop.page);
export const getThemes = createSelector(Eshop, fromEshop.themes);
export const getConfigs = createSelector(Eshop, fromEshop.configs);
export const getEshopLoading = createSelector(Eshop, fromEshop.loading);
export const getEshopError = createSelector(Eshop, fromEshop.error);

export function localStorageSyncReducer(reducer: ActionReducer<State>): ActionReducer<State> {
  return localStorageSync({
    keys: [{ products: ['order'] }],
    rehydrate: true,
    removeOnUndefined: true,
    checkStorageAvailability: true
  })(reducer);
}

export const metaReducers: Array<MetaReducer<State, Action>> = [localStorageSyncReducer];
