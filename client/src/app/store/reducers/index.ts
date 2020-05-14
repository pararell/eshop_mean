import { createSelector } from '@ngrx/store';
import * as fromAuth from './auth';
import * as fromProducts from './product';
import * as fromDashboard from './dashboard';

export interface State {
  auth: fromAuth.State;
  products: fromProducts.State;
  dashboard: fromDashboard.State;
}

export const reducers = {
  auth: fromAuth.appReducer,
  products: fromProducts.productReducer,
  dashboard: fromDashboard.dashboardReducer
}


export const getAuth = (state: State) => state.auth;
export const Products = (state: State) => state.products;
export const Dashboard = (state: State) => state.dashboard;

export const getUser = createSelector(getAuth, fromAuth.user);
export const getLang = createSelector(getAuth, fromAuth.lang);
export const getCurrency = createSelector(getAuth, fromAuth.currency);
export const getConvertVal = createSelector(getAuth, fromAuth.convertVal);
export const getPages = createSelector(getAuth, fromAuth.pages);
export const getAuthLoading = createSelector(getAuth, fromAuth.loading);

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
export const getPosition = createSelector(Products, fromProducts.position);

export const getOrderId = createSelector(Dashboard, fromDashboard.order);
export const getOrders = createSelector(Dashboard, fromDashboard.orders);
export const getProductImages = createSelector(Dashboard, fromDashboard.productImages);
export const getAllTranslations = createSelector(Dashboard, fromDashboard.translations);
export const getAllProducts = createSelector(Dashboard, fromDashboard.allProducts);
