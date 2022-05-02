import { switchMap, map, catchError } from 'rxjs/operators';
import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';

import {Observable, of} from 'rxjs';

import { ApiService } from '../services/api.service';

import {Action} from '@ngrx/store';
import * as actions from '../store/actions';
import {EshopActions} from '../store/actions';

@Injectable()
export class AppEffects {

  // AUTH

   signIn$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.SignIn),
      switchMap((action: actions.SignIn) => this.apiService.signIn(action.payload)),
      map(res => new actions.SignInSuccess(res))
  ));

   signUp$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.SignUp),
      switchMap((action: actions.SignUp) => this.apiService.signUp(action.payload)),
      map(res => new actions.SignUpSuccess(res))
  ));

   fetchUser$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetUser),
      switchMap((action: actions.GetUser) => this.apiService.getUser()),
      map(res => new actions.StoreUser(res)),
      catchError(() => of(new actions.GetUserFail()))
  ));

   getPages$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetPages),
      switchMap((action: actions.GetPages) => this.apiService.getPages(action.payload)),
      map(res => new actions.GetPagesSuccess(res)),
      catchError(() => of(new actions.GetPagesFail()))
  ));

   getPage$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetPage),
      switchMap((action: actions.GetPage) => this.apiService.getPage(action.payload)),
      map(res => new actions.GetPageSuccess(res)),
      catchError(() => of(new actions.GetPageFail()))
  ));

   addOrEditPage$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.AddOrEditPage),
      switchMap((action: actions.AddOrEditPage) => this.apiService.addOrEditPage(action.payload)),
      map(res => new actions.AddOrEditPageSuccess(res)),
      catchError(() => of(new actions.AddOrEditPageFail()))
  ));

   removePage$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.RemovePage),
      switchMap((action: actions.RemovePage) => this.apiService.removePage(action.payload)),
      map(res => new actions.RemovePageSuccess(res)),
      catchError(() => of(new actions.RemovePageFail()))
  ));

   getThemes$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetThemes),
      switchMap((action: actions.GetThemes) => this.apiService.getThemes()),
      map(res => new actions.GetThemesSuccess(res)),
      catchError(() => of(new actions.GetThemesFail()))
  ));

   addOrEditTheme$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.AddOrEditTheme),
      switchMap((action: actions.AddOrEditTheme) => this.apiService.addOrEditTheme(action.payload)),
      map(res => new actions.AddOrEditThemeSuccess(res)),
      catchError(() => of(new actions.AddOrEditThemeFail()))
  ));

   removeTheme$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.RemoveTheme),
      switchMap((action: actions.RemoveTheme) => this.apiService.removeTheme(action.payload)),
      map(res => new actions.RemoveThemeSuccess(res)),
      catchError(() => of(new actions.RemoveThemeFail()))
  ));

   getConfigs$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetConfigs),
      switchMap((action: actions.GetConfigs) => this.apiService.getConfigs()),
      map(res => new actions.GetConfigsSuccess(res)),
      catchError(() => of(new actions.GetConfigsFail()))
  ));

   addOrEditConfig$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.AddOrEditConfig),
      switchMap((action: actions.AddOrEditConfig) => this.apiService.addOrEditConfig(action.payload)),
      map(res => new actions.AddOrEditConfigSuccess(res)),
      catchError(() => of(new actions.AddOrEditConfigFail()))
  ));

   removeConfig$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.RemoveConfig),
      switchMap((action: actions.RemoveConfig) => this.apiService.removeConfig(action.payload)),
      map(res => new actions.RemoveConfigSuccess(res)),
      catchError(() => of(new actions.RemoveConfigFail()))
  ));

  // PRODUCT

   getProducts$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetProducts),
      switchMap((action: actions.GetProducts) => this.apiService.getProducts(action.payload)),
      map(res => new actions.GetProductsSuccess(res))
  ));

   getCategories$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetCategories),
      switchMap((action: actions.GetCategories) => this.apiService.getCategories(action.payload)),
      map(res => new actions.GetCategoriesSuccess(res))
  ));

   getProductsSearch$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetProductsSearch),
      switchMap((action: actions.GetProductsSearch) => this.apiService.getProductsSearch(action.payload)),
      map(res => new actions.GetProductsSearchSuccess(res))
  ));

   getProduct$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetProduct),
      switchMap((action: actions.GetProduct) => this.apiService.getProduct(action.payload)),
      map(res => new actions.GetProductSuccess(res))
  ));

   MakeOrderWithPayment$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.MakeOrderWithPayment),
      switchMap((action: actions.MakeOrderWithPayment) => this.apiService.handleToken(action.payload)),
      map(res => new actions.MakeOrderWithPaymentSuccess(res))
  ));

   makeOrder$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.MakeOrder),
      switchMap((action: actions.MakeOrder) => this.apiService.makeOrder(action.payload)),
      map(res => new actions.MakeOrderSuccess(res)),
      catchError(() => of(new actions.MakeOrderFail()))
  ));

   getCart$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetCart),
      switchMap((action: actions.GetCart) => this.apiService.getCart(action.payload)),
      map(res => new actions.GetCartSuccess(res))
  ));

   addToCart$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.AddToCart),
      switchMap((action: actions.AddToCart) => this.apiService.addToCart(action.payload)),
      map(res => new actions.AddToCartSuccess(res))
  ));

   removeFromCart$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.RemoveFromCart),
      switchMap((action: actions.RemoveFromCart) => this.apiService.removeFromCart(action.payload)),
      map(res => new actions.GetCartSuccess(res))
  ));

   stripeSession$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.StripeSession),
      switchMap((action: actions.StripeSession) => this.apiService.getStripeSession(action.payload)),
      map(res => new actions.StripeSessionSuccess(res))
  ));

   GetUserOrders$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetUserOrders),
      switchMap((action: actions.GetUserOrders) => this.apiService.getUserOrders()),
      map(res => new actions.GetUserOrdersSuccess(res))
  ));


  // DASHBOARD

   addProduct$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.AddProduct),
      switchMap((action: actions.AddProduct) => this.apiService.addProduct(action.payload)),
      map(res => new actions.AddProductSuccess(res))
  ));

   editProduct$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.EditProduct),
      switchMap((action: actions.EditProduct) => this.apiService.editProduct(action.payload)),
      map(res => new actions.EditProductSuccess(res))
  ));

   removeProduct$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.RemoveProduct),
      switchMap((action: actions.RemoveProduct) => this.apiService.removeProduct(action.payload)),
      map(res => new actions.RemoveProductSuccess(res))
  ));

   getAllProducts$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetAllProducts),
      switchMap((action: actions.GetAllProducts) => this.apiService.getAllProducts()),
      map(res => new actions.GetAllProductsSuccess(res))
  ));

   getAllCategories$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetAllCategories),
      switchMap((action: actions.GetAllCategories) => this.apiService.getAllCategories()),
      map(res => new actions.GetAllCategoriesSuccess(res))
  ));

   editCategory$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.EditCategory),
      switchMap((action: actions.EditCategory) => this.apiService.editCategory(action.payload)),
      map(res => new actions.EditCategorySuccess(res))
  ));

   removeCategory$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.RemoveCategory),
      switchMap((action: actions.RemoveCategory) => this.apiService.removeCategory(action.payload)),
      map(res => new actions.RemoveCategorySuccess(res))
  ));

   getImages$: Observable<Action> = createEffect(() => this._actions.pipe(
   ofType(EshopActions.GetImages),
      switchMap((action: actions.GetImages) => this.apiService.getImages()),
      map(res => new actions.GetImagesSuccess(res))
  ));

   addProductImagesUrl$: Observable<Action> = createEffect(() => this._actions.pipe(
   ofType(EshopActions.AddProductImagesUrl),
      switchMap((action: actions.AddProductImagesUrl) => this.apiService.addProductImagesUrl(action.payload)),
      map((res : any) => {
        if (res && res.titleUrl) {
          return new actions.GetProductSuccess(res);
        }
        return new actions.AddProductImagesUrlSuccess(res);
      })
  ));

   removeImage$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.RemoveProductImage),
      switchMap((action: actions.RemoveProductImage) => this.apiService.removeImage(action.payload)),
      map((res: any) => {
        if (res && res.titleUrl) {
          return new actions.GetProductSuccess(res);
        }
        return new actions.RemoveProductImageSuccess(res);
      })
  ));

   getOrders$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetOrders),
      switchMap((action: actions.GetOrders) => this.apiService.getOrders()),
      map(res => new actions.GetOrdersSuccess(res))
  ));

   getOrder$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetOrder),
      switchMap((action: actions.GetOrder) => this.apiService.getOrder(action.payload)),
      map(res => new actions.GetOrderSuccess(res))
  ));

   updateOrder$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.UpdateOrder),
      switchMap((action: actions.UpdateOrder) => this.apiService.updateOrder(action.payload)),
      map(res => new actions.GetOrderSuccess(res))
  ));

   getAllTranslations$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.GetAllTranslations),
      switchMap((action: actions.GetAllTranslations) => this.apiService.getAllTranslations()),
      map(res => new actions.GetAllTranslationsSuccess(res))
  ));

   editTranslation$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.EditTranslation),
      switchMap((action: actions.EditTranslation) => this.apiService.editAllTranslation(action.payload)),
      map(res => new actions.EditTranslationSuccess(res))
  ));

  // OTHERS

   sendContact$: Observable<Action> = createEffect(() => this._actions.pipe(
    ofType(EshopActions.SendContact),
      switchMap((action: actions.SendContact) => this.apiService.sendContact(action.payload)),
      map(res => new actions.SendContactSuccess())
  ));


  constructor(private _actions: Actions, private apiService: ApiService) { }

}
